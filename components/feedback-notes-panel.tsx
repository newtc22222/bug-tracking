"use client";

import type { FeedbackStatus } from "@prisma/client";
import { FormEvent, useEffect, useState } from "react";
import { statusLabels } from "@/lib/feedback-display";

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

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-semibold text-slate-950">Internal Notes &amp; Status History</h2>
      <p className="mt-1 text-xs text-slate-500">
        Private admin notes and automatic status transitions.
      </p>

      <form onSubmit={handleAddNote} className="mt-4 space-y-3">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add an internal triage note…"
          maxLength={5000}
          className="min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
        />
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding note…" : "Add Note"}
        </button>
      </form>

      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Loading notes and history…</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes ({notes.length})
            </h3>
            {notes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No internal notes yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{note.authorEmail}</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-slate-800">{note.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status History ({statusEvents.length})
            </h3>
            {statusEvents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">No status changes recorded yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
                {statusEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-600"
                  >
                    <span>
                      {ev.fromStatus ? `${statusLabels[ev.fromStatus]} → ` : ""}
                      <strong className="text-slate-900">{statusLabels[ev.toStatus]}</strong>
                      <span className="ml-2 text-slate-400">by {ev.actorEmail}</span>
                    </span>
                    <span className="text-slate-400">
                      {new Date(ev.createdAt).toLocaleString()}
                    </span>
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
