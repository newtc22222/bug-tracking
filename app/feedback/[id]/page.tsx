"use client";

import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiTriagePanel from "@/components/ai-triage-panel";
import FeedbackNotesPanel from "@/components/feedback-notes-panel";
import {
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
  const [deleting, setDeleting] = useState(false);
  const [promotingGithub, setPromotingGithub] = useState(false);
  const [githubError, setGithubError] = useState("");
  const [notesRefreshSignal, setNotesRefreshSignal] = useState(0);
  const [error, setError] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save feedback.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this feedback item? This action cannot be undone.")) {
      return;
    }

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
      <main className="mx-auto w-full max-w-md px-4 py-14">
        <p className="text-sm text-slate-500">Loading feedback…</p>
      </main>
    );
  }

  if (!feedback) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-950">
          ← Back to projects
        </Link>
        <h1 className="mt-8 text-2xl font-semibold text-slate-950">Feedback unavailable</h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Link
        href={`/projects/${feedback.project.id}/feedback`}
        className="text-sm text-slate-500 hover:text-slate-950"
      >
        ← Back to feedback
      </Link>
      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-sm text-slate-500">{feedback.project.name}</span>
          <span className={sourceBadgeClass(feedback.source)}>
            {sourceLabels[feedback.source]}
          </span>
          {feedback.createdAt && (
            <span className="text-slate-400">
              {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Edit Feedback</h1>
      </div>

      <AiTriagePanel
        projectId={feedback.projectId}
        feedbackId={feedback.id}
        title={title}
        description={description}
        type={type}
        priority={priority}
        onApplySuggestions={(next) => {
          if (next.title !== undefined) setTitle(next.title);
          if (next.description !== undefined) setDescription(next.description);
          if (next.type !== undefined) setType(next.type);
          if (next.priority !== undefined) setPriority(next.priority);
        }}
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            className="mt-2 min-h-32 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add context, reproduction steps, or acceptance criteria"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Type
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            >
              {typeOptions.map((value) => (
                <option key={value} value={value}>
                  {typeLabels[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              required
            >
              {statusOptions.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Priority <span className="font-normal text-slate-400">(optional)</span>
          <select
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">No priority</option>
            {priorityOptions.map((value) => (
              <option key={value} value={value}>
                {priorityLabels[value]}
              </option>
            ))}
          </select>
        </label>

        {(feedback.reporterName || feedback.reporterEmail) && (
          <div className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Reporter</p>
            <p className="mt-1">
              {feedback.reporterName || "Unknown"}
              {feedback.reporterEmail ? ` · ${feedback.reporterEmail}` : ""}
            </p>
          </div>
        )}

        {(feedback.pageUrl || feedback.browserInfo || feedback.screenshotDataUrl) && (
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
            <p className="font-medium text-slate-800">Captured context</p>
            {feedback.pageUrl && (
              <p className="break-all">
                <span className="font-medium text-slate-700">Page:</span> {feedback.pageUrl}
              </p>
            )}
            {feedback.browserInfo && (
              <p className="break-words">
                <span className="font-medium text-slate-700">Browser:</span> {feedback.browserInfo}
              </p>
            )}
            {feedback.screenshotDataUrl && (
              <div>
                <p className="font-medium text-slate-700">Screenshot</p>
                <Image
                  src={feedback.screenshotDataUrl}
                  alt="Captured feedback screenshot"
                  width={800}
                  height={600}
                  unoptimized
                  className="mt-2 max-h-72 w-full rounded border border-slate-200 bg-white object-contain"
                />
              </div>
            )}
          </div>
        )}

        <div className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-800">GitHub Integration</span>
            {feedback.githubIssueUrl ? (
              <a
                href={feedback.githubIssueUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:underline"
              >
                GitHub Issue #{feedback.githubIssueNumber ?? "linked"} ↗
              </a>
            ) : (
              <button
                type="button"
                onClick={handlePromoteGithub}
                disabled={promotingGithub}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {promotingGithub ? "Creating issue…" : "Promote to GitHub Issue"}
              </button>
            )}
          </div>
          {githubError && (
            <p role="alert" className="mt-2 rounded bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
              {githubError}
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>

      <FeedbackNotesPanel feedbackId={feedback.id} refreshSignal={notesRefreshSignal} />
    </main>
  );
}
