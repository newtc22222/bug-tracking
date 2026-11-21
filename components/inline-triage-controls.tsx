"use client";

import type { FeedbackPriority, FeedbackStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
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
  const [error, setError] = useState("");

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
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select
          aria-label="Status"
          value={status}
          disabled={saving}
          onChange={(event) => updateField({ status: event.target.value as FeedbackStatus })}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-950 focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {statusLabels[option]}
            </option>
          ))}
        </select>

        <select
          aria-label="Priority"
          value={priority}
          disabled={saving}
          onChange={(event) =>
            updateField({
              priority: event.target.value ? (event.target.value as FeedbackPriority) : null,
            })
          }
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 outline-none transition focus:border-slate-950 focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">No priority</option>
          {priorityOptions.map((option) => (
            <option key={option} value={option}>
              {priorityLabels[option]}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
