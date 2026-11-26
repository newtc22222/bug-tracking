"use client";

import { useState } from "react";
import MarkdownView from "@/components/markdown-view";
import { BotIcon, CheckIcon, CopyIcon } from "@/components/ui-icons";
import type { AiInvestigateResult } from "@/lib/ai-investigate";

type AiInvestigatePanelProps = {
  feedbackId: string;
  onSavedToNotes?: () => void;
};

export default function AiInvestigatePanel({
  feedbackId,
  onSavedToNotes,
}: AiInvestigatePanelProps) {
  const [loading, setLoading] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [result, setResult] = useState<AiInvestigateResult | null>(null);
  const [error, setError] = useState("");

  async function runInvestigation() {
    setError("");
    setSavedNote(false);
    setLoading(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/investigate`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        investigation?: AiInvestigateResult;
        error?: string;
      } | null;
      if (!res.ok || !data?.investigation) {
        throw new Error(data?.error || "Unable to investigate ticket.");
      }
      setResult(data.investigation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Investigation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPrompt() {
    if (!result?.agentPrompt) return;
    await navigator.clipboard.writeText(result.agentPrompt);
    setCopiedPrompt(true);
    window.setTimeout(() => setCopiedPrompt(false), 2000);
  }

  async function saveToNotes() {
    if (!result) return;
    setSavingNote(true);
    setError("");
    try {
      const noteMarkdown = [
        `### AI Investigation (${result.provider})`,
        "",
        "**Root Cause Hypotheses:**",
        ...result.rootCauseHypotheses.map(
          (h) => `- **${h.title}** (${h.likelihood}): ${h.explanation}`,
        ),
        "",
        "**Checklist:**",
        ...result.investigationChecklist.map((item) => `- [ ] ${item}`),
        "",
        result.suggestedSolution,
      ].join("\n");

      const res = await fetch(`/api/feedback/${feedbackId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteMarkdown }),
      });
      if (!res.ok) throw new Error("Failed to save investigation note.");
      setSavedNote(true);
      onSavedToNotes?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-2">
        <BotIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
        <div>
          <h2 className="text-sm font-semibold text-slate-950">AI Investigate &amp; Fix Prompt</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            Analyze root causes, inspect screenshot context, and generate a coding-agent fix prompt.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={runInvestigation}
        disabled={loading}
        className="mt-3.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800 disabled:opacity-50"
      >
        <BotIcon className="h-3.5 w-3.5" />
        <span>
          {loading ? "Investigating…" : result ? "Re-run AI Investigation" : "Investigate & Suggest Fix"}
        </span>
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                {result.provider}
              </span>
              {result.fallbackUsed && (
                <span className="rounded bg-amber-50 px-2 py-0.5 font-mono text-[11px] text-amber-700">
                  fallback
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={saveToNotes}
              disabled={savingNote || savedNote}
              className="font-medium text-slate-700 underline underline-offset-2 hover:text-slate-950 disabled:opacity-50"
            >
              {savedNote ? "Saved to notes ✓" : savingNote ? "Saving…" : "Save to notes"}
            </button>
          </div>

          <div>
            <p className="font-semibold text-slate-800">Likely Root Causes</p>
            <ul className="mt-2 space-y-2">
              {result.rootCauseHypotheses.map((h, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{h.title}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                        h.likelihood === "high"
                          ? "bg-rose-100 text-rose-700"
                          : h.likelihood === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {h.likelihood}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-600">{h.explanation}</p>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-semibold text-slate-800">Verification Checklist</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-slate-600">
              {result.investigationChecklist.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200/80 bg-white p-3">
            <MarkdownView content={result.suggestedSolution} className="text-xs" />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-3 text-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-medium text-slate-300">
                Coding Agent Fix Prompt
              </span>
              <button
                type="button"
                onClick={copyPrompt}
                className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-white/20"
              >
                {copiedPrompt ? (
                  <>
                    <CheckIcon className="h-3 w-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-3 w-3" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bt-scroller mt-2 max-h-44 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
              {result.agentPrompt}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
