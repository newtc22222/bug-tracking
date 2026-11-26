"use client";

import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
  TicketViewMode,
} from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDangerModal from "@/components/confirm-danger-modal";
import InlineTriageControls from "@/components/inline-triage-controls";
import KanbanBoard from "@/components/kanban-board";
import {
  ChevronDownIcon,
  DownloadIcon,
  FeedbackSourceIcon,
  FeedbackTypeIcon,
  GridIcon,
  KanbanIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
} from "@/components/ui-icons";
import { useWorkspace, type SavedViewItem } from "@/components/workspace-provider";
import {
  labelBadgeClass,
  labelDotClass,
  priorityDisplayOrder,
  priorityDotClass,
  priorityLabels,
  sourceBadgeClass,
  sourceLabels,
  sourceOptions,
  statusLabels,
  statusOptions,
  ticketViewModeLabels,
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
  ticketKey?: string | null;
  title: string;
  description: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  source: FeedbackSource;
  reporterName: string | null;
  reporterEmail: string | null;
  screenshotDataUrl?: string | null;
  createdAt: Date | string;
  project?: {
    id: string;
    name: string;
    slug: string;
  };
  labels?: Array<{
    label: {
      id: string;
      name: string;
      color: string;
    };
  }>;
};

type FeedbackListViewProps = {
  basePath: string;
  projectId?: string;
  items: FeedbackListItem[];
  kanbanItems?: FeedbackListItem[];
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

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return dateFormatter.format(date);
}

export default function FeedbackListView({
  basePath,
  projectId,
  items,
  kanbanItems,
  total,
  page,
  totalPages,
  filters,
  projects,
  filterError,
  emptyMessage,
}: FeedbackListViewProps) {
  const router = useRouter();
  const {
    settings,
    labels,
    savedViews,
    refreshSavedViews,
    registerTicketQueue,
    openTicket,
  } = useWorkspace();
  const [viewMode, setViewMode] = useState<TicketViewMode>(settings.defaultTicketView);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [savingView, setSavingView] = useState(false);

  // Register visible ticket order for J / K stepping inside Review Drawer
  useEffect(() => {
    const queueIds = (viewMode === "kanban" ? kanbanItems ?? items : items).map((i) => i.id);
    registerTicketQueue(queueIds);
  }, [items, kanbanItems, viewMode, registerTicketQueue]);

  const showProjectFilter = Boolean(projects);
  const secondaryFilterCount =
    (showProjectFilter && filters.projectId ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.source ? 1 : 0) +
    (filters.labelId ? 1 : 0);

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

  const viewOptions: Array<{ mode: TicketViewMode; label: string; icon: typeof ListIcon }> = [
    { mode: "list_full", label: "Full List", icon: ListIcon },
    { mode: "list_fixed", label: "Fixed List", icon: ListIcon },
    { mode: "grid", label: "Grid", icon: GridIcon },
    { mode: "kanban", label: "Kanban", icon: KanbanIcon },
  ];

  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  }

  async function runBulkAction(action: "status" | "priority" | "add_label" | "delete", value?: unknown) {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    setBulkNotice("");
    try {
      const res = await fetch("/api/feedback/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action, value }),
      });
      const json = (await res.json().catch(() => null)) as {
        updated?: number;
        skipped?: number;
        error?: string;
      } | null;

      if (!res.ok) {
        throw new Error(json?.error || "Bulk action failed.");
      }

      const skippedMsg =
        json?.skipped && json.skipped > 0
          ? ` (${json.skipped} skipped by strict workflow rules)`
          : "";
      setBulkNotice(`Updated ${json?.updated ?? 0} ticket(s)${skippedMsg}.`);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      router.refresh();
    } catch (e) {
      setBulkNotice(e instanceof Error ? e.message : "Bulk action failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleSaveCurrentView() {
    const name = window.prompt("Name this saved view (e.g. Urgent Bugs):");
    if (!name?.trim()) return;
    setSavingView(true);
    try {
      const cleanFilters: Record<string, string> = {};
      if (filters.q) cleanFilters.q = filters.q;
      if (filters.status) cleanFilters.status = filters.status;
      if (filters.type) cleanFilters.type = filters.type;
      if (filters.priority) cleanFilters.priority = filters.priority;
      if (filters.source) cleanFilters.source = filters.source;
      if (filters.labelId) cleanFilters.labelId = filters.labelId;
      if (filters.sort && filters.sort !== "newest") cleanFilters.sort = filters.sort;
      if (filters.projectId && !projectId) cleanFilters.projectId = filters.projectId;

      const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          projectId: projectId || null,
          filters: cleanFilters,
        }),
      });
      const data = (await res.json().catch(() => null)) as { view?: SavedViewItem } | null;
      if (res.ok && data?.view) {
        refreshSavedViews([...savedViews, data.view]);
        setBulkNotice(`Pinned "${data.view.name}" to sidebar.`);
      }
    } finally {
      setSavingView(false);
    }
  }

  const availableLabels = labels.filter((l) => !l.projectId || l.projectId === projectId);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {viewMode !== "kanban" ? (
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
        ) : (
          <span className="text-xs font-medium text-slate-600">
            Kanban Board · Showing {(kanbanItems ?? items).length} tickets across all workflow states
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <div
            data-tour="view-switcher"
            role="group"
            aria-label="Ticket view mode"
            className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          >
            {viewOptions.map(({ mode, label, icon: Icon }) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  title={ticketViewModeLabels[mode]}
                  onClick={() => setViewMode(mode)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-slate-950 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>

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
                aria-label="Search tickets"
                defaultValue={filters.q}
                placeholder="Search key (e.g. WEB-12), title, description, or reporter…"
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
                className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-950"
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
                <>
                  <button
                    type="button"
                    disabled={savingView}
                    onClick={() => void handleSaveCurrentView()}
                    className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                  >
                    <PlusIcon className="h-3 w-3" />
                    <span>Save view</span>
                  </button>
                  <Link
                    href={basePath}
                    className="inline-flex h-9 items-center rounded-md px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    Clear
                  </Link>
                </>
              )}
            </div>
          </div>

          <details
            open={secondaryFilterCount > 0}
            className="group mt-2.5 border-t border-slate-100 pt-2.5"
          >
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition select-none hover:bg-slate-100 hover:text-slate-950">
              <SlidersIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Filters</span>
              {secondaryFilterCount > 0 && (
                <span className="rounded-full bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] leading-none text-white tabular-nums">
                  {secondaryFilterCount}
                </span>
              )}
              <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 transition group-open:rotate-180" />
            </summary>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
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
                    className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950"
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
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950"
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
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950"
                >
                  <option value="">All priorities</option>
                  <option value="none">No priority</option>
                  {priorityDisplayOrder.map((priority) => (
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
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950"
                >
                  <option value="">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {sourceLabels[source]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="filter-label"
                  className="block text-[11px] font-medium uppercase tracking-wider text-slate-500"
                >
                  Label
                </label>
                <select
                  id="filter-label"
                  name="labelId"
                  defaultValue={filters.labelId || ""}
                  className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-950 outline-none focus:border-slate-950"
                >
                  <option value="">All labels</option>
                  {availableLabels.map((lbl) => (
                    <option key={lbl.id} value={lbl.id}>
                      {lbl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </details>
        </form>
      </search>

      {/* Bulk Action Bar */}
      {viewMode !== "kanban" && selectedIds.length > 0 && (
        <div
          role="region"
          aria-label="Bulk ticket actions"
          className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm"
        >
          <div className="flex items-center gap-2.5 text-xs">
            <span className="rounded-full bg-slate-950 px-2 py-0.5 font-mono text-[11px] font-semibold text-white">
              {selectedIds.length}
            </span>
            <span className="font-medium text-slate-800">selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-slate-500 underline hover:text-slate-950"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Bulk set priority"
              disabled={bulkBusy}
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                void runBulkAction("priority", v === "none" ? null : v);
                e.target.value = "";
              }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
            >
              <option value="">Set priority…</option>
              <option value="none">Clear priority</option>
              {priorityDisplayOrder.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>

            <select
              aria-label="Bulk transition status"
              disabled={bulkBusy}
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                void runBulkAction("status", e.target.value);
                e.target.value = "";
              }}
              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
            >
              <option value="">Transition status…</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>

            {availableLabels.length > 0 && (
              <select
                aria-label="Bulk add label"
                disabled={bulkBusy}
                defaultValue=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  void runBulkAction("add_label", e.target.value);
                  e.target.value = "";
                }}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
              >
                <option value="">Add label…</option>
                {availableLabels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setConfirmBulkDelete(true)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {bulkNotice && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700"
        >
          {bulkNotice}
        </p>
      )}

      {filterError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {filterError}
        </p>
      )}

      {viewMode === "kanban" ? (
        <KanbanBoard items={kanbanItems ?? items} projectId={projectId} />
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">No tickets found</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {hasActiveFilters ? "Try changing your search or filters." : emptyMessage}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={`flex flex-col justify-between rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition ${
                  isSelected ? "border-slate-950 ring-1 ring-slate-950/20" : "border-slate-200/80 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                      <span
                        className={`h-2 w-2 rounded-full ${priorityDotClass(item.priority)}`}
                        title={item.priority ? `${priorityLabels[item.priority]} priority` : "No priority"}
                      />
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {item.ticketKey || item.id.slice(0, 8)}
                      </span>
                    </div>
                    <span className={sourceBadgeClass(item.source)}>
                      <FeedbackSourceIcon source={item.source} className="h-3 w-3" />
                      <span>{sourceLabels[item.source]}</span>
                    </span>
                  </div>

                  {item.screenshotDataUrl && (
                    <button
                      type="button"
                      onClick={() => openTicket(item.id)}
                      className="mt-2.5 block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    >
                      <Image
                        src={item.screenshotDataUrl}
                        alt=""
                        width={400}
                        height={200}
                        unoptimized
                        className="h-28 w-full object-cover"
                      />
                    </button>
                  )}

                  <div className="mt-2.5 flex items-start gap-1.5">
                    <span className={`mt-0.5 shrink-0 ${typeAccentClass(item.type)}`}>
                      <FeedbackTypeIcon type={item.type} className="h-3.5 w-3.5" />
                    </span>
                    <button
                      type="button"
                      onClick={() => openTicket(item.id)}
                      className="text-left text-sm font-semibold leading-snug text-slate-950 hover:underline underline-offset-2 line-clamp-2"
                    >
                      {item.title}
                    </button>
                  </div>

                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                      {item.description}
                    </p>
                  )}

                  {item.labels && item.labels.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.labels.map(({ label }) => (
                        <span key={label.id} className={labelBadgeClass(label.color)}>
                          <span className={`h-1.5 w-1.5 rounded-full ${labelDotClass(label.color)}`} />
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    {item.project ? (
                      <Link
                        href={`/projects/${item.project.id}/feedback`}
                        className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-medium text-white hover:bg-slate-700"
                      >
                        {item.project.slug}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <span className="font-mono">{formatDate(item.createdAt)}</span>
                  </div>
                  <InlineTriageControls
                    key={`${item.id}:${item.type}:${item.priority ?? ""}:${item.status}`}
                    feedbackId={item.id}
                    initialType={item.type}
                    initialPriority={item.priority}
                    initialStatus={item.status}
                    compact
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          className={`mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
            viewMode === "list_fixed"
              ? "bt-scroller h-[calc(100vh-300px)] min-h-[380px] overflow-y-auto"
              : ""
          }`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-4 py-2 text-[11px] font-medium text-slate-500 backdrop-blur-xs sm:px-5">
            <label className="inline-flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              <span>Select all on page</span>
            </label>
            <span className="hidden sm:inline font-mono">Type · Priority · Status</span>
          </div>
          <ul className="divide-y divide-slate-200/80">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  className={`px-4 py-3.5 transition hover:bg-slate-50/70 sm:px-5 ${
                    isSelected ? "bg-slate-50/90" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.title}`}
                          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-slate-300"
                        />
                        <span
                          title={
                            item.priority ? `${priorityLabels[item.priority]} priority` : "No priority"
                          }
                          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${priorityDotClass(item.priority)}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 ${typeAccentClass(item.type)}`}>
                              <FeedbackTypeIcon type={item.type} className="h-3.5 w-3.5" />
                            </span>
                            <span className="shrink-0 font-mono text-xs font-semibold text-slate-500">
                              {item.ticketKey || item.id.slice(0, 8)}
                            </span>
                            <button
                              type="button"
                              onClick={() => openTicket(item.id)}
                              className="min-w-0 truncate text-left text-sm font-semibold tracking-tight text-slate-950 hover:underline underline-offset-4"
                            >
                              {item.title}
                            </button>
                          </div>

                          {item.description && (
                            <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500">
                              {item.description}
                            </p>
                          )}

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
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
                            {item.labels?.map(({ label }) => (
                              <span key={label.id} className={labelBadgeClass(label.color)}>
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${labelDotClass(label.color)}`}
                                />
                                {label.name}
                              </span>
                            ))}
                            {(item.reporterName || item.reporterEmail) && (
                              <span className="truncate text-slate-500">
                                {item.reporterName || item.reporterEmail}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-slate-400">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 pl-6 lg:pl-0 lg:pt-0.5">
                      <InlineTriageControls
                        key={`${item.id}:${item.type}:${item.priority ?? ""}:${item.status}`}
                        feedbackId={item.id}
                        initialType={item.type}
                        initialPriority={item.priority}
                        initialStatus={item.status}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {viewMode !== "kanban" && totalPages > 1 && (
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

      <ConfirmDangerModal
        open={confirmBulkDelete}
        title={`Delete ${selectedIds.length} ticket(s)?`}
        description="This bulk deletion is permanent and cannot be undone."
        consequences={[
          `${selectedIds.length} ticket(s) will be permanently removed.`,
          "All associated notes, status history, and ticket links will be deleted.",
        ]}
        confirmPhrase="DELETE"
        confirmLabel={`Delete ${selectedIds.length} Ticket(s)`}
        busy={bulkBusy}
        onConfirm={() => runBulkAction("delete")}
        onClose={() => setConfirmBulkDelete(false)}
      />
    </>
  );
}
