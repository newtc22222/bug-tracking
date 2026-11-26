import Link from "next/link";
import FeedbackListView from "@/components/feedback-list-view";
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

  const [projects, items, total] = await Promise.all([
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
      },
    }),
    prisma.feedbackItem.count({ where: effective.where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / effective.pageSize));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Feedback Inbox</h1>
          <p className="mt-1 text-sm text-slate-500">
            Triage bugs, feature requests, and questions across all projects.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
        >
          Manage Projects
        </Link>
      </div>

      <FeedbackListView
        basePath="/feedback"
        items={items}
        total={total}
        page={effective.page}
        totalPages={totalPages}
        filters={effective.filters}
        projects={projects}
        filterError={parsed.ok ? undefined : parsed.error}
        emptyMessage="No feedback has been submitted across your projects yet."
      />
    </main>
  );
}
