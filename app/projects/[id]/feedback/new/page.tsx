"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AiTriagePanel from "@/components/ai-triage-panel";

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
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Link
        href={`/projects/${params.id}/feedback`}
        className="text-sm text-slate-500 hover:text-slate-950"
      >
        ← Back to feedback
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">New Feedback</h1>
      <p className="mt-2 text-sm text-slate-500">Record an issue, idea, or question for this project.</p>

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

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Title
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Describe the feedback briefly"
            required
            autoFocus
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
              {feedbackTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Priority <span className="font-normal text-slate-400">(optional)</span>
            <select
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
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
          </label>
        </div>

        <div className="border-t border-slate-200 pt-5">
          <p className="text-sm font-medium text-slate-700">Reporter details</p>
          <p className="mt-1 text-xs text-slate-500">Optional details for feedback someone shared with you.</p>
          <div className="mt-4 space-y-4">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={reporterName}
              onChange={(event) => setReporterName(event.target.value)}
              placeholder="Reporter name (optional)"
            />
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
              placeholder="Reporter email (optional)"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create Feedback"}
        </button>
      </form>
    </main>
  );
}
