import Link from "next/link";
import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import InlineTriageControls from "@/components/inline-triage-controls";
import {
  ChevronDownIcon,
  DownloadIcon,
  FeedbackSourceIcon,
  FeedbackTypeIcon,
  SearchIcon,
  SlidersIcon,
} from "@/components/ui-icons";
import {
  priorityDotClass,
  priorityLabels,
  priorityOptions,
  sourceBadgeClass,
  sourceLabels,
  sourceOptions,
  statusLabels,
  statusOptions,
  typeAccentClass,
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
  const secondaryFilterCount =
    (showProjectFilter && filters.projectId ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.source ? 1 : 0);

  const hasActiveFilters = Boolean(
    filters.q ||
      secondaryFilterCount > 0 ||
      filters.status ||
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

  const statusTabs: { value: FeedbackStatus | undefined; label: string }[] = [
    { value: undefined, label: "All" },
    ...statusOptions.map((status) => ({ value: status, label: statusLabels[status] })),
  ];

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="navigation"
          aria-label="Status filter"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200/80 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          {statusTabs.map((tab) => {
            const isActive = filters.status === tab.value;
            const href = `${basePath}${buildFeedbackQueryString({
              ...paginationFilters,
              status: tab.value,
              page: undefined,
            })}`;

            return (
              <Link
                key={tab.label}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-mono tabular-nums">
            {total} {total === 1 ? "item" : "items"}
          </span>
          <span aria-hidden="true" className="h-3.5 w-px bg-slate-200" />
          <a
            href={csvExportHref}
            className="inline-flex items-center gap-1 font-medium text-slate-600 transition hover:text-slate-950"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span>CSV</span>
          </a>
          <a
            href={jsonExportHref}
            className="inline-flex items-center gap-1 font-medium text-slate-600 transition hover:text-slate-950"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            <span>JSON</span>
          </a>
        </div>
      </div>

      <search className="mt-3 block">
        <form
          key={formKey}
          method="get"
          action={basePath}
          className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          {filters.status && <input type="hidden" name="status" value={filters.status} />}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="q"
                aria-label="Search feedback"
                defaultValue={filters.q}
                placeholder="Search title, description, or reporter…"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="h-9 w-full rounded-md border border-slate-300 bg-white pr-3 pl-8.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                name="sort"
                aria-label="Sort order"
                defaultValue={filters.sort}
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    {sortLabels[option]}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="h-9 rounded-md bg-slate-950 px-3.5 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800"
              >
                Apply
              </button>

              {hasActiveFilters && (
                <Link
                  href={basePath}
                  className="inline-flex h-9 items-center rounded-md px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>

          <details open={secondaryFilterCount > 0} className="group mt-2.5 border-t border-slate-100 pt-2.5">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition select-none hover:bg-slate-100 hover:text-slate-950">
              <SlidersIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
              {secondaryFilterCount > 0 && (
                <span className="rounded-full bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white tabular-nums">
                  {secondaryFilterCount}
                </span>
              )}
              <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" />
            </summary>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {projects && (
                <div>
                  <label
                    htmlFor="filter-project"
                    className="block text-[11px] font-medium uppercase tracking-wider text-slate-500"
                  >
                    Project
                  </label>
                  <select
                    id="filter-project"
                    name="projectId"
                    defaultValue={filters.projectId || ""}
                    className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  >
                    <option value="">All projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="filter-type"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-500"
                >
                  Type
                </label>
                <select
                  id="filter-type"
                  name="type"
                  defaultValue={filters.type || ""}
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                >
                  <option value="">All types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {typeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-priority"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-500"
                >
                  Priority
                </label>
                <select
                  id="filter-priority"
                  name="priority"
                  defaultValue={filters.priority || ""}
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                >
                  <option value="">All priorities</option>
                  <option value="none">No priority</option>
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-source"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-500"
                >
                  Source
                </label>
                <select
                  id="filter-source"
                  name="source"
                  defaultValue={filters.source || ""}
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                >
                  <option value="">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </details>
        </form>
      </search>

      {filterError && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {filterError}
        </p>
      )}

      {items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">No feedback found</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {hasActiveFilters ? "Try changing your search or filters." : emptyMessage}
          </p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="px-4 py-3.5 transition hover:bg-slate-50/70 sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2.5">
                    <span
                      title={item.priority ? `${priorityLabels[item.priority]} priority` : "No priority"}
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${priorityDotClass(item.priority)}`}
                    />
                    <span className="sr-only">
                      {item.priority ? `${priorityLabels[item.priority]} priority` : "No priority"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 ${typeAccentClass(item.type)}`}>
                          <FeedbackTypeIcon type={item.type} className="h-3.5 w-3.5" />
                        </span>
                        <Link
                          href={`/feedback/${item.id}`}
                          className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-950 hover:underline underline-offset-4"
                        >
                          {item.title}
                        </Link>
                      </div>

                      {item.description && (
                        <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {item.project && (
                          <Link
                            href={`/projects/${item.project.id}/feedback`}
                            className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white transition hover:bg-slate-700"
                          >
                            {item.project.slug}
                          </Link>
                        )}
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          {typeLabels[item.type]}
                        </span>
                        <span className={sourceBadgeClass(item.source)}>
                          <FeedbackSourceIcon source={item.source} className="h-3 w-3" />
                          <span>{sourceLabels[item.source]}</span>
                        </span>
                        {(item.reporterName || item.reporterEmail) && (
                          <span className="truncate text-slate-500">
                            {item.reporterName || item.reporterEmail}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400">
                          {dateFormatter.format(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pl-4.5 sm:pl-0 sm:pt-0.5">
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
          className="mt-5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          {page > 1 ? (
            <Link
              href={`${basePath}${buildFeedbackQueryString({ ...paginationFilters, page: page - 1 })}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
              ← Previous
            </span>
          )}

          <span className="font-mono text-slate-600 tabular-nums">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`${basePath}${buildFeedbackQueryString({ ...paginationFilters, page: page + 1 })}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-slate-400">
              Next →
            </span>
          )}
        </nav>
      )}
    </>
  );
}
