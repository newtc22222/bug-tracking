import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackListView from "@/components/feedback-list-view";
import { PlusIcon } from "@/components/ui-icons";
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
    select: { id: true, name: true, slug: true },
  });

  if (!project) {
    notFound();
  }

  const [feedbackItems, total] = await Promise.all([
    prisma.feedbackItem.findMany({
      where: effective.where,
      orderBy: effective.orderBy,
      skip: effective.skip,
      take: effective.take,
    }),
    prisma.feedbackItem.count({ where: effective.where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / effective.pageSize));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="transition hover:text-slate-950">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/projects/${projectId}`} className="transition hover:text-slate-950">
          {project.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">Feedback</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              {project.name} Feedback
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              /{project.slug}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Filter, triage, and export feedback scoped to this project.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
          >
            Project Settings
          </Link>
          <Link
            href={`/projects/${projectId}/feedback/new`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>New Feedback</span>
          </Link>
        </div>
      </div>

      <FeedbackListView
        basePath={`/projects/${projectId}/feedback`}
        items={feedbackItems}
        total={total}
        page={effective.page}
        totalPages={totalPages}
        filters={effective.filters}
        filterError={parsed.ok ? undefined : parsed.error}
        emptyMessage="Add the first feedback item for this project."
      />
    </main>
  );
}
