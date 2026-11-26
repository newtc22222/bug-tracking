"use client";

import type { FeedbackStatus } from "@prisma/client";
import { FormEvent, useEffect, useState } from "react";
import { LinkChainIcon, PlusIcon, SearchIcon, XIcon } from "@/components/ui-icons";
import { priorityDotClass, statusBadgeClass, statusLabels } from "@/lib/feedback-display";
import {
  linkDirectionBadgeClass,
  linkDirectionLabels,
  linkDirectionOptions,
  type LinkDirection,
  type ResolvedTicketLink,
} from "@/lib/ticket-links";

type SearchCandidate = {
  id: string;
  ticketKey: string | null;
  title: string;
  status: FeedbackStatus;
  project?: { id: string; name: string; slug: string };
};

type TicketLinksPanelProps = {
  feedbackId: string;
  currentStatus: FeedbackStatus;
  refreshSignal?: number;
  onOpenTicket?: (ticketId: string) => void;
  onSuggestBlocked?: () => void;
};

export default function TicketLinksPanel({
  feedbackId,
  currentStatus,
  refreshSignal = 0,
  onOpenTicket,
  onSuggestBlocked,
}: TicketLinksPanelProps) {
  const [links, setLinks] = useState<ResolvedTicketLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [direction, setDirection] = useState<LinkDirection>("is_blocked_by");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<SearchCandidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showBlockedHint, setShowBlockedHint] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch(`/api/feedback/${feedbackId}/links`);
        const json = (await res.json().catch(() => null)) as { links?: ResolvedTicketLink[] } | null;
        if (active && res.ok && json?.links) {
          setLinks(json.links);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [feedbackId, refreshSignal]);

  useEffect(() => {
    if (!showAdd) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ pageSize: "10" });
        if (query.trim()) params.set("q", query.trim());
        const res = await fetch(`/api/feedback?${params.toString()}`);
        const json = (await res.json().catch(() => null)) as { items?: SearchCandidate[] } | null;
        if (active && res.ok && json?.items) {
          setResults(json.items.filter((item) => item.id !== feedbackId));
        }
      } finally {
        if (active) setSearching(false);
      }
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [showAdd, query, feedbackId]);

  async function handleAddLink(event: FormEvent) {
    event.preventDefault();
    if (!selectedTarget) return;

    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: selectedTarget.id, direction }),
      });
      const created = (await res.json().catch(() => null)) as
        | (ResolvedTicketLink & { error?: string })
        | null;
      if (!res.ok || !created) {
        throw new Error(created?.error || "Unable to link ticket.");
      }

      setLinks((prev) => [created, ...prev]);
      setSelectedTarget(null);
      setQuery("");
      setShowAdd(false);

      if (
        direction === "is_blocked_by" &&
        currentStatus !== "blocked" &&
        created.related.status !== "resolved" &&
        created.related.status !== "closed"
      ) {
        setShowBlockedHint(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to link ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveLink(linkId: string) {
    setError("");
    const res = await fetch(
      `/api/feedback/${feedbackId}/links?linkId=${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-950">
          <LinkChainIcon className="h-4 w-4 text-slate-600" />
          <span>Linked Tickets</span>
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600 tabular-nums">
            {links.length}
          </span>
        </h2>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
        >
          <PlusIcon className="h-3 w-3" />
          <span>{showAdd ? "Close" : "Link ticket"}</span>
        </button>
      </div>

      {showBlockedHint && onSuggestBlocked && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span>This ticket is blocked by an unresolved issue.</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowBlockedHint(false);
                onSuggestBlocked();
              }}
              className="rounded bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-700"
            >
              Set status to Blocked
            </button>
            <button
              type="button"
              onClick={() => setShowBlockedHint(false)}
              className="text-rose-600 hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleAddLink}
          className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
        >
          <div className="grid gap-2.5 sm:grid-cols-[170px_1fr]">
            <div>
              <label htmlFor="link-direction" className="block text-[11px] font-medium text-slate-600">
                Relation
              </label>
              <select
                id="link-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as LinkDirection)}
                className="mt-1 h-8.5 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-950"
              >
                {linkDirectionOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {linkDirectionLabels[opt]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="link-search" className="block text-[11px] font-medium text-slate-600">
                Target Ticket
              </label>
              <div className="relative mt-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="link-search"
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedTarget(null);
                  }}
                  placeholder="Search by key (WEB-12) or title…"
                  className="h-8.5 w-full rounded-md border border-slate-300 bg-white pr-2.5 pl-8 text-xs text-slate-950 outline-none focus:border-slate-950"
                />
              </div>
            </div>
          </div>

          {selectedTarget ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-900/20 bg-white px-3 py-2 text-xs">
              <div className="min-w-0">
                <span className="font-mono font-semibold text-slate-700">
                  {selectedTarget.ticketKey || selectedTarget.id.slice(0, 8)}
                </span>{" "}
                <span className="text-slate-900">{selectedTarget.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTarget(null)}
                className="text-slate-400 hover:text-slate-800"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="bt-scroller max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white">
              {searching ? (
                <p className="px-3 py-2 text-xs text-slate-500">Searching tickets…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">No matching tickets found.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTarget(item)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-50"
                      >
                        <span className="min-w-0 truncate">
                          <span className="mr-1.5 font-mono text-[11px] font-semibold text-slate-500">
                            {item.ticketKey || item.id.slice(0, 8)}
                          </span>
                          <span className="text-slate-900">{item.title}</span>
                        </span>
                        <span className={`shrink-0 ${statusBadgeClass(item.status)}`}>
                          {statusLabels[item.status]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !selectedTarget}
              className="h-8 rounded-md bg-slate-950 px-3 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Linking…" : "Add Link"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-3">
        {loading ? (
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        ) : links.length === 0 ? (
          <p className="text-xs text-slate-500">
            No linked tickets yet. Track dependencies like blocked-by, caused-by, or duplicates.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200/80">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-slate-50/70"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${linkDirectionBadgeClass(link.direction)}`}
                  >
                    {link.label}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityDotClass(link.related.priority)}`}
                  />
                  <button
                    type="button"
                    onClick={() => onOpenTicket?.(link.related.id)}
                    className="min-w-0 truncate text-left font-medium text-slate-900 hover:underline underline-offset-2"
                  >
                    <span className="mr-1.5 font-mono text-[11px] text-slate-500">
                      {link.related.ticketKey || link.related.id.slice(0, 8)}
                    </span>
                    {link.related.title}
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className={statusBadgeClass(link.related.status)}>
                    {statusLabels[link.related.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    aria-label="Remove ticket link"
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
