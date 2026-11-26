"use client";

import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiTriagePanel from "@/components/ai-triage-panel";
import FeedbackNotesPanel from "@/components/feedback-notes-panel";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExternalLinkIcon,
  FeedbackSourceIcon,
  GitHubIcon,
  MaximizeIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui-icons";
import {
  priorityDotClass,
  priorityLabels,
  priorityOptions,
  sourceBadgeClass,
  sourceLabels,
  statusLabels,
  statusOptions,
  typeLabels,
  typeOptions,
} from "@/lib/feedback-display";

type FeedbackItem = {
  id: string;
  projectId: string;
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
  };
};

type FeedbackResponse = FeedbackItem & { error?: string };

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promotingGithub, setPromotingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [notesRefreshSignal, setNotesRefreshSignal] = useState(0);
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
    async function loadFeedback() {
      try {
        const response = await fetch(`/api/feedback/${params.id}`);
        const body = (await response.json().catch(() => null)) as FeedbackResponse | null;

        if (!response.ok || !body) {
          throw new Error(body?.error || "Feedback item not found.");
        }

        setFeedback(body);
        setTitle(body.title);
        setDescription(body.description || "");
        setType(body.type);
        setStatus(body.status);
        setPriority(body.priority || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load feedback.");
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();
  }, [params.id]);

  // Fallback light-dismiss for browsers without native <dialog closedby="any">
  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    const isOutside = (event: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    let pressedOutside = false;
    const handlePointerDown = (event: PointerEvent) => {
      pressedOutside = isOutside(event);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (pressedOutside && isOutside(event)) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [feedback?.screenshotDataUrl]);

  function clearSavedBanner() {
    if (savedBanner) {
      setSavedBanner(false);
    }
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    clearSavedBanner();
    setSaving(true);

    try {
      const response = await fetch(`/api/feedback/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          status,
          priority: priority || null,
        }),
      });
      const body = (await response.json().catch(() => null)) as FeedbackResponse | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "Unable to save feedback.");
      }

      setFeedback(body);
      setTitle(body.title);
      setDescription(body.description || "");
      setType(body.type);
      setStatus(body.status);
      setPriority(body.priority || "");
      setNotesRefreshSignal((prev) => prev + 1);
      setSavedBanner(true);
      savedTimerRef.current = window.setTimeout(() => setSavedBanner(false), 3200);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError("");
    setDeleting(true);

    try {
      const response = await fetch(`/api/feedback/${params.id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error || "Unable to delete feedback.");
      }

      if (feedback) {
        router.push(`/projects/${feedback.project.id}/feedback`);
        router.refresh();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete feedback.");
      setDeleting(false);
    }
  }

  async function handlePromoteGithub() {
    setGithubError("");
    setPromotingGithub(true);

    try {
      const response = await fetch(`/api/feedback/${params.id}/github`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        feedbackItem?: FeedbackItem;
      } | null;

      if (!response.ok || !body?.feedbackItem) {
        throw new Error(body?.error || "Unable to promote feedback to GitHub.");
      }

      setFeedback(body.feedbackItem);
    } catch (promoteError) {
      setGithubError(
        promoteError instanceof Error
          ? promoteError.message
          : "Unable to promote feedback to GitHub.",
      );
    } finally {
      setPromotingGithub(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-80 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="h-80 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            <div className="h-56 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          </div>
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            <div className="h-32 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!feedback) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/feedback"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          <span>Back to inbox</span>
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-950">Feedback unavailable</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </main>
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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
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
        <span className="font-mono text-slate-700">{feedback.id.slice(0, 8)}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={sourceBadgeClass(feedback.source)}>
            <FeedbackSourceIcon source={feedback.source} className="h-3 w-3" />
            <span>{sourceLabels[feedback.source]}</span>
          </span>
          {feedback.createdAt && (
            <span className="font-mono text-xs text-slate-500">
              {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {feedback.githubIssueUrl && (
          <a
            href={feedback.githubIssueUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 transition hover:bg-emerald-100"
          >
            <GitHubIcon className="h-3.5 w-3.5" />
            <span>#{feedback.githubIssueNumber ?? "linked"}</span>
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <form
            id="feedback-edit-form"
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-lg font-semibold tracking-tight text-slate-950">Issue Details</h1>
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
                className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
              >
                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Changes saved.</span>
              </div>
            )}

            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="feedback-title" className="block text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="feedback-title"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={title}
                  onChange={(event) => {
                    clearSavedBanner();
                    setTitle(event.target.value);
                  }}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="feedback-description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="feedback-description"
                  className="mt-1.5 min-h-40 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={description}
                  onChange={(event) => {
                    clearSavedBanner();
                    setDescription(event.target.value);
                  }}
                  placeholder="Add context, reproduction steps, or acceptance criteria"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={saving || deleting}
                className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>

          {(feedback.pageUrl || feedback.browserInfo || feedback.screenshotDataUrl) && (
            <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h2 className="text-sm font-semibold text-slate-950">Captured Context</h2>
              <dl className="mt-4 space-y-3 text-xs">
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
                        className="group relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left transition hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
                      >
                        <Image
                          src={feedback.screenshotDataUrl}
                          alt="Captured feedback screenshot"
                          width={800}
                          height={600}
                          unoptimized
                          className="max-h-72 w-full object-contain"
                        />
                        <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-md bg-slate-950/80 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs transition group-hover:bg-slate-950">
                          <MaximizeIcon className="h-3 w-3" />
                          <span>Expand</span>
                        </span>
                      </button>

                      <dialog
                        ref={lightboxRef}
                        aria-labelledby="screenshot-lightbox-title"
                        {...({ closedby: "any" } as Record<string, string>)}
                        className="m-auto max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                          <h1
                            id="screenshot-lightbox-title"
                            className="text-sm font-semibold text-slate-950"
                          >
                            Captured Screenshot
                          </h1>
                          <button
                            type="button"
                            autoFocus
                            onClick={() => lightboxRef.current?.close()}
                            aria-label="Close screenshot"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="max-h-[calc(90vh-3.5rem)] overflow-auto bg-slate-950/5 p-4">
                          <Image
                            src={feedback.screenshotDataUrl}
                            alt="Full-size captured feedback screenshot"
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

        <aside className="space-y-4 lg:sticky lg:top-20">
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Triage Properties
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="sidebar-status"
                  className="block text-xs font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="sidebar-status"
                  form="feedback-edit-form"
                  className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={status}
                  onChange={(event) => {
                    clearSavedBanner();
                    setStatus(event.target.value);
                  }}
                  required
                >
                  {statusOptions.map((value) => (
                    <option key={value} value={value}>
                      {statusLabels[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="sidebar-priority"
                  className="block text-xs font-medium text-slate-700"
                >
                  Priority
                </label>
                <div className="relative mt-1.5 flex items-center">
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute left-3 h-2 w-2 rounded-full ${priorityDotClass(
                      priority ? (priority as FeedbackPriority) : null,
                    )}`}
                  />
                  <select
                    id="sidebar-priority"
                    form="feedback-edit-form"
                    className="h-9 w-full rounded-md border border-slate-300 bg-white pr-2.5 pl-7 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                    value={priority}
                    onChange={(event) => {
                      clearSavedBanner();
                      setPriority(event.target.value);
                    }}
                  >
                    <option value="">No priority</option>
                    {priorityOptions.map((value) => (
                      <option key={value} value={value}>
                        {priorityLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="sidebar-type" className="block text-xs font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="sidebar-type"
                  form="feedback-edit-form"
                  className="mt-1.5 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={type}
                  onChange={(event) => {
                    clearSavedBanner();
                    setType(event.target.value);
                  }}
                  required
                >
                  {typeOptions.map((value) => (
                    <option key={value} value={value}>
                      {typeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                form="feedback-edit-form"
                disabled={saving || deleting}
                className="h-9 w-full rounded-md bg-slate-950 px-3 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : isDirty ? "Save Changes *" : "Save Changes"}
              </button>
            </div>
          </section>

          <AiTriagePanel
            projectId={feedback.projectId}
            feedbackId={feedback.id}
            title={title}
            description={description}
            type={type}
            priority={priority}
            onApplySuggestions={(next) => {
              clearSavedBanner();
              if (next.title !== undefined) setTitle(next.title);
              if (next.description !== undefined) setDescription(next.description);
              if (next.type !== undefined) setType(next.type);
              if (next.priority !== undefined) setPriority(next.priority);
            }}
          />

          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <GitHubIcon className="h-3.5 w-3.5 text-slate-700" />
                <span>GitHub Issue</span>
              </h2>
              {feedback.githubIssueUrl && (
                <span className="font-mono text-xs font-medium text-emerald-700">
                  #{feedback.githubIssueNumber ?? "linked"}
                </span>
              )}
            </div>

            {feedback.githubIssueUrl ? (
              <a
                href={feedback.githubIssueUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-3 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
              >
                <span>View Issue on GitHub</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handlePromoteGithub}
                disabled={promotingGithub}
                className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GitHubIcon className="h-3.5 w-3.5" />
                <span>{promotingGithub ? "Creating issue…" : "Promote to GitHub Issue"}</span>
              </button>
            )}

            {githubError && (
              <p role="alert" className="mt-2.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                {githubError}
              </p>
            )}
          </section>

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
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-800">
                  Delete this feedback item permanently?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="h-8 flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || deleting}
                    onClick={handleDelete}
                    className="h-8 flex-1 rounded-md bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={saving || deleting}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete Feedback</span>
              </button>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
