import Link from "next/link";
import FeedbackListView from "@/components/feedback-list-view";
import PageContainer from "@/components/page-container";
import { NewFeedbackButton } from "@/components/project-action-buttons";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FeedbackInboxPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FeedbackInboxPage({ searchParams }: FeedbackInboxPageProps) {
  const rawParams = await searchParams;
  const parsed = parseFeedbackQueryParams(rawParams, { defaultPageSize: 20 });
  const effective = parsed.ok ? parsed : parseFeedbackQueryParams({}, { defaultPageSize: 20 });

  if (!effective.ok) {
    throw new Error(effective.error);
  }

  // Board query omits status filter so all 6 columns populate cleanly
  const kanbanWhere = { ...effective.where };
  delete kanbanWhere.status;

  const [projects, items, total, kanbanItems] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.feedbackItem.findMany({
      where: effective.where,
      orderBy: effective.orderBy,
      skip: effective.skip,
      take: effective.take,
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
        labels: {
          include: { label: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    prisma.feedbackItem.count({ where: effective.where }),
    prisma.feedbackItem.findMany({
      where: kanbanWhere,
      orderBy: effective.orderBy,
      take: 200,
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
        labels: {
          include: { label: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / effective.pageSize));

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Feedback Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Triage bugs, feature requests, and questions across all projects in List, Grid, or Kanban.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
          >
            Dashboard
          </Link>
          <NewFeedbackButton label="New Ticket" />
        </div>
      </div>

      <FeedbackListView
        basePath="/feedback"
        items={items}
        kanbanItems={kanbanItems}
        total={total}
        page={effective.page}
        totalPages={totalPages}
        filters={effective.filters}
        projects={projects}
        filterError={parsed.ok ? undefined : parsed.error}
        emptyMessage="No tickets have been submitted across your projects yet."
      />
    </PageContainer>
  );
}
