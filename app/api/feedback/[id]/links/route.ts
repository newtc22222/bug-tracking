import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession, requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  linkDirectionLabels,
  linkDirectionOptions,
  resolveCanonicalLink,
  resolveDirectionForItem,
  type LinkDirection,
  type ResolvedTicketLink,
} from "@/lib/ticket-links";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ticketSelect = {
  id: true,
  ticketKey: true,
  title: true,
  status: true,
  type: true,
  priority: true,
  project: { select: { id: true, name: true, slug: true } },
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const [outgoing, incoming] = await Promise.all([
    prisma.feedbackLink.findMany({
      where: { sourceId: id },
      orderBy: { createdAt: "desc" },
      include: { target: { select: ticketSelect } },
    }),
    prisma.feedbackLink.findMany({
      where: { targetId: id },
      orderBy: { createdAt: "desc" },
      include: { source: { select: ticketSelect } },
    }),
  ]);

  const links: ResolvedTicketLink[] = [
    ...outgoing.map((link) => {
      const direction = resolveDirectionForItem(link.relationType, true);
      return {
        id: link.id,
        direction,
        label: linkDirectionLabels[direction],
        relationType: link.relationType,
        createdByEmail: link.createdByEmail,
        createdAt: link.createdAt.toISOString(),
        related: link.target,
      };
    }),
    ...incoming.map((link) => {
      const direction = resolveDirectionForItem(link.relationType, false);
      return {
        id: link.id,
        direction,
        label: linkDirectionLabels[direction],
        relationType: link.relationType,
        createdByEmail: link.createdByEmail,
        createdAt: link.createdAt.toISOString(),
        related: link.source,
      };
    }),
  ];

  return NextResponse.json({ links });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const targetId = typeof payload.targetId === "string" ? payload.targetId.trim() : "";
  const direction = typeof payload.direction === "string" ? payload.direction.trim() : "";

  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  if (targetId === id) {
    return NextResponse.json({ error: "A ticket cannot link to itself" }, { status: 400 });
  }

  if (!linkDirectionOptions.includes(direction as LinkDirection)) {
    return NextResponse.json({ error: "Invalid link relation type" }, { status: 400 });
  }

  const [current, other] = await Promise.all([
    prisma.feedbackItem.findUnique({ where: { id }, select: { id: true } }),
    prisma.feedbackItem.findUnique({ where: { id: targetId }, select: { id: true } }),
  ]);

  if (!current || !other) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const canonical = resolveCanonicalLink(id, targetId, direction as LinkDirection);

  try {
    const created = await prisma.feedbackLink.create({
      data: {
        sourceId: canonical.sourceId,
        targetId: canonical.targetId,
        relationType: canonical.relationType,
        createdByEmail: auth.email,
      },
      include: {
        source: { select: ticketSelect },
        target: { select: ticketSelect },
      },
    });

    const isOutgoing = created.sourceId === id;
    const resolvedDirection = resolveDirectionForItem(created.relationType, isOutgoing);

    return NextResponse.json(
      {
        id: created.id,
        direction: resolvedDirection,
        label: linkDirectionLabels[resolvedDirection],
        relationType: created.relationType,
        createdByEmail: created.createdByEmail,
        createdAt: created.createdAt.toISOString(),
        related: isOutgoing ? created.target : created.source,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "This ticket link already exists" }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const linkId = request.nextUrl.searchParams.get("linkId")?.trim();
  if (!linkId) {
    return NextResponse.json({ error: "linkId query parameter is required" }, { status: 400 });
  }

  const existing = await prisma.feedbackLink.findUnique({ where: { id: linkId } });
  if (!existing || (existing.sourceId !== id && existing.targetId !== id)) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  await prisma.feedbackLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
