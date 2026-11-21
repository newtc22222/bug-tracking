"use client";

import type { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";
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
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">AI Cleanup &amp; Duplicate Check</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Structure raw text, suggest type and priority, and check similar items in this project.
          </p>
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing || !title.trim()}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {analyzing ? "Analyzing…" : "Analyze with AI"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {hasChecked && analysis && (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                Provider: {analysis.provider}
              </span>
              {analysis.fallbackUsed && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700">
                  Fallback
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
              className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-slate-700"
            >
              Apply all
            </button>
          </div>

          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
            <p className="font-medium text-slate-900">{analysis.summary}</p>
            <p className="mt-1 text-slate-600">{analysis.reasoning}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-0.5 font-medium text-slate-800 ring-1 ring-slate-200">
                  Type: {typeLabels[analysis.suggestedType]}
                </span>
                <span className="rounded-full bg-white px-2.5 py-0.5 font-medium text-slate-800 ring-1 ring-slate-200">
                  Priority: {priorityLabels[analysis.suggestedPriority]}
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
                Apply type &amp; priority
              </button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">Cleaned title &amp; description</span>
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
                Apply cleaned text
              </button>
            </div>
            <p className="mt-2 font-medium text-slate-950">{analysis.cleanedTitle}</p>
            <pre className="mt-1.5 whitespace-pre-wrap font-sans text-slate-600">
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
              <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
                {duplicates.map((dup) => (
                  <li key={dup.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <Link
                      href={`/feedback/${dup.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-slate-900 hover:underline"
                    >
                      {dup.title}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-slate-500">
                        {Math.round(dup.similarity * 100)}% match
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
