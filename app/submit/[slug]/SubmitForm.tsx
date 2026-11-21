"use client";

import { FormEvent, useState } from "react";

const feedbackTypes = [
  ["bug", "Bug"],
  ["improvement", "Improvement"],
  ["feature", "Feature request"],
  ["question", "Question"],
] as const;

export default function SubmitForm({ slug }: { slug: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`/api/submit/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          type,
          reporterName,
          reporterEmail,
          website,
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setSubmitted(true);
    } catch {
      setError("We couldn't send your feedback right now. Please try again in a moment.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">
          ✓
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-950">Thanks for the feedback</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your message has been received. The project team will review it soon.
        </p>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          What would you like to share?
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your feedback a short title"
            maxLength={200}
            required
            autoFocus
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Details <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            className="mt-2 min-h-36 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add any helpful context, steps to reproduce, or examples"
            maxLength={5000}
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {description.length}/5000
          </span>
        </label>

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

        <div className="border-t border-slate-200 pt-5">
          <p className="text-sm font-medium text-slate-700">About you</p>
          <p className="mt-1 text-xs text-slate-500">
            Optional. Share your details if you would like a response.
          </p>
          <div className="mt-4 space-y-4">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={reporterName}
              onChange={(event) => setReporterName(event.target.value)}
              placeholder="Your name (optional)"
              maxLength={200}
              autoComplete="name"
            />
            <input
              type="email"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
              placeholder="Your email (optional)"
              maxLength={320}
              autoComplete="email"
            />
          </div>
        </div>

        <label className="hidden" aria-hidden="true">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            name="website"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}
