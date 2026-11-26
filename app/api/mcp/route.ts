import { NextRequest, NextResponse } from "next/server";
import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { investigateTicket } from "@/lib/ai-investigate";
import { hashApiKey } from "@/lib/api-keys";
import { auth } from "@/lib/auth";
import { priorityOptions, statusOptions, typeOptions } from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";
import { allocateNextTicketKey } from "@/lib/ticket-keys";
import {
  linkDirectionLabels,
  linkDirectionOptions,
  resolveCanonicalLink,
  resolveDirectionForItem,
  type LinkDirection,
} from "@/lib/ticket-links";
import { canTransitionStatus, getTransitionErrorMessage } from "@/lib/workflow";

type McpAuthContext =
  | { kind: "admin"; email: string }
  | { kind: "api_key"; projectId: string; projectName: string; email: string };

const MCP_TOOLS = [
  {
    name: "list_projects",
    description: "List projects accessible to the authenticated token.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_tickets",
    description: "List bug/feedback tickets with optional filters.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        status: { type: "string", enum: [...statusOptions] },
        priority: { type: "string", enum: [...priorityOptions] },
        type: { type: "string", enum: [...typeOptions] },
        q: { type: "string", description: "Search title, description, or ticketKey" },
        limit: { type: "number", default: 25 },
      },
    },
  },
  {
    name: "get_ticket",
    description: "Retrieve a ticket by ID or ticketKey (e.g. WEB-12), including notes and linked tickets.",
    inputSchema: {
      type: "object",
      required: ["identifier"],
      properties: {
        identifier: { type: "string", description: "Ticket CUID or ticketKey (e.g. PRJ-1)" },
      },
    },
  },
  {
    name: "create_ticket",
    description: "Create a new ticket inside a project.",
    inputSchema: {
      type: "object",
      required: ["title", "type"],
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        type: { type: "string", enum: [...typeOptions] },
        priority: { type: "string", enum: [...priorityOptions] },
      },
    },
  },
  {
    name: "update_ticket",
    description: "Update ticket status (strict workflow enforced), priority, type, title, or description.",
    inputSchema: {
      type: "object",
      required: ["identifier"],
      properties: {
        identifier: { type: "string" },
        status: { type: "string", enum: [...statusOptions] },
        priority: { type: ["string", "null"], enum: [...priorityOptions, null] },
        type: { type: "string", enum: [...typeOptions] },
        title: { type: "string" },
        description: { type: "string" },
      },
    },
  },
  {
    name: "add_ticket_note",
    description: "Append a markdown internal note to a ticket.",
    inputSchema: {
      type: "object",
      required: ["identifier", "body"],
      properties: {
        identifier: { type: "string" },
        body: { type: "string" },
      },
    },
  },
  {
    name: "link_tickets",
    description: "Link two tickets with a relationship (blocks, is_blocked_by, relates_to, causes, is_caused_by, duplicates, parent_of, subtask_of).",
    inputSchema: {
      type: "object",
      required: ["sourceIdentifier", "targetIdentifier", "direction"],
      properties: {
        sourceIdentifier: { type: "string" },
        targetIdentifier: { type: "string" },
        direction: { type: "string", enum: [...linkDirectionOptions] },
      },
    },
  },
  {
    name: "investigate_ticket",
    description: "Generate structured root-cause hypotheses, verification checklist, and a coding-agent fix prompt for a ticket.",
    inputSchema: {
      type: "object",
      required: ["identifier"],
      properties: {
        identifier: { type: "string" },
      },
    },
  },
];

export async function GET() {
  return NextResponse.json({
    name: "bug-tracking-mcp",
    version: "1.0.0",
    protocol: "MCP Streamable HTTP (JSON-RPC 2.0)",
    auth: "Authorization: Bearer <project-api-key> (or authenticated Admin session cookie)",
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}

export async function POST(request: NextRequest) {
  const authCtx = await authenticateMcp(request);
  if (!authCtx) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: "Unauthorized. Provide Bearer project API key or Admin session." },
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const rpc = body as {
    jsonrpc?: string;
    id?: string | number | null;
    method?: string;
    params?: Record<string, unknown>;
  };
  const id = rpc.id ?? null;

  switch (rpc.method) {
    case "initialize":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "bug-tracking-mcp", version: "1.0.0" },
        },
      });

    case "notifications/initialized":
      return new NextResponse(null, { status: 204 });

    case "ping":
      return NextResponse.json({ jsonrpc: "2.0", id, result: {} });

    case "tools/list":
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      });

    case "tools/call": {
      const toolName = typeof rpc.params?.name === "string" ? rpc.params.name : "";
      const args = (rpc.params?.arguments || {}) as Record<string, unknown>;
      try {
        const output = await executeTool(toolName, args, authCtx);
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          },
        });
      } catch (error) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            isError: true,
            content: [
              {
                type: "text",
                text: error instanceof Error ? error.message : "Tool execution failed",
              },
            ],
          },
        });
      }
    }

    default:
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${rpc.method || ""}` },
        },
        { status: 400 },
      );
  }
}

async function authenticateMcp(request: NextRequest): Promise<McpAuthContext | null> {
  const authHeader = request.headers.get("authorization");
  const rawKey =
    authHeader && /^bearer\s+/i.test(authHeader)
      ? authHeader.replace(/^bearer\s+/i, "").trim()
      : request.headers.get("x-api-key")?.trim() || "";

  if (rawKey) {
    const keyHash = hashApiKey(rawKey);
    const keyRecord = await prisma.projectApiKey.findUnique({
      where: { keyHash },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!keyRecord || keyRecord.revokedAt !== null) {
      return null;
    }
    await prisma.projectApiKey
      .update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } })
      .catch(() => null);
    return {
      kind: "api_key",
      projectId: keyRecord.projectId,
      projectName: keyRecord.project.name,
      email: `mcp:${keyRecord.name}`,
    };
  }

  const session = await auth();
  if (session?.user?.email) {
    return { kind: "admin", email: session.user.email };
  }
  return null;
}

async function findTicketByIdentifier(identifier: string, scopedProjectId?: string) {
  const clean = identifier.trim();
  const ticket = await prisma.feedbackItem.findFirst({
    where: {
      ...(scopedProjectId ? { projectId: scopedProjectId } : {}),
      OR: [{ id: clean }, { ticketKey: { equals: clean, mode: "insensitive" } }],
    },
    include: {
      project: {
        select: { id: true, name: true, slug: true, keyPrefix: true, repoUrl: true, gitPlatform: true },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 15 },
      externalLinks: true,
      outgoingLinks: {
        include: { target: { select: { id: true, ticketKey: true, title: true, status: true } } },
      },
      incomingLinks: {
        include: { source: { select: { id: true, ticketKey: true, title: true, status: true } } },
      },
    },
  });
  return ticket;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: McpAuthContext,
): Promise<unknown> {
  const scopedProjectId = ctx.kind === "api_key" ? ctx.projectId : undefined;

  switch (name) {
    case "list_projects": {
      return prisma.project.findMany({
        where: scopedProjectId ? { id: scopedProjectId } : {},
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          keyPrefix: true,
          domain: true,
          gitPlatform: true,
          repoUrl: true,
          trackerPlatform: true,
        },
      });
    }

    case "list_tickets": {
      const projectId =
        scopedProjectId || (typeof args.projectId === "string" ? args.projectId.trim() : undefined);
      const status =
        typeof args.status === "string" && statusOptions.includes(args.status as FeedbackStatus)
          ? (args.status as FeedbackStatus)
          : undefined;
      const priority =
        typeof args.priority === "string" &&
        priorityOptions.includes(args.priority as FeedbackPriority)
          ? (args.priority as FeedbackPriority)
          : undefined;
      const type =
        typeof args.type === "string" && typeOptions.includes(args.type as FeedbackType)
          ? (args.type as FeedbackType)
          : undefined;
      const q = typeof args.q === "string" ? args.q.trim() : "";
      const limit =
        typeof args.limit === "number" && args.limit > 0 ? Math.min(100, Math.floor(args.limit)) : 25;

      return prisma.feedbackItem.findMany({
        where: {
          ...(projectId ? { projectId } : {}),
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(type ? { type } : {}),
          ...(q
            ? {
                OR: [
                  { ticketKey: { contains: q, mode: "insensitive" } },
                  { title: { contains: q, mode: "insensitive" } },
                  { description: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          ticketKey: true,
          title: true,
          type: true,
          priority: true,
          status: true,
          source: true,
          createdAt: true,
          project: { select: { id: true, name: true, slug: true } },
        },
      });
    }

    case "get_ticket": {
      const identifier = typeof args.identifier === "string" ? args.identifier : "";
      if (!identifier) throw new Error("identifier is required");
      const ticket = await findTicketByIdentifier(identifier, scopedProjectId);
      if (!ticket) throw new Error("Ticket not found");

      const links = [
        ...ticket.outgoingLinks.map((l) => ({
          id: l.id,
          relation: linkDirectionLabels[resolveDirectionForItem(l.relationType, true)],
          ticket: l.target,
        })),
        ...ticket.incomingLinks.map((l) => ({
          id: l.id,
          relation: linkDirectionLabels[resolveDirectionForItem(l.relationType, false)],
          ticket: l.source,
        })),
      ];
      return {
        id: ticket.id,
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        source: ticket.source,
        pageUrl: ticket.pageUrl,
        browserInfo: ticket.browserInfo,
        project: ticket.project,
        notes: ticket.notes,
        links,
        externalLinks: ticket.externalLinks,
      };
    }

    case "create_ticket": {
      const projectId =
        scopedProjectId || (typeof args.projectId === "string" ? args.projectId.trim() : "");
      if (!projectId) throw new Error("projectId is required");
      const title = typeof args.title === "string" ? args.title.trim() : "";
      const type = typeof args.type === "string" ? args.type : "";
      if (!title) throw new Error("title is required");
      if (!typeOptions.includes(type as FeedbackType)) throw new Error("Invalid type");

      const priority =
        typeof args.priority === "string" &&
        priorityOptions.includes(args.priority as FeedbackPriority)
          ? (args.priority as FeedbackPriority)
          : null;

      const keyAlloc = await allocateNextTicketKey(projectId);
      return prisma.feedbackItem.create({
        data: {
          projectId,
          ...(keyAlloc.ticketKey
            ? { sequenceNumber: keyAlloc.sequenceNumber, ticketKey: keyAlloc.ticketKey }
            : {}),
          title,
          description: typeof args.description === "string" ? args.description.trim() || null : null,
          type: type as FeedbackType,
          priority,
          status: "open",
          source: "api",
        },
        select: {
          id: true,
          ticketKey: true,
          title: true,
          type: true,
          priority: true,
          status: true,
        },
      });
    }

    case "update_ticket": {
      const identifier = typeof args.identifier === "string" ? args.identifier : "";
      if (!identifier) throw new Error("identifier is required");
      const existing = await findTicketByIdentifier(identifier, scopedProjectId);
      if (!existing) throw new Error("Ticket not found");

      const data: Record<string, unknown> = {};
      let nextStatus: FeedbackStatus | undefined;

      if (typeof args.status === "string") {
        if (!statusOptions.includes(args.status as FeedbackStatus)) {
          throw new Error("Invalid status");
        }
        nextStatus = args.status as FeedbackStatus;
        if (!canTransitionStatus(existing.status, nextStatus)) {
          throw new Error(getTransitionErrorMessage(existing.status, nextStatus));
        }
        data.status = nextStatus;
      }
      if (args.priority === null) {
        data.priority = null;
      } else if (typeof args.priority === "string") {
        if (!priorityOptions.includes(args.priority as FeedbackPriority)) {
          throw new Error("Invalid priority");
        }
        data.priority = args.priority;
      }
      if (typeof args.type === "string") {
        if (!typeOptions.includes(args.type as FeedbackType)) throw new Error("Invalid type");
        data.type = args.type;
      }
      if (typeof args.title === "string" && args.title.trim()) {
        data.title = args.title.trim();
      }
      if (typeof args.description === "string") {
        data.description = args.description.trim() || null;
      }

      const updated = await prisma.feedbackItem.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          ticketKey: true,
          title: true,
          type: true,
          priority: true,
          status: true,
        },
      });

      if (nextStatus && nextStatus !== existing.status) {
        await prisma.feedbackStatusEvent.create({
          data: {
            feedbackItemId: existing.id,
            fromStatus: existing.status,
            toStatus: nextStatus,
            actorEmail: ctx.email,
          },
        });
      }

      return updated;
    }

    case "add_ticket_note": {
      const identifier = typeof args.identifier === "string" ? args.identifier : "";
      const body = typeof args.body === "string" ? args.body.trim() : "";
      if (!identifier || !body) throw new Error("identifier and body are required");
      const existing = await findTicketByIdentifier(identifier, scopedProjectId);
      if (!existing) throw new Error("Ticket not found");

      return prisma.feedbackNote.create({
        data: {
          feedbackItemId: existing.id,
          authorEmail: ctx.email,
          body,
        },
      });
    }

    case "link_tickets": {
      const sourceIdentifier = typeof args.sourceIdentifier === "string" ? args.sourceIdentifier : "";
      const targetIdentifier = typeof args.targetIdentifier === "string" ? args.targetIdentifier : "";
      const direction = typeof args.direction === "string" ? args.direction : "";

      if (!linkDirectionOptions.includes(direction as LinkDirection)) {
        throw new Error("Invalid link direction");
      }
      const [src, tgt] = await Promise.all([
        findTicketByIdentifier(sourceIdentifier, scopedProjectId),
        findTicketByIdentifier(targetIdentifier, scopedProjectId),
      ]);
      if (!src || !tgt) throw new Error("Source or target ticket not found");
      if (src.id === tgt.id) throw new Error("Cannot link a ticket to itself");

      const canonical = resolveCanonicalLink(src.id, tgt.id, direction as LinkDirection);
      return prisma.feedbackLink.create({
        data: {
          ...canonical,
          createdByEmail: ctx.email,
        },
      });
    }

    case "investigate_ticket": {
      const identifier = typeof args.identifier === "string" ? args.identifier : "";
      const ticket = await findTicketByIdentifier(identifier, scopedProjectId);
      if (!ticket) throw new Error("Ticket not found");

      return investigateTicket({
        ticketKey: ticket.ticketKey,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        status: ticket.status,
        priority: ticket.priority,
        source: ticket.source,
        pageUrl: ticket.pageUrl,
        browserInfo: ticket.browserInfo,
        screenshotDataUrl: ticket.screenshotDataUrl,
        projectName: ticket.project.name,
        projectSlug: ticket.project.slug,
        repoUrl: ticket.project.repoUrl,
        gitPlatform: ticket.project.gitPlatform,
        recentNotes: ticket.notes.map((n) => ({ authorEmail: n.authorEmail, body: n.body })),
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
