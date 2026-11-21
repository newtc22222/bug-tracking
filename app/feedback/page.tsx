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
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Bug Tracking</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Feedback Inbox
          </h1>
        </div>
        <Link
          href="/projects"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          Projects
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
