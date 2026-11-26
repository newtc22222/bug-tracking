import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackListView from "@/components/feedback-list-view";
import PageContainer from "@/components/page-container";
import { NewFeedbackButton } from "@/components/project-action-buttons";
import ProjectTabs from "@/components/project-tabs";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FeedbackPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectFeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { id: projectId } = await params;
  const rawParams = await searchParams;
  const parsed = parseFeedbackQueryParams(rawParams, {
    projectId,
    defaultPageSize: 20,
  });
  const effective = parsed.ok
    ? parsed
    : parseFeedbackQueryParams({}, { projectId, defaultPageSize: 20 });

  if (!effective.ok) {
    throw new Error(effective.error);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true, keyPrefix: true },
  });

  if (!project) {
    notFound();
  }

  const kanbanWhere = { ...effective.where };
  delete kanbanWhere.status;

  const [feedbackItems, total, kanbanItems] = await Promise.all([
    prisma.feedbackItem.findMany({
      where: effective.where,
      orderBy: effective.orderBy,
      skip: effective.skip,
      take: effective.take,
      include: {
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
        labels: {
          include: { label: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / effective.pageSize));

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="transition hover:text-slate-950">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/projects/${projectId}/dashboard`} className="transition hover:text-slate-950">
          {project.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">Tickets</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {project.name} Tickets
            </h1>
            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
              {project.keyPrefix}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              /{project.slug}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Triage, link, and track tickets across List, Grid, and strict-workflow Kanban views.
          </p>
        </div>

        <NewFeedbackButton projectId={projectId} label="New Ticket" />
      </div>

      <ProjectTabs projectId={projectId} />

      <FeedbackListView
        basePath={`/projects/${projectId}/feedback`}
        projectId={projectId}
        items={feedbackItems}
        kanbanItems={kanbanItems}
        total={total}
        page={effective.page}
        totalPages={totalPages}
        filters={effective.filters}
        filterError={parsed.ok ? undefined : parsed.error}
        emptyMessage="Add the first ticket for this project."
      />
    </PageContainer>
  );
}
