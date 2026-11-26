"use client";

import type { FeedbackStatus } from "@prisma/client";
import { FormEvent, useEffect, useState } from "react";
import { ClockIcon } from "@/components/ui-icons";
import { statusBadgeClass, statusLabels } from "@/lib/feedback-display";

type FeedbackNote = {
  id: string;
  authorEmail: string;
  body: string;
  createdAt: string;
};

type FeedbackStatusEvent = {
  id: string;
  fromStatus: FeedbackStatus | null;
  toStatus: FeedbackStatus;
  actorEmail: string;
  createdAt: string;
};

type FeedbackNotesPanelProps = {
  feedbackId: string;
  refreshSignal?: number;
};

type TimelineEntry =
  | { kind: "note"; id: string; createdAt: string; note: FeedbackNote }
  | { kind: "status"; id: string; createdAt: string; event: FeedbackStatusEvent };

export default function FeedbackNotesPanel({
  feedbackId,
  refreshSignal = 0,
}: FeedbackNotesPanelProps) {
  const [notes, setNotes] = useState<FeedbackNote[]>([]);
  const [statusEvents, setStatusEvents] = useState<FeedbackStatusEvent[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await fetch(`/api/feedback/${feedbackId}/notes`);
        const json = (await response.json().catch(() => null)) as {
          notes?: FeedbackNote[];
          statusEvents?: FeedbackStatusEvent[];
          error?: string;
        } | null;

        if (!response.ok || !json) {
          throw new Error(json?.error || "Unable to load notes and status history.");
        }

        if (active) {
          setNotes(json.notes || []);
          setStatusEvents(json.statusEvents || []);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load notes and status history.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [feedbackId, refreshSignal]);

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`/api/feedback/${feedbackId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const created = (await response.json().catch(() => null)) as
        | (FeedbackNote & { error?: string })
        | null;

      if (!response.ok || !created) {
        throw new Error(created?.error || "Unable to add internal note.");
      }

      setNotes((prev) => [created, ...prev]);
      setBody("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add note.");
    } finally {
      setSubmitting(false);
    }
  }

  const timeline: TimelineEntry[] = [
    ...notes.map((note) => ({
      kind: "note" as const,
      id: `note-${note.id}`,
      createdAt: note.createdAt,
      note,
    })),
    ...statusEvents.map((ev) => ({
      kind: "status" as const,
      id: `status-${ev.id}`,
      createdAt: ev.createdAt,
      event: ev,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Activity &amp; Internal Notes</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Private admin triage notes and automatic status transitions.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {notes.length} {notes.length === 1 ? "note" : "notes"} · {statusEvents.length}{" "}
          {statusEvents.length === 1 ? "change" : "changes"}
        </span>
      </div>

      <form onSubmit={handleAddNote} className="mt-4 space-y-2.5">
        <label htmlFor="internal-note-body" className="sr-only">
          Internal triage note
        </label>
        <textarea
          id="internal-note-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add an internal triage note…"
          maxLength={5000}
          className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-slate-50/40 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-2 focus:ring-slate-950/10"
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="h-8 rounded-md bg-slate-950 px-3.5 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Adding note…" : "Add Note"}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5">
        {loading ? (
          <div className="space-y-3" aria-label="Loading activity timeline">
            <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-xs text-slate-500">No internal notes or status changes recorded yet.</p>
        ) : (
          <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {timeline.map((entry) =>
              entry.kind === "note" ? (
                <li key={entry.id} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-2.5 -left-[25px] h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-900 ring-1 ring-slate-300"
                  />
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-slate-800">{entry.note.authorEmail}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(entry.note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {entry.note.body}
                    </p>
                  </div>
                </li>
              ) : (
                <li key={entry.id} className="relative flex flex-wrap items-center justify-between gap-2 py-0.5 text-xs">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[24px] flex h-2 w-2 items-center justify-center rounded-full bg-slate-300 ring-2 ring-white"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
                    <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {entry.event.fromStatus ? (
                        <>
                          <span className="text-slate-500">
                            {statusLabels[entry.event.fromStatus]}
                          </span>
                          <span className="mx-1 text-slate-400">→</span>
                        </>
                      ) : (
                        <span className="mr-1 text-slate-500">Status set to</span>
                      )}
                    </span>
                    <span className={statusBadgeClass(entry.event.toStatus)}>
                      {statusLabels[entry.event.toStatus]}
                    </span>
                    <span className="text-slate-400">by {entry.event.actorEmail}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">
                    {new Date(entry.event.createdAt).toLocaleString()}
                  </span>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </section>
  );
}
