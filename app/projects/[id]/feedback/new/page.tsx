"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiTriagePanel from "@/components/ai-triage-panel";
import { ArrowLeftIcon } from "@/components/ui-icons";

const feedbackTypes = [
  ["bug", "Bug"],
  ["improvement", "Improvement"],
  ["feature", "Feature"],
  ["question", "Question"],
] as const;

const priorities = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
] as const;

export default function NewFeedbackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/projects/${params.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          priority: priority || null,
          reporterName,
          reporterEmail,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to create feedback.");
      }

      router.push(`/projects/${params.id}/feedback`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create feedback.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/projects/${params.id}/feedback`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        <span>Back to feedback</span>
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New Feedback</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record an issue, idea, or question for this project.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-feedback-title" className="block text-sm font-medium text-slate-700">
                Title
              </label>
              <input
                id="new-feedback-title"
                className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Describe the feedback briefly"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="new-feedback-description"
                className="block text-sm font-medium text-slate-700"
              >
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="new-feedback-description"
                className="mt-1.5 min-h-36 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context, reproduction steps, or acceptance criteria"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="new-feedback-type"
                  className="block text-sm font-medium text-slate-700"
                >
                  Type
                </label>
                <select
                  id="new-feedback-type"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  required
                >
                  {feedbackTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="new-feedback-priority"
                  className="block text-sm font-medium text-slate-700"
                >
                  Priority <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <select
                  id="new-feedback-priority"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                >
                  <option value="">No priority</option>
                  {priorities.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-medium text-slate-700">Reporter details</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Optional details for feedback someone shared with you.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  aria-label="Reporter name"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={reporterName}
                  onChange={(event) => setReporterName(event.target.value)}
                  placeholder="Reporter name (optional)"
                />
                <input
                  type="email"
                  aria-label="Reporter email"
                  className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={reporterEmail}
                  onChange={(event) => setReporterEmail(event.target.value)}
                  placeholder="Reporter email (optional)"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <Link
                href={`/projects/${params.id}/feedback`}
                className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating…" : "Create Feedback"}
              </button>
            </div>
          </form>
        </section>

        <aside className="lg:sticky lg:top-20">
          <AiTriagePanel
            projectId={params.id}
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
        </aside>
      </div>
    </main>
  );
}
