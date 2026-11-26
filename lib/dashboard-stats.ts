import type { FeedbackPriority, FeedbackSource, FeedbackStatus, FeedbackType } from "@prisma/client";
import {
  priorityDisplayOrder,
  sourceLabels,
  sourceOptions,
  statusLabels,
  statusOptions,
  typeLabels,
  typeOptions,
} from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";

export type DashboardData = {
  kpis: {
    total: number;
    openQueue: number;
    activeWork: number;
    blocked: number;
    urgentAndHighOpen: number;
    resolvedLast30d: number;
    avgResolutionHours: number | null;
  };
  statusCounts: Array<{ status: FeedbackStatus; label: string; count: number }>;
  priorityCounts: Array<{ priority: FeedbackPriority | "none"; label: string; count: number }>;
  typeCounts: Array<{ type: FeedbackType; label: string; count: number }>;
  sourceCounts: Array<{ source: FeedbackSource; label: string; count: number }>;
  trend30d: Array<{ date: string; label: string; created: number; resolved: number }>;
  projectHealth: Array<{
    id: string;
    name: string;
    slug: string;
    keyPrefix: string;
    open: number;
    inProgress: number;
    blocked: number;
    urgent: number;
    total: number;
  }>;
  needsTriage: Array<{
    id: string;
    ticketKey: string | null;
    title: string;
    type: FeedbackType;
    priority: FeedbackPriority | null;
    status: FeedbackStatus;
    createdAt: string;
    project: { id: string; name: string; slug: string };
  }>;
  blockedTickets: Array<{
    id: string;
    ticketKey: string | null;
    title: string;
    type: FeedbackType;
    priority: FeedbackPriority | null;
    status: FeedbackStatus;
    createdAt: string;
    project: { id: string; name: string; slug: string };
  }>;
};

export async function getDashboardData(projectId?: string): Promise<DashboardData> {
  const whereScope = projectId ? { projectId } : {};
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [items, recentResolveEvents, projects] = await Promise.all([
    prisma.feedbackItem.findMany({
      where: whereScope,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectId: true,
        ticketKey: true,
        title: true,
        type: true,
        status: true,
        priority: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.feedbackStatusEvent.findMany({
      where: {
        toStatus: "resolved",
        createdAt: { gte: thirtyDaysAgo },
        ...(projectId ? { feedbackItem: { projectId } } : {}),
      },
      select: {
        feedbackItemId: true,
        createdAt: true,
        feedbackItem: { select: { createdAt: true } },
      },
    }),
    projectId
      ? Promise.resolve([])
      : prisma.project.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, slug: true, keyPrefix: true },
        }),
  ]);

  const statusMap = new Map<FeedbackStatus, number>();
  const priorityMap = new Map<FeedbackPriority | "none", number>();
  const typeMap = new Map<FeedbackType, number>();
  const sourceMap = new Map<FeedbackSource, number>();

  for (const s of statusOptions) statusMap.set(s, 0);
  for (const p of priorityDisplayOrder) priorityMap.set(p, 0);
  priorityMap.set("none", 0);
  for (const t of typeOptions) typeMap.set(t, 0);
  for (const src of sourceOptions) sourceMap.set(src, 0);

  let openQueue = 0;
  let activeWork = 0;
  let blocked = 0;
  let urgentAndHighOpen = 0;

  const projectStatsMap = new Map<
    string,
    { open: number; inProgress: number; blocked: number; urgent: number; total: number }
  >();
  for (const p of projects) {
    projectStatsMap.set(p.id, { open: 0, inProgress: 0, blocked: 0, urgent: 0, total: 0 });
  }

  for (const item of items) {
    statusMap.set(item.status, (statusMap.get(item.status) || 0) + 1);
    priorityMap.set(item.priority ?? "none", (priorityMap.get(item.priority ?? "none") || 0) + 1);
    typeMap.set(item.type, (typeMap.get(item.type) || 0) + 1);
    sourceMap.set(item.source, (sourceMap.get(item.source) || 0) + 1);

    const isUnresolved = item.status !== "resolved" && item.status !== "closed";
    if (item.status === "open") openQueue += 1;
    if (item.status === "todo" || item.status === "in_progress") activeWork += 1;
    if (item.status === "blocked") blocked += 1;
    if (isUnresolved && (item.priority === "urgent" || item.priority === "high")) {
      urgentAndHighOpen += 1;
    }

    const pStat = projectStatsMap.get(item.projectId);
    if (pStat) {
      pStat.total += 1;
      if (item.status === "open" || item.status === "todo") pStat.open += 1;
      if (item.status === "in_progress") pStat.inProgress += 1;
      if (item.status === "blocked") pStat.blocked += 1;
      if (isUnresolved && item.priority === "urgent") pStat.urgent += 1;
    }
  }

  // Build 14-day / 30-day daily inflow vs resolved trend (14 days compact or 30 days)
  const days = 14;
  const trendMap = new Map<string, { date: string; label: string; created: number; resolved: number }>();
  const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { date: key, label: dayFmt.format(d), created: 0, resolved: 0 });
  }

  for (const item of items) {
    const key = item.createdAt.toISOString().slice(0, 10);
    const bucket = trendMap.get(key);
    if (bucket) bucket.created += 1;
  }

  const seenResolvedTickets = new Set<string>();
  let totalResolveMs = 0;
  let resolvedCountForAvg = 0;
  for (const ev of recentResolveEvents) {
    const key = ev.createdAt.toISOString().slice(0, 10);
    const bucket = trendMap.get(key);
    if (bucket) bucket.resolved += 1;

    if (!seenResolvedTickets.has(ev.feedbackItemId)) {
      seenResolvedTickets.add(ev.feedbackItemId);
      const diff = ev.createdAt.getTime() - ev.feedbackItem.createdAt.getTime();
      if (diff >= 0) {
        totalResolveMs += diff;
        resolvedCountForAvg += 1;
      }
    }
  }

  const avgResolutionHours =
    resolvedCountForAvg > 0
      ? Math.round((totalResolveMs / resolvedCountForAvg / (1000 * 60 * 60)) * 10) / 10
      : null;

  const needsTriage = items
    .filter((i) => i.status === "open" && (!i.priority || i.priority === "urgent"))
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      ticketKey: i.ticketKey,
      title: i.title,
      type: i.type,
      priority: i.priority,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      project: i.project,
    }));

  const blockedTickets = items
    .filter((i) => i.status === "blocked")
    .slice(0, 6)
    .map((i) => ({
      id: i.id,
      ticketKey: i.ticketKey,
      title: i.title,
      type: i.type,
      priority: i.priority,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
      project: i.project,
    }));

  const projectHealth = projects
    .map((p) => {
      const s = projectStatsMap.get(p.id) || {
        open: 0,
        inProgress: 0,
        blocked: 0,
        urgent: 0,
        total: 0,
      };
      return { ...p, ...s };
    })
    .sort((a, b) => b.urgent * 10 + b.blocked * 5 + b.open - (a.urgent * 10 + a.blocked * 5 + a.open));

  return {
    kpis: {
      total: items.length,
      openQueue,
      activeWork,
      blocked,
      urgentAndHighOpen,
      resolvedLast30d: seenResolvedTickets.size,
      avgResolutionHours,
    },
    statusCounts: statusOptions.map((status) => ({
      status,
      label: statusLabels[status],
      count: statusMap.get(status) || 0,
    })),
    priorityCounts: [
      ...priorityDisplayOrder.map((priority) => ({
        priority,
        label: priority.charAt(0).toUpperCase() + priority.slice(1),
        count: priorityMap.get(priority) || 0,
      })),
      { priority: "none" as const, label: "Unset", count: priorityMap.get("none") || 0 },
    ],
    typeCounts: typeOptions.map((type) => ({
      type,
      label: typeLabels[type],
      count: typeMap.get(type) || 0,
    })),
    sourceCounts: sourceOptions.map((source) => ({
      source,
      label: sourceLabels[source],
      count: sourceMap.get(source) || 0,
    })),
    trend30d: Array.from(trendMap.values()),
    projectHealth,
    needsTriage,
    blockedTickets,
  };
}
