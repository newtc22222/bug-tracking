"use client";

import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { FormEvent, useState } from "react";
import AiTriagePanel from "@/components/ai-triage-panel";
import MarkdownEditor from "@/components/markdown-editor";
import {
  priorityDisplayOrder,
  priorityLabels,
  statusLabels,
  typeLabels,
  typeOptions,
} from "@/lib/feedback-display";

type ProjectOption = {
  id: string;
  name: string;
  slug: string;
  keyPrefix?: string;
};

type FeedbackCreateFormProps = {
  projects: ProjectOption[];
  defaultProjectId?: string;
  lockProject?: boolean;
  initialPageUrl?: string;
  initialBrowserInfo?: string;
  initialSource?: "manual" | "extension";
  compactLayout?: boolean;
  onSuccess?: (created: { id: string; projectId: string; ticketKey?: string | null }) => void;
  onCancel?: () => void;
};

const initialStatusOptions: FeedbackStatus[] = ["open", "todo", "in_progress"];

export default function FeedbackCreateForm({
  projects,
  defaultProjectId,
  lockProject = false,
  initialPageUrl = "",
  initialBrowserInfo = "",
  initialSource = "manual",
  compactLayout = false,
  onSuccess,
  onCancel,
}: FeedbackCreateFormProps) {
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeedbackType>("bug");
  const [priority, setPriority] = useState<FeedbackPriority | "">("");
  const [status, setStatus] = useState<FeedbackStatus>("open");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [pageUrl, setPageUrl] = useState(initialPageUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) {
      setError("Please select a project first.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          priority: priority || null,
          status,
          source: initialSource,
          reporterName,
          reporterEmail,
          pageUrl: pageUrl.trim() || undefined,
          browserInfo: initialBrowserInfo || undefined,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | ({ id: string; projectId: string; ticketKey?: string | null } & { error?: string })
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "Unable to create ticket.");
      }

      onSuccess?.(body);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create ticket.");
      setLoading(false);
    }
  }

  return (
    <div
      className={
        compactLayout
          ? "space-y-5"
          : "grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start"
      }
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      >
        {!lockProject && (
          <div>
            <label htmlFor="cf-project" className="block text-xs font-medium text-slate-700">
              Project
            </label>
            <select
              id="cf-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            >
              {projects.length === 0 && <option value="">No projects available</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.keyPrefix ? `[${p.keyPrefix}] ` : ""}
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="cf-title" className="block text-xs font-medium text-slate-700">
            Title
          </label>
          <input
            id="cf-title"
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Concise summary of the bug or request…"
            required
            autoFocus
          />
        </div>

        {/* Triage Properties ordered strictly: Type > Priority > Status */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="cf-type" className="block text-xs font-medium text-slate-700">
              Type
            </label>
            <select
              id="cf-type"
              value={type}
              onChange={(e) => setType(e.target.value as FeedbackType)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            >
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {typeLabels[opt]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cf-priority" className="block text-xs font-medium text-slate-700">
              Priority
            </label>
            <select
              id="cf-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as FeedbackPriority | "")}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            >
              <option value="">No priority</option>
              {priorityDisplayOrder.map((opt) => (
                <option key={opt} value={opt}>
                  {priorityLabels[opt]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cf-status" className="block text-xs font-medium text-slate-700">
              Status
            </label>
            <select
              id="cf-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            >
              {initialStatusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {statusLabels[opt]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="cf-description" className="mb-1.5 block text-xs font-medium text-slate-700">
            Description <span className="font-normal text-slate-400">(Markdown / WYSIWYG)</span>
          </label>
          <MarkdownEditor
            id="cf-description"
            value={description}
            onChange={setDescription}
            placeholder="Describe reproduction steps, expected behavior, or context…"
            showBugTemplate
            minHeightClass="min-h-36"
          />
        </div>

        <details className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5">
          <summary className="cursor-pointer text-xs font-medium text-slate-600 select-none hover:text-slate-950">
            Reporter &amp; Page Context (optional)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Reporter name"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Reporter name"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-950 outline-none focus:border-slate-950"
            />
            <input
              type="email"
              aria-label="Reporter email"
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="Reporter email"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-950 outline-none focus:border-slate-950"
            />
            <input
              type="url"
              aria-label="Page URL"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://app.example.com/page"
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-950 outline-none focus:border-slate-950 sm:col-span-2"
            />
          </div>
        </details>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !projectId}
            className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Ticket"}
          </button>
        </div>
      </form>

      {projectId && (
        <aside className={compactLayout ? "" : "lg:sticky lg:top-6"}>
          <AiTriagePanel
            projectId={projectId}
            title={title}
            description={description}
            type={type}
            priority={priority}
            onApplySuggestions={(next) => {
              if (next.title !== undefined) setTitle(next.title);
              if (next.description !== undefined) setDescription(next.description);
              if (next.type !== undefined) setType(next.type as FeedbackType);
              if (next.priority !== undefined) setPriority(next.priority as FeedbackPriority | "");
            }}
          />
        </aside>
      )}
    </div>
  );
}
