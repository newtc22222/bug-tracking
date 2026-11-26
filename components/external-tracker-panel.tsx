"use client";

import type { TrackerPlatform } from "@prisma/client";
import { FormEvent, useState } from "react";
import { ExternalLinkIcon, GitBranchIcon, RefreshIcon, XIcon } from "@/components/ui-icons";
import { trackerPlatformLabels, trackerPlatformOptions } from "@/lib/feedback-display";

export type ExternalLinkItem = {
  id: string;
  provider: TrackerPlatform;
  externalId: string;
  externalKey: string;
  externalUrl: string;
  externalStatus: string | null;
  lastSyncedAt: string;
};

type ExternalTrackerPanelProps = {
  feedbackId: string;
  projectTrackerPlatform: TrackerPlatform;
  initialLinks: ExternalLinkItem[];
};

export default function ExternalTrackerPanel({
  feedbackId,
  projectTrackerPlatform,
  initialLinks,
}: ExternalTrackerPanelProps) {
  const [links, setLinks] = useState<ExternalLinkItem[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualProvider, setManualProvider] = useState<TrackerPlatform>(
    projectTrackerPlatform !== "none" ? projectTrackerPlatform : "github_issues",
  );
  const [manualKey, setManualKey] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [error, setError] = useState("");

  async function handlePromote() {
    setError("");
    setCreating(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: projectTrackerPlatform }),
      });
      const data = (await res.json().catch(() => null)) as {
        link?: ExternalLinkItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.link) {
        throw new Error(data?.error || "Unable to promote issue.");
      }
      setLinks((prev) => [data.link!, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to promote issue.");
    } finally {
      setCreating(false);
    }
  }

  async function handleManualLink(event: FormEvent) {
    event.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          provider: manualProvider,
          externalKey: manualKey,
          externalUrl: manualUrl,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        link?: ExternalLinkItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.link) {
        throw new Error(data?.error || "Unable to link external issue.");
      }
      setLinks((prev) => [data.link!, ...prev]);
      setManualKey("");
      setManualUrl("");
      setShowManual(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to link external issue.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSync(linkId: string) {
    setError("");
    setSyncingId(linkId);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/tracker`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      const data = (await res.json().catch(() => null)) as {
        link?: ExternalLinkItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.link) {
        throw new Error(data?.error || "Unable to sync external status.");
      }
      setLinks((prev) => prev.map((l) => (l.id === linkId ? data.link! : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sync status.");
    } finally {
      setSyncingId(null);
    }
  }

  async function handleUnlink(linkId: string) {
    const res = await fetch(
      `/api/feedback/${feedbackId}/tracker?linkId=${encodeURIComponent(linkId)}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    }
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <GitBranchIcon className="h-3.5 w-3.5 text-slate-700" />
          <span>External Trackers</span>
        </h2>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-[11px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-950"
        >
          {showManual ? "Hide" : "+ Link URL"}
        </button>
      </div>

      {links.length > 0 && (
        <ul className="mt-3 space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-2.5 py-2 text-xs"
            >
              <div className="min-w-0">
                <a
                  href={link.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-900 hover:underline"
                >
                  <span className="truncate">{trackerPlatformLabels[link.provider]}</span>
                  <span className="font-mono font-semibold">{link.externalKey}</span>
                  <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                </a>
                {link.externalStatus && (
                  <p className="mt-0.5 font-mono text-[10px] uppercase text-emerald-700">
                    Status: {link.externalStatus}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSync(link.id)}
                  disabled={syncingId === link.id}
                  title="Sync status from tracker API"
                  className="rounded p-1 text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RefreshIcon className={`h-3.5 w-3.5 ${syncingId === link.id ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleUnlink(link.id)}
                  title="Unlink"
                  className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-red-600"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {projectTrackerPlatform !== "none" ? (
        <button
          type="button"
          onClick={handlePromote}
          disabled={creating}
          className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:opacity-60"
        >
          <GitBranchIcon className="h-3.5 w-3.5" />
          <span>
            {creating
              ? "Creating external issue…"
              : `Promote to ${trackerPlatformLabels[projectTrackerPlatform]}`}
          </span>
        </button>
      ) : (
        <p className="mt-2.5 text-xs text-slate-500">
          No default tracker configured on this project. Configure one in Project Settings or link an
          external URL manually.
        </p>
      )}

      {showManual && (
        <form onSubmit={handleManualLink} className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <select
            value={manualProvider}
            onChange={(e) => setManualProvider(e.target.value as TrackerPlatform)}
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
          >
            {trackerPlatformOptions
              .filter((p) => p !== "none")
              .map((p) => (
                <option key={p} value={p}>
                  {trackerPlatformLabels[p]}
                </option>
              ))}
          </select>
          <input
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="Issue key (e.g. #42 or ENG-123)"
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs"
          />
          <input
            type="url"
            required
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://linear.app/..."
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2.5 font-mono text-xs"
          />
          <button
            type="submit"
            disabled={creating}
            className="h-8 w-full rounded-md bg-slate-950 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Save Link
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
