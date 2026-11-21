import Link from "next/link";
import { notFound } from "next/navigation";
import FeedbackListView from "@/components/feedback-list-view";
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
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <Link
        href={`/projects/${projectId}`}
        className="text-sm text-slate-500 hover:text-slate-950"
      >
        ← Back to project
      </Link>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{project.name}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Feedback</h1>
        </div>
        <Link
          href={`/projects/${projectId}/feedback/new`}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          New Feedback
        </Link>
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
