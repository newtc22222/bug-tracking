import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type FeedbackPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; type?: string }>;
};

const statusOptions = Object.values(FeedbackStatus);
const typeOptions = Object.values(FeedbackType);

const statusLabels: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const typeLabels: Record<FeedbackType, string> = {
  bug: "Bug",
  improvement: "Improvement",
  feature: "Feature",
  question: "Question",
};

const priorityLabels: Record<FeedbackPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export default async function ProjectFeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { id: projectId } = await params;
  const filters = await searchParams;
  const selectedStatus = statusOptions.includes(filters.status as FeedbackStatus)
    ? (filters.status as FeedbackStatus)
    : undefined;
  const selectedType = typeOptions.includes(filters.type as FeedbackType)
    ? (filters.type as FeedbackType)
    : undefined;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true },
  });

  if (!project) {
    notFound();
  }

  const feedbackItems = await prisma.feedbackItem.findMany({
    where: {
      projectId,
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(selectedType ? { type: selectedType } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

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

      <form
        method="get"
        className="mt-8 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            defaultValue={selectedStatus || ""}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm font-medium text-slate-700">
          Type
          <select
            name="type"
            defaultValue={selectedType || ""}
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
          >
            <option value="">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          Filter
        </button>
        {(selectedStatus || selectedType) && (
          <Link
            href={`/projects/${projectId}/feedback`}
            className="px-1 py-2 text-sm text-slate-500 hover:text-slate-950"
          >
            Clear
          </Link>
        )}
      </form>

      {feedbackItems.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">No feedback found</h2>
          <p className="mt-2 text-sm text-slate-500">
            {selectedStatus || selectedType
              ? "Try changing the filters or create a new item."
              : "Add the first feedback item for this project."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {feedbackItems.map((item) => (
            <li key={item.id}>
              <Link
                href={`/feedback/${item.id}`}
                className="block px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-medium text-slate-950">{item.title}</h2>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                    )}
                  </div>
                  {item.priority && (
                    <span className="shrink-0 text-xs font-medium text-slate-500">
                      {priorityLabels[item.priority]}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    {typeLabels[item.type]}
                  </span>
                  <span className={statusBadgeClass(item.status)}>
                    {statusLabels[item.status]}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function statusBadgeClass(status: FeedbackStatus): string {
  const classes: Record<FeedbackStatus, string> = {
    open: "rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700",
    in_progress: "rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700",
    resolved: "rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700",
    closed: "rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600",
  };

  return classes[status];
}
