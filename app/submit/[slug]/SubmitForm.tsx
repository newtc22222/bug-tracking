"use client";

import type { FeedbackType } from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { CheckIcon, FeedbackTypeIcon } from "@/components/ui-icons";
import { typeAccentClass } from "@/lib/feedback-display";

const feedbackTypeCards: {
  value: FeedbackType;
  label: string;
  hint: string;
}[] = [
  { value: "bug", label: "Bug", hint: "Something is broken" },
  { value: "improvement", label: "Improvement", hint: "Make existing better" },
  { value: "feature", label: "Feature", hint: "New capability idea" },
  { value: "question", label: "Question", hint: "Need clarification" },
];

export default function SubmitForm({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const initialPageUrl = searchParams.get("pageUrl") || "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FeedbackType>("bug");
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
          ...(initialPageUrl ? { pageUrl: initialPageUrl } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error("Submission failed");
      }

      setSubmitted(true);
    } catch {
      setError("We couldn't send your feedback right now. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setTitle("");
    setDescription("");
    setType("bug");
    setReporterName("");
    setReporterEmail("");
    setWebsite("");
    setError("");
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <section
        role="status"
        aria-live="polite"
        className="rounded-xl border border-emerald-200/80 bg-white p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-10"
      >
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          <CheckIcon className="h-5 w-5" />
        </div>
        <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">
          Thanks for the feedback
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your message has been received. The project team will review it soon.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-6 inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
        >
          Submit another
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05)] sm:p-8"
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {feedbackTypeCards.map((option) => {
              const selected = type === option.value;
              const inputId = `feedback-type-${option.value}`;
              return (
                <label
                  key={option.value}
                  htmlFor={inputId}
                  className={`relative flex cursor-pointer flex-col rounded-lg border p-3 text-left transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-950 has-[:focus-visible]:ring-offset-1 ${
                    selected
                      ? "border-slate-950 bg-slate-950/[0.03] shadow-2xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                  }`}
                >
                  <input
                    id={inputId}
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={selected}
                    onChange={() => setType(option.value)}
                    className="sr-only"
                  />
                  <span className={typeAccentClass(option.value)}>
                    <FeedbackTypeIcon type={option.value} className="h-4 w-4" />
                  </span>
                  <span className="mt-2 text-xs font-semibold text-slate-950">{option.label}</span>
                  <span className="mt-0.5 text-[11px] leading-tight text-slate-500">
                    {option.hint}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="submit-title" className="block text-sm font-medium text-slate-700">
            What would you like to share?
          </label>
          <input
            id="submit-title"
            name="title"
            className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your feedback a short title"
            maxLength={200}
            required
            autoFocus
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="submit-description"
              className="block text-sm font-medium text-slate-700"
            >
              Details <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {description.length}/5000
            </span>
          </div>
          <textarea
            id="submit-description"
            name="description"
            className="mt-1.5 min-h-36 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add any helpful context, steps to reproduce, or examples"
            maxLength={5000}
          />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="text-sm font-medium text-slate-700">About you</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Optional. Share your details if you would like a response.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              aria-label="Your name"
              name="reporterName"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={reporterName}
              onChange={(event) => setReporterName(event.target.value)}
              placeholder="Your name (optional)"
              maxLength={200}
              autoComplete="name"
            />
            <input
              type="email"
              aria-label="Your email"
              name="reporterEmail"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={reporterEmail}
              onChange={(event) => setReporterEmail(event.target.value)}
              placeholder="Your email (optional)"
              maxLength={320}
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
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
          className="h-10 w-full rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  );
}
