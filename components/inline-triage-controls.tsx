"use client";

import type { FeedbackPriority, FeedbackStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui-icons";
import {
  priorityDotClass,
  priorityLabels,
  priorityOptions,
  statusLabels,
  statusOptions,
} from "@/lib/feedback-display";

type InlineTriageControlsProps = {
  feedbackId: string;
  initialStatus: FeedbackStatus;
  initialPriority: FeedbackPriority | null;
};

export default function InlineTriageControls({
  feedbackId,
  initialStatus,
  initialPriority,
}: InlineTriageControlsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<FeedbackStatus>(initialStatus);
  const [priority, setPriority] = useState<FeedbackPriority | "">(initialPriority || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  async function updateField(patch: {
    status?: FeedbackStatus;
    priority?: FeedbackPriority | null;
  }) {
    const previousStatus = status;
    const previousPriority = priority;

    if (patch.status !== undefined) {
      setStatus(patch.status);
    }
    if (patch.priority !== undefined) {
      setPriority(patch.priority || "");
    }

    setError("");
    setSaved(false);
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
    setSaving(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to update feedback.");
      }

      setSaved(true);
      savedTimerRef.current = window.setTimeout(() => setSaved(false), 1800);
      router.refresh();
    } catch (updateError) {
      setStatus(previousStatus);
      setPriority(previousPriority);
      setError(updateError instanceof Error ? updateError.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {saved && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          >
            <CheckIcon className="h-3 w-3" />
            <span>Saved</span>
          </span>
        )}

        <select
          aria-label="Status"
          value={status}
          disabled={saving}
          onChange={(event) => updateField({ status: event.target.value as FeedbackStatus })}
          className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {statusLabels[option]}
            </option>
          ))}
        </select>

        <div className="relative flex items-center">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-2 h-1.5 w-1.5 rounded-full ${priorityDotClass(
              priority ? (priority as FeedbackPriority) : null,
            )}`}
          />
          <select
            aria-label="Priority"
            value={priority}
            disabled={saving}
            onChange={(event) =>
              updateField({
                priority: event.target.value ? (event.target.value as FeedbackPriority) : null,
              })
            }
            className="h-7 rounded-md border border-slate-200 bg-white pr-2 pl-5 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">No priority</option>
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {priorityLabels[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
