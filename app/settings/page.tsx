"use client";

import type {
  LayoutWidth,
  PresentationMode,
  ThemeAccent,
  ThemeMode,
  TicketViewMode,
} from "@prisma/client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import PageContainer from "@/components/page-container";
import { BookOpenIcon, CheckIcon, PlusIcon, SparklesIcon, XIcon } from "@/components/ui-icons";
import WorkflowGraph from "@/components/workflow-graph";
import { useWorkspace, type WorkspaceLabelItem } from "@/components/workspace-provider";
import {
  labelBadgeClass,
  labelColorOptions,
  labelDotClass,
  layoutWidthLabels,
  layoutWidthOptions,
  presentationModeLabels,
  presentationModeOptions,
  themeAccentLabels,
  themeAccentOptions,
  themeModeLabels,
  themeModeOptions,
  ticketViewModeLabels,
  ticketViewModeOptions,
} from "@/lib/feedback-display";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/version";

const ACCENT_SWATCH: Record<ThemeAccent, string> = {
  slate: "bg-slate-900",
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-600",
  rose: "bg-rose-600",
};

export default function SettingsPage() {
  const { settings, labels, updateSettings, refreshLabels, startTour } = useWorkspace();
  const [savedNotice, setSavedNotice] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("indigo");

  async function applySetting(patch: Parameters<typeof updateSettings>[0]) {
    setSavedNotice(false);
    await updateSettings(patch);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2000);
  }

  async function handleCreateLabel(event: FormEvent) {
    event.preventDefault();
    if (!newLabelName.trim()) return;
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
    });
    const json = (await res.json().catch(() => null)) as { label?: WorkspaceLabelItem } | null;
    if (res.ok && json?.label) {
      refreshLabels([...labels, json.label]);
      setNewLabelName("");
    }
  }

  async function handleDeleteLabel(id: string) {
    const res = await fetch(`/api/labels?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      refreshLabels(labels.filter((l) => l.id !== id));
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Workspace Settings
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {APP_VERSION_LABEL} · {APP_RELEASE_NAME}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Configure themes, layout width, ticket list views, presentation modes, and workspace
            labels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startTour("workspace")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            <span>Replay Tour</span>
          </button>
          <Link
            href="/guide"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <BookOpenIcon className="h-3.5 w-3.5" />
            <span>Open Wiki &amp; Guide</span>
          </Link>
        </div>
      </div>

      {savedNotice && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800"
        >
          <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
          <span>Settings saved &amp; applied immediately.</span>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Appearance: Dark Mode & Multi-Theme Accents */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Appearance &amp; Themes</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Switch between Light, Dark, or System color schemes and pick a workspace accent theme.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">Color Scheme</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {themeModeOptions.map((mode: ThemeMode) => {
                const active = settings.themeMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => void applySetting({ themeMode: mode })}
                    className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {themeModeLabels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">Accent Theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {themeAccentOptions.map((accent: ThemeAccent) => {
                const active = settings.themeAccent === accent;
                return (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => void applySetting({ themeAccent: accent })}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-full ring-1 ring-white/50 ${ACCENT_SWATCH[accent]}`}
                    />
                    <span className="truncate">{themeAccentLabels[accent]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-700">Page Content Width</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Defaults to 100% full width. Switch to Wide or Narrow for centered layouts.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {layoutWidthOptions.map((width: LayoutWidth) => {
                const active = settings.layoutWidth === width;
                return (
                  <button
                    key={width}
                    type="button"
                    onClick={() => void applySetting({ layoutWidth: width })}
                    className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {layoutWidthLabels[width]}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Presentation Modes & Views */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Views &amp; Surface Modes</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Control default list views and whether forms/reviews open as Page, Modal, or Drawer.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700">Default Ticket View</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ticketViewModeOptions.map((mode: TicketViewMode) => {
                const active = settings.defaultTicketView === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => void applySetting({ defaultTicketView: mode })}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                      active
                        ? "border-slate-950 bg-slate-950 text-white shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {ticketViewModeLabels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          <ModePicker
            title="Review Ticket"
            description="Default: Drawer (URL-synced with J/K rapid stepping)."
            value={settings.ticketReviewMode}
            onChange={(mode) => void applySetting({ ticketReviewMode: mode })}
          />

          <ModePicker
            title="Add New Feedback / Ticket"
            description="Default: Modal. Full Page URL always remains accessible for the extension."
            value={settings.newFeedbackMode}
            onChange={(mode) => void applySetting({ newFeedbackMode: mode })}
          />

          <ModePicker
            title="Add New Project"
            description="Default: Full Page."
            value={settings.newProjectMode}
            onChange={(mode) => void applySetting({ newProjectMode: mode })}
          />
        </section>
      </div>

      {/* Labels Manager & About / Version */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-950">Workspace Labels</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Lightweight colored tags available across Inbox, Projects, and Bulk Actions.
          </p>

          <form onSubmit={(e) => void handleCreateLabel(e)} className="mt-4 flex flex-wrap gap-2">
            <input
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="New label name (e.g. regression, auth)…"
              className="h-9 min-w-[200px] flex-1 rounded-md border border-slate-300 bg-white px-3 text-xs"
            />
            <select
              value={newLabelColor}
              onChange={(e) => setNewLabelColor(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs"
            >
              {labelColorOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-950 px-3.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Add Label</span>
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {labels.length === 0 ? (
              <p className="text-xs text-slate-500">No labels created yet.</p>
            ) : (
              labels.map((lbl) => (
                <span key={lbl.id} className={labelBadgeClass(lbl.color)}>
                  <span className={`h-1.5 w-1.5 rounded-full ${labelDotClass(lbl.color)}`} />
                  <span>{lbl.name}</span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteLabel(lbl.id)}
                    aria-label={`Delete label ${lbl.name}`}
                    className="ml-0.5 rounded hover:text-red-600"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-950">About &amp; Version</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Application</dt>
              <dd className="font-semibold text-slate-900">Bug Tracking</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Version</dt>
              <dd className="font-mono font-semibold text-slate-900">{APP_VERSION_LABEL}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Release</dt>
              <dd className="text-slate-700">{APP_RELEASE_NAME}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Workflow Engine</dt>
              <dd className="font-mono text-slate-700">Strict 6-State</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">MCP Endpoint</dt>
              <dd className="font-mono text-slate-700">/api/mcp</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Strict Workflow Reference */}
      <section className="mt-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Strict Ticket Workflow Graph</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Linear orthogonal state machine enforced across dropdowns, Kanban drag-and-drop,
              bulk transitions, REST API, and MCP tools.
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-2.5 py-0.5 font-mono text-[11px] font-medium text-white">
            Strict Mode Active
          </span>
        </div>
        <div className="mt-4">
          <WorkflowGraph />
        </div>
      </section>
    </PageContainer>
  );
}

function ModePicker({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: PresentationMode;
  onChange: (next: PresentationMode) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-700">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {presentationModeOptions.map((mode) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition ${
                active
                  ? "border-slate-950 bg-slate-950 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              {presentationModeLabels[mode]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
