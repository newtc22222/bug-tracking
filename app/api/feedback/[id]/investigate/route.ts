import { NextRequest, NextResponse } from "next/server";
import { investigateTicket } from "@/lib/ai-investigate";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { linkDirectionLabels, resolveDirectionForItem } from "@/lib/ticket-links";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const item = await prisma.feedbackItem.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          name: true,
          slug: true,
          repoUrl: true,
          gitPlatform: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { authorEmail: true, body: true },
      },
      outgoingLinks: {
        include: {
          target: { select: { ticketKey: true, title: true, status: true } },
        },
      },
      incomingLinks: {
        include: {
          source: { select: { ticketKey: true, title: true, status: true } },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  const linkedTickets = [
    ...item.outgoingLinks.map((l) => ({
      relation: linkDirectionLabels[resolveDirectionForItem(l.relationType, true)],
      ticketKey: l.target.ticketKey,
      title: l.target.title,
      status: l.target.status,
    })),
    ...item.incomingLinks.map((l) => ({
      relation: linkDirectionLabels[resolveDirectionForItem(l.relationType, false)],
      ticketKey: l.source.ticketKey,
      title: l.source.title,
      status: l.source.status,
    })),
  ];

  const investigation = await investigateTicket({
    ticketKey: item.ticketKey,
    title: item.title,
    description: item.description,
    type: item.type,
    status: item.status,
    priority: item.priority,
    source: item.source,
    pageUrl: item.pageUrl,
    browserInfo: item.browserInfo,
    screenshotDataUrl: item.screenshotDataUrl,
    projectName: item.project.name,
    projectSlug: item.project.slug,
    repoUrl: item.project.repoUrl,
    gitPlatform: item.project.gitPlatform,
    linkedTickets,
    recentNotes: item.notes,
  });

  return NextResponse.json({ investigation });
}
