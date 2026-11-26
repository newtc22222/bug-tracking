"use client";

import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
  GitPlatform,
  TrackerPlatform,
} from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AiInvestigatePanel from "@/components/ai-investigate-panel";
import AiTriagePanel from "@/components/ai-triage-panel";
import ConfirmDangerModal from "@/components/confirm-danger-modal";
import ExternalTrackerPanel, { type ExternalLinkItem } from "@/components/external-tracker-panel";
import FeedbackNotesPanel from "@/components/feedback-notes-panel";
import MarkdownEditor from "@/components/markdown-editor";
import TicketLinksPanel from "@/components/ticket-links-panel";
import { useWorkspace, type WorkspaceLabelItem } from "@/components/workspace-provider";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  FeedbackSourceIcon,
  GitBranchIcon,
  MaximizeIcon,
  PlusIcon,
  TrashIcon,
  WorkflowIcon,
  XIcon,
} from "@/components/ui-icons";
import WorkflowGraph from "@/components/workflow-graph";
import {
  gitPlatformLabels,
  labelBadgeClass,
  labelColorOptions,
  labelDotClass,
  priorityDisplayOrder,
  priorityDotClass,
  priorityLabels,
  sourceBadgeClass,
  sourceLabels,
  statusLabels,
  typeLabels,
  typeOptions,
} from "@/lib/feedback-display";
import { extractRepoDisplayPath } from "@/lib/git-platforms";
import { getSelectableStatuses } from "@/lib/workflow";

export type DetailedFeedbackItem = {
  id: string;
  projectId: string;
  ticketKey: string | null;
  title: string;
  description: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority | null;
  source: FeedbackSource;
  reporterName: string | null;
  reporterEmail: string | null;
  pageUrl: string | null;
  browserInfo: string | null;
  screenshotDataUrl: string | null;
  githubIssueUrl: string | null;
  githubIssueNumber: number | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
    keyPrefix?: string;
    gitPlatform?: GitPlatform;
    repoUrl?: string | null;
    trackerPlatform?: TrackerPlatform;
  };
  externalLinks?: ExternalLinkItem[];
  labels?: Array<{ label: WorkspaceLabelItem }>;
};

type TicketDetailWorkspaceProps = {
  feedbackId: string;
  surfaceMode?: "page" | "drawer" | "modal";
  onOpenTicket?: (ticketId: string) => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
};

export default function TicketDetailWorkspace({
  feedbackId,
  surfaceMode = "page",
  onOpenTicket,
  onUpdated,
  onDeleted,
}: TicketDetailWorkspaceProps) {
  const router = useRouter();
  const { labels: workspaceLabels, refreshLabels } = useWorkspace();
  const [feedback, setFeedback] = useState<DetailedFeedbackItem | null>(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("indigo");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeedbackType>("bug");
  const [priority, setPriority] = useState<FeedbackPriority | "">("");
  const [status, setStatus] = useState<FeedbackStatus>("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showWorkflowGraph, setShowWorkflowGraph] = useState(false);
  const [notesRefreshSignal, setNotesRefreshSignal] = useState(0);
  const [linksRefreshSignal, setLinksRefreshSignal] = useState(0);
  const [error, setError] = useState("");
  const savedTimerRef = useRef<number | null>(null);
  const lightboxRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadFeedback() {
      try {
        const response = await fetch(`/api/feedback/${feedbackId}`);
        const body = (await response.json().catch(() => null)) as
          | (DetailedFeedbackItem & { error?: string })
          | null;

        if (!response.ok || !body) {
          throw new Error(body?.error || "Ticket not found.");
        }

        if (active) {
          setError("");
          setFeedback(body);
          setTitle(body.title);
          setDescription(body.description || "");
          setType(body.type);
          setStatus(body.status);
          setPriority(body.priority || "");
          setSelectedLabelIds((body.labels || []).map((entry) => entry.label.id));
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load ticket.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadFeedback();
    return () => {
      active = false;
    };
  }, [feedbackId]);

  function clearSavedBanner() {
    if (savedBanner) setSavedBanner(false);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }

  async function saveChanges(overrides?: { status?: FeedbackStatus }) {
    if (!feedback) return;
    setError("");
    clearSavedBanner();
    setSaving(true);

    const nextStatus = overrides?.status ?? status;

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          status: nextStatus,
          priority: priority || null,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | (DetailedFeedbackItem & { error?: string })
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "Unable to save ticket.");
      }

      setFeedback(body);
      setTitle(body.title);
      setDescription(body.description || "");
      setType(body.type);
      setStatus(body.status);
      setPriority(body.priority || "");
      setNotesRefreshSignal((prev) => prev + 1);
      setSavedBanner(true);
      savedTimerRef.current = window.setTimeout(() => setSavedBanner(false), 3000);
      router.refresh();
      onUpdated?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveChanges();
  }

  async function handleQuickTransition(nextStatus: FeedbackStatus) {
    setStatus(nextStatus);
    await saveChanges({ status: nextStatus });
  }

  async function handleDelete() {
    setError("");
    setDeleting(true);
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || "Unable to delete ticket.");
      }
      router.refresh();
      if (onDeleted) {
        onDeleted();
      } else if (feedback) {
        router.push(`/projects/${feedback.project.id}/feedback`);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete ticket.");
      setDeleting(false);
    }
  }

  async function handleLinkDuplicate(targetId: string) {
    const res = await fetch(`/api/feedback/${feedbackId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId, direction: "duplicates" }),
    });
    if (res.ok) {
      setLinksRefreshSignal((n) => n + 1);
    }
  }

  async function toggleLabel(labelId: string) {
    const next = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    setSelectedLabelIds(next);
    const res = await fetch(`/api/feedback/${feedbackId}/labels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelIds: next }),
    });
    if (res.ok) {
      router.refresh();
    }
  }

  async function handleCreateLabel() {
    if (!newLabelName.trim()) return;
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
    });
    const json = (await res.json().catch(() => null)) as { label?: WorkspaceLabelItem } | null;
    if (res.ok && json?.label) {
      refreshLabels([...workspaceLabels, json.label]);
      setNewLabelName("");
      setShowNewLabel(false);
      await toggleLabel(json.label.id);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white" />
          </div>
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6">
        {surfaceMode === "page" && (
          <Link
            href="/feedback"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-950"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>Back to inbox</span>
          </Link>
        )}
        <h2 className="text-lg font-semibold text-slate-950">Ticket unavailable</h2>
        <p className="mt-1.5 text-sm text-red-700">{error || "Could not load ticket."}</p>
      </div>
    );
  }

  const isDirty =
    title !== feedback.title ||
    description !== (feedback.description || "") ||
    type !== feedback.type ||
    status !== feedback.status ||
    priority !== (feedback.priority || "");

  const isSafeHttpUrl =
    feedback.pageUrl !== null &&
    (feedback.pageUrl.startsWith("https://") || feedback.pageUrl.startsWith("http://"));

  const selectableStatuses = getSelectableStatuses(feedback.status);
  const repoDisplay = extractRepoDisplayPath(feedback.project.repoUrl);
  const formId = `ticket-edit-form-${feedback.id}`;

  return (
    <div>
      {surfaceMode === "page" && (
        <nav
          aria-label="Breadcrumb"
          className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"
        >
          <Link href="/feedback" className="transition hover:text-slate-950">
            Inbox
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={`/projects/${feedback.project.id}/feedback`}
            className="transition hover:text-slate-950"
          >
            {feedback.project.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono font-semibold text-slate-800">
            {feedback.ticketKey || feedback.id.slice(0, 8)}
          </span>
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
            {feedback.ticketKey || feedback.id.slice(0, 8)}
          </span>
          <Link
            href={`/projects/${feedback.project.id}/feedback`}
            className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-200"
          >
            {feedback.project.name}
          </Link>
          <span className={sourceBadgeClass(feedback.source)}>
            <FeedbackSourceIcon source={feedback.source} className="h-3 w-3" />
            <span>{sourceLabels[feedback.source]}</span>
          </span>
          {feedback.project.repoUrl && feedback.project.gitPlatform && feedback.project.gitPlatform !== "none" && (
            <a
              href={feedback.project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            >
              <GitBranchIcon className="h-3 w-3" />
              <span>
                {gitPlatformLabels[feedback.project.gitPlatform]}: {repoDisplay}
              </span>
            </a>
          )}
          <span className="font-mono text-xs text-slate-400">
            {new Date(feedback.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <div
        className={`mt-4 grid grid-cols-1 gap-5 ${
          surfaceMode === "drawer"
            ? "xl:grid-cols-[1fr_300px]"
            : "lg:grid-cols-[1fr_340px]"
        } items-start`}
      >
        <div className="space-y-5 min-w-0">
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-slate-950">Issue Details</h2>
              {isDirty && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Unsaved changes
                </span>
              )}
            </div>

            {savedBanner && (
              <div
                role="status"
                aria-live="polite"
                className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
              >
                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Changes saved.</span>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor={`title-${feedback.id}`} className="block text-xs font-medium text-slate-700">
                  Title
                </label>
                <input
                  id={`title-${feedback.id}`}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={title}
                  onChange={(e) => {
                    clearSavedBanner();
                    setTitle(e.target.value);
                  }}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`desc-${feedback.id}`}
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  Description <span className="font-normal text-slate-400">(Markdown WYSIWYG)</span>
                </label>
                <MarkdownEditor
                  id={`desc-${feedback.id}`}
                  value={description}
                  onChange={(md) => {
                    clearSavedBanner();
                    setDescription(md);
                  }}
                  placeholder="Add context, reproduction steps, or acceptance criteria…"
                  showBugTemplate
                  minHeightClass="min-h-40"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end border-t border-slate-100 pt-3.5">
              <button
                type="submit"
                disabled={saving || deleting}
                className="h-9 rounded-md bg-slate-950 px-4 text-xs font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>

          <TicketLinksPanel
            feedbackId={feedback.id}
            currentStatus={feedback.status}
            refreshSignal={linksRefreshSignal}
            onOpenTicket={onOpenTicket}
            onSuggestBlocked={() => void handleQuickTransition("blocked")}
          />

          {(feedback.pageUrl || feedback.browserInfo || feedback.screenshotDataUrl) && (
            <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-semibold text-slate-950">Captured Context</h2>
              <dl className="mt-3 space-y-3 text-xs">
                {feedback.pageUrl && (
                  <div>
                    <dt className="font-medium text-slate-500">Page URL</dt>
                    <dd className="mt-1 break-all font-mono text-slate-800">
                      {isSafeHttpUrl ? (
                        <a
                          href={feedback.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-slate-950"
                        >
                          <span>{feedback.pageUrl}</span>
                          <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        feedback.pageUrl
                      )}
                    </dd>
                  </div>
                )}

                {feedback.browserInfo && (
                  <div>
                    <dt className="font-medium text-slate-500">Browser &amp; Environment</dt>
                    <dd className="mt-1 break-words font-mono text-slate-700">
                      {feedback.browserInfo}
                    </dd>
                  </div>
                )}

                {feedback.screenshotDataUrl && (
                  <div>
                    <dt className="font-medium text-slate-500">Screenshot</dt>
                    <dd className="mt-2">
                      <button
                        type="button"
                        onClick={() => lightboxRef.current?.showModal()}
                        className="group relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-slate-400"
                      >
                        <Image
                          src={feedback.screenshotDataUrl}
                          alt="Captured screenshot"
                          width={800}
                          height={600}
                          unoptimized
                          className="max-h-64 w-full object-contain"
                        />
                        <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-md bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-white">
                          <MaximizeIcon className="h-3 w-3" />
                          <span>Expand</span>
                        </span>
                      </button>

                      <dialog
                        ref={lightboxRef}
                        aria-label="Captured screenshot preview"
                        {...({ closedby: "any" } as Record<string, string>)}
                        className="m-auto max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                          <h1 className="text-sm font-semibold text-slate-950">Captured Screenshot</h1>
                          <button
                            type="button"
                            autoFocus
                            onClick={() => lightboxRef.current?.close()}
                            aria-label="Close screenshot"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:text-slate-950"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="max-h-[calc(90vh-3.5rem)] overflow-auto bg-slate-950/5 p-4">
                          <Image
                            src={feedback.screenshotDataUrl}
                            alt="Full-size captured screenshot"
                            width={1600}
                            height={1200}
                            unoptimized
                            className="mx-auto max-h-[78vh] w-auto rounded border border-slate-200 bg-white object-contain"
                          />
                        </div>
                      </dialog>
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <FeedbackNotesPanel feedbackId={feedback.id} refreshSignal={notesRefreshSignal} />
        </div>

        <aside className="space-y-4">
          {/* Triage Properties strictly ordered: Type > Priority > Status */}
          <section
            data-tour="triage-properties"
            className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Triage Properties
              </h2>
              <button
                type="button"
                onClick={() => setShowWorkflowGraph((v) => !v)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                <WorkflowIcon className="h-3 w-3" />
                <span>{showWorkflowGraph ? "Hide flow" : "Workflow"}</span>
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* 1. TYPE */}
              <div>
                <label htmlFor={`type-${feedback.id}`} className="block text-xs font-medium text-slate-700">
                  Type
                </label>
                <select
                  id={`type-${feedback.id}`}
                  form={formId}
                  value={type}
                  onChange={(e) => {
                    clearSavedBanner();
                    setType(e.target.value as FeedbackType);
                  }}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                >
                  {typeOptions.map((value) => (
                    <option key={value} value={value}>
                      {typeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. PRIORITY */}
              <div>
                <label
                  htmlFor={`priority-${feedback.id}`}
                  className="block text-xs font-medium text-slate-700"
                >
                  Priority
                </label>
                <div className="relative mt-1 flex items-center">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-3 h-2 w-2 rounded-full ${priorityDotClass(
                      priority ? (priority as FeedbackPriority) : null,
                    )}`}
                  />
                  <select
                    id={`priority-${feedback.id}`}
                    form={formId}
                    value={priority}
                    onChange={(e) => {
                      clearSavedBanner();
                      setPriority(e.target.value as FeedbackPriority | "");
                    }}
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pr-2.5 pl-7 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  >
                    <option value="">No priority</option>
                    {priorityDisplayOrder.map((value) => (
                      <option key={value} value={value}>
                        {priorityLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. STATUS (Strict workflow allowed transitions only!) */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`status-${feedback.id}`}
                    className="block text-xs font-medium text-slate-700"
                  >
                    Status
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">Strict flow</span>
                </div>
                <select
                  id={`status-${feedback.id}`}
                  form={formId}
                  value={status}
                  onChange={(e) => {
                    clearSavedBanner();
                    setStatus(e.target.value as FeedbackStatus);
                  }}
                  className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                >
                  {selectableStatuses.map((value) => (
                    <option key={value} value={value}>
                      {statusLabels[value]}
                      {value === feedback.status ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {showWorkflowGraph && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5">
                  <WorkflowGraph
                    currentStatus={feedback.status}
                    onSelectStatus={(next) => void handleQuickTransition(next)}
                    disabled={saving}
                    compact
                  />
                </div>
              )}

              <button
                type="submit"
                form={formId}
                disabled={saving || deleting}
                className="h-9 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-60"
              >
                {saving ? "Saving…" : isDirty ? "Save Changes *" : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Labels Card */}
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Labels
              </h2>
              <button
                type="button"
                onClick={() => setShowNewLabel((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-950"
              >
                <PlusIcon className="h-3 w-3" />
                <span>{showNewLabel ? "Close" : "New"}</span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {workspaceLabels
                .filter((l) => !l.projectId || l.projectId === feedback.projectId)
                .map((lbl) => {
                  const active = selectedLabelIds.includes(lbl.id);
                  return (
                    <button
                      key={lbl.id}
                      type="button"
                      onClick={() => void toggleLabel(lbl.id)}
                      className={`${labelBadgeClass(lbl.color)} transition ${
                        active ? "ring-2 ring-slate-950/60" : "opacity-55 hover:opacity-100"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${labelDotClass(lbl.color)}`} />
                      <span>{lbl.name}</span>
                    </button>
                  );
                })}
            </div>

            {showNewLabel && (
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Label name…"
                  className="h-7.5 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs"
                />
                <select
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-7.5 rounded-md border border-slate-300 bg-white px-1.5 text-xs"
                >
                  {labelColorOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleCreateLabel()}
                  className="h-7.5 rounded-md bg-slate-950 px-2.5 text-xs font-medium text-white"
                >
                  Add
                </button>
              </div>
            )}
          </section>

          <AiInvestigatePanel
            feedbackId={feedback.id}
            onSavedToNotes={() => setNotesRefreshSignal((n) => n + 1)}
          />

          <AiTriagePanel
            projectId={feedback.projectId}
            feedbackId={feedback.id}
            title={title}
            description={description}
            type={type}
            priority={priority}
            onLinkDuplicate={(targetId) => void handleLinkDuplicate(targetId)}
            onApplySuggestions={(next) => {
              clearSavedBanner();
              if (next.title !== undefined) setTitle(next.title);
              if (next.description !== undefined) setDescription(next.description);
              if (next.type !== undefined) setType(next.type as FeedbackType);
              if (next.priority !== undefined) setPriority(next.priority as FeedbackPriority | "");
            }}
          />

          <ExternalTrackerPanel
            feedbackId={feedback.id}
            projectTrackerPlatform={feedback.project.trackerPlatform || "none"}
            initialLinks={feedback.externalLinks || []}
          />

          {(feedback.reporterName || feedback.reporterEmail) && (
            <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reporter
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 font-mono text-xs font-semibold text-white uppercase"
                >
                  {(feedback.reporterName || feedback.reporterEmail || "?").slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {feedback.reporterName || "Anonymous"}
                  </p>
                  {feedback.reporterEmail && (
                    <a
                      href={`mailto:${feedback.reporterEmail}`}
                      className="block truncate font-mono text-xs text-slate-500 hover:text-slate-950 hover:underline"
                    >
                      {feedback.reporterEmail}
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-red-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold text-slate-900">Danger Zone</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Permanently remove this ticket and its notes, links, and history.
            </p>
            <button
              type="button"
              disabled={saving || deleting}
              onClick={() => setConfirmDelete(true)}
              className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              <span>Delete Ticket…</span>
            </button>
          </section>

          <ConfirmDangerModal
            open={confirmDelete}
            title={`Delete ticket ${feedback.ticketKey || feedback.id.slice(0, 8)}?`}
            description="This action permanently deletes the ticket and cannot be undone."
            consequences={[
              "Removes the ticket description, screenshot, and captured context.",
              "Deletes all internal notes, status transition logs, and ticket links.",
            ]}
            confirmPhrase={feedback.ticketKey || "DELETE"}
            confirmLabel="Delete Ticket"
            busy={deleting}
            error={error}
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(false)}
          />
        </aside>
      </div>
    </div>
  );
}
