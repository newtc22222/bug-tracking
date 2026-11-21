import Link from "next/link";
import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import InlineTriageControls from "@/components/inline-triage-controls";
import {
  priorityLabels,
  priorityOptions,
  sourceBadgeClass,
  sourceLabels,
  sourceOptions,
  statusLabels,
  statusOptions,
  typeLabels,
  typeOptions,
} from "@/lib/feedback-display";
import {
  buildFeedbackQueryString,
  sortLabels,
  sortOptions,
  type FeedbackQueryFilters,
} from "@/lib/feedback-query";

export type FeedbackListItem = {
  id: string;
  title: string;
  description: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  source: FeedbackSource;
  reporterName: string | null;
  reporterEmail: string | null;
  createdAt: Date;
  project?: {
    id: string;
    name: string;
    slug: string;
  };
};

type FeedbackListViewProps = {
  basePath: string;
  items: FeedbackListItem[];
  total: number;
  page: number;
  totalPages: number;
  filters: FeedbackQueryFilters;
  projects?: { id: string; name: string; slug: string }[];
  filterError?: string;
  emptyMessage: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function FeedbackListView({
  basePath,
  items,
  total,
  page,
  totalPages,
  filters,
  projects,
  filterError,
  emptyMessage,
}: FeedbackListViewProps) {
  const showProjectFilter = Boolean(projects);
  const hasActiveFilters = Boolean(
    filters.q ||
      (showProjectFilter && filters.projectId) ||
      filters.status ||
      filters.type ||
      filters.priority ||
      filters.source ||
      filters.sort !== "newest",
  );

  const paginationFilters = {
    ...filters,
    projectId: showProjectFilter ? filters.projectId : undefined,
  };

  const exportQueryBase = buildFeedbackQueryString({
    ...filters,
    page: undefined,
  });
  const csvExportHref = `/api/feedback/export${exportQueryBase ? `${exportQueryBase}&format=csv` : "?format=csv"}`;
  const jsonExportHref = `/api/feedback/export${exportQueryBase ? `${exportQueryBase}&format=json` : "?format=json"}`;

  const formKey = JSON.stringify({
    ...paginationFilters,
    page,
  });

  return (
    <>
      <form
        key={formKey}
        method="get"
        action={basePath}
        className="mt-8 space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm font-medium text-slate-700">
            Search
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search title, description, or reporter…"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            />
          </label>

          {projects && (
            <label className="sm:w-48 text-sm font-medium text-slate-700">
              Project
              <select
                name="projectId"
                defaultValue={filters.projectId || ""}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="sm:w-48 text-sm font-medium text-slate-700">
            Sort
            <select
              name="sort"
              defaultValue={filters.sort}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {sortLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Status
            <select
              name="status"
              defaultValue={filters.status || ""}
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

          <label className="text-sm font-medium text-slate-700">
            Type
            <select
              name="type"
              defaultValue={filters.type || ""}
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

          <label className="text-sm font-medium text-slate-700">
            Priority
            <select
              name="priority"
              defaultValue={filters.priority || ""}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            >
              <option value="">All priorities</option>
              <option value="none">No priority</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Source
            <select
              name="source"
              defaultValue={filters.source || ""}
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            >
              <option value="">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {sourceLabels[source]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              {total} {total === 1 ? "item" : "items"}
            </span>
            <a
              href={csvExportHref}
              className="underline underline-offset-2 hover:text-slate-900"
            >
              Export CSV
            </a>
            <a
              href={jsonExportHref}
              className="underline underline-offset-2 hover:text-slate-900"
            >
              Export JSON
            </a>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Link
                href={basePath}
                className="px-1 py-2 text-sm text-slate-500 hover:text-slate-950"
              >
                Clear
              </Link>
            )}
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Filter
            </button>
          </div>
        </div>
      </form>

      {filterError && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {filterError}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">No feedback found</h2>
          <p className="mt-2 text-sm text-slate-500">
            {hasActiveFilters
              ? "Try changing your search or filters."
              : emptyMessage}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4 transition hover:bg-slate-50/70">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {item.project && (
                      <Link
                        href={`/projects/${item.project.id}/feedback`}
                        className="rounded-full bg-slate-900 px-2.5 py-0.5 font-medium text-white transition hover:bg-slate-700"
                      >
                        {item.project.name}
                      </Link>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                      {typeLabels[item.type]}
                    </span>
                    <span className={sourceBadgeClass(item.source)}>
                      {sourceLabels[item.source]}
                    </span>
                    <span className="text-slate-400">
                      {dateFormatter.format(item.createdAt)}
                    </span>
                  </div>

                  <Link href={`/feedback/${item.id}`} className="mt-2 block group">
                    <h2 className="font-medium text-slate-950 group-hover:underline underline-offset-2">
                      {item.title}
                    </h2>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </Link>

                  {(item.reporterName || item.reporterEmail) && (
                    <p className="mt-2 text-xs text-slate-500">
                      Reporter: {item.reporterName || "Unknown"}
                      {item.reporterEmail ? ` (${item.reporterEmail})` : ""}
                    </p>
                  )}
                </div>

                <div className="shrink-0 sm:pt-0.5">
                  <InlineTriageControls
                    key={`${item.id}:${item.status}:${item.priority ?? ""}`}
                    feedbackId={item.id}
                    initialStatus={item.status}
                    initialPriority={item.priority}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          {page > 1 ? (
            <Link
              href={`${basePath}${buildFeedbackQueryString({ ...paginationFilters, page: page - 1 })}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
              Previous
            </span>
          )}

          <span className="text-slate-600">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`${basePath}${buildFeedbackQueryString({ ...paginationFilters, page: page + 1 })}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
              Next
            </span>
          )}
        </nav>
      )}
    </>
  );
}
