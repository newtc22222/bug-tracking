"use client";

import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
import { SparklesIcon } from "@/components/ui-icons";
import {
  priorityLabels,
  statusBadgeClass,
  statusLabels,
  typeLabels,
} from "@/lib/feedback-display";

type AiAnalysis = {
  cleanedTitle: string;
  structuredDescription: string;
  suggestedType: FeedbackType;
  suggestedPriority: FeedbackPriority;
  summary: string;
  reasoning: string;
  provider: "openai" | "gemini" | "heuristic";
  fallbackUsed: boolean;
};

type DuplicateCandidate = {
  id: string;
  title: string;
  status: FeedbackStatus;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  similarity: number;
  createdAt: string;
};

type AiTriagePanelProps = {
  projectId: string;
  feedbackId?: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  onApplySuggestions: (next: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
  }) => void;
};

export default function AiTriagePanel({
  projectId,
  feedbackId,
  title,
  description,
  type,
  priority,
  onApplySuggestions,
}: AiTriagePanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [hasChecked, setHasChecked] = useState(false);

  async function runAnalysis() {
    if (!title.trim()) {
      setError("Enter a title before running AI triage.");
      return;
    }

    setError("");
    setAnalyzing(true);

    try {
      const response = await fetch("/api/feedback/ai-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          feedbackId,
          title,
          description,
          type,
          priority,
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        analysis?: AiAnalysis;
        duplicates?: DuplicateCandidate[];
        error?: string;
      } | null;

      if (!response.ok || !body?.analysis) {
        throw new Error(body?.error || "Unable to analyze feedback.");
      }

      setAnalysis(body.analysis);
      setDuplicates(body.duplicates || []);
      setHasChecked(true);
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error ? analyzeError.message : "Unable to analyze feedback.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" />
          <div>
            <h2 className="text-sm font-semibold text-slate-950">AI Triage &amp; Duplicates</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Clean up raw text, suggest fields, and check for similar items.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={runAnalysis}
        disabled={analyzing || !title.trim()}
        className="mt-3.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SparklesIcon className="h-3.5 w-3.5" />
        <span>{analyzing ? "Analyzing…" : hasChecked ? "Re-run AI Analysis" : "Analyze with AI"}</span>
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {hasChecked && analysis && (
        <div className="mt-4 space-y-3.5 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                {analysis.provider}
              </span>
              {analysis.fallbackUsed && (
                <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  fallback
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                onApplySuggestions({
                  title: analysis.cleanedTitle,
                  description: analysis.structuredDescription,
                  type: analysis.suggestedType,
                  priority: analysis.suggestedPriority,
                })
              }
              className="h-7 rounded-md bg-slate-950 px-2.5 text-xs font-medium text-white transition hover:bg-slate-800"
            >
              Apply all
            </button>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs text-slate-700">
            <p className="font-medium text-slate-900">{analysis.summary}</p>
            <p className="mt-1 leading-relaxed text-slate-600">{analysis.reasoning}</p>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-inset ring-slate-200">
                  {typeLabels[analysis.suggestedType]}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 ring-1 ring-inset ring-slate-200">
                  {priorityLabels[analysis.suggestedPriority]}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onApplySuggestions({
                    type: analysis.suggestedType,
                    priority: analysis.suggestedPriority,
                  })
                }
                className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
              >
                Apply fields
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-white p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">Cleaned text</span>
              <button
                type="button"
                onClick={() =>
                  onApplySuggestions({
                    title: analysis.cleanedTitle,
                    description: analysis.structuredDescription,
                  })
                }
                className="font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
              >
                Apply text
              </button>
            </div>
            <p className="mt-2 font-medium text-slate-950">{analysis.cleanedTitle}</p>
            <pre className="mt-1 whitespace-pre-wrap font-sans leading-relaxed text-slate-600">
              {analysis.structuredDescription}
            </pre>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-800">
              Potential duplicates ({duplicates.length})
            </p>
            {duplicates.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No close matches found among recent items in this project.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200/80 rounded-lg border border-slate-200/80 bg-slate-50/40">
                {duplicates.map((dup) => (
                  <li
                    key={dup.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <Link
                      href={`/feedback/${dup.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:underline underline-offset-2"
                    >
                      {dup.title}
                    </Link>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {Math.round(dup.similarity * 100)}%
                      </span>
                      <span className={statusBadgeClass(dup.status)}>
                        {statusLabels[dup.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
