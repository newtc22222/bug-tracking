"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import PageContainer from "@/components/page-container";
import { CheckIcon, CopyIcon, SettingsIcon, SparklesIcon } from "@/components/ui-icons";
import WorkflowGraph from "@/components/workflow-graph";
import { useWorkspace } from "@/components/workspace-provider";
import { APP_RELEASE_NAME, APP_VERSION_LABEL } from "@/lib/version";
import { WORKFLOW_NODES } from "@/lib/workflow";

const emptySubscribe = () => () => {};

export default function GuidePage() {
  const { startTour } = useWorkspace();
  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "http://localhost:3000",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copySnippet(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        "bug-tracking": {
          url: `${origin}/api/mcp`,
          headers: {
            Authorization: "Bearer btk_YOUR_PROJECT_API_KEY",
          },
        },
      },
    },
    null,
    2,
  );

  const stdioConfigJson = JSON.stringify(
    {
      mcpServers: {
        "bug-tracking-stdio": {
          command: "npx",
          args: ["tsx", "scripts/mcp-server.ts"],
          env: {
            BUG_TRACKER_URL: origin,
            BUG_TRACKER_API_KEY: "btk_YOUR_PROJECT_API_KEY",
          },
        },
      },
    },
    null,
    2,
  );

  const curlSubmitSnippet = `curl -X POST ${origin}/api/v1/feedback \\
  -H "Authorization: Bearer btk_YOUR_PROJECT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Checkout 500 error","type":"bug","priority":"urgent","description":"## Repro\\n1. Click Pay"}'`;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Wiki &amp; Workspace Guideline
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
              {APP_VERSION_LABEL} · {APP_RELEASE_NAME}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Complete reference for strict ticket workflows, themes, labels, bulk actions, Chrome
            extension v0.2, two-way tracker webhooks, repo-aware AI, and MCP agent integration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startTour("workspace")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            <span>Start Interactive Tour</span>
          </button>
          <Link
            href="/settings"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
          >
            <SettingsIcon className="h-3.5 w-3.5" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* 1. Strict Workflow Graph */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-950">
            1. Strict Ticket Workflow &amp; Triage Order
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Every ticket uses sequential keys (e.g., <code className="font-mono">WEB-12</code>) and
            is triaged in strict order: <strong>Type → Priority → Status</strong> (including{" "}
            <span className="font-semibold text-rose-700">Urgent</span>). Transitions strictly obey
            the orthogonal state graph across dropdowns, Kanban drag-and-drop, bulk updates, REST
            API, and MCP tools.
          </p>
          <div className="mt-4">
            <WorkflowGraph />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_NODES.map((node) => (
              <div
                key={node.status}
                className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 text-xs"
              >
                <p className="font-semibold text-slate-900">{node.label}</p>
                <p className="mt-0.5 text-slate-500">{node.shortDescription}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Triage Views, Labels, Bulk Actions, Saved Views & Themes */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-950">
            2. Workbench Productivity, Views &amp; Themes
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 text-xs">
            <FeatureCard
              title="4 Ticket Views"
              body="Switch between Full Scroll List (default), Fixed-Height List, Card Grid (with screenshot previews), and strict-workflow Kanban."
            />
            <FeatureCard
              title="URL-Synced Drawer & J / K"
              body="Opening a ticket syncs ?ticket=<id> in the URL. Press J (next) or K (previous) to triage back-to-back without closing the drawer."
            />
            <FeatureCard
              title="Labels, Bulk Actions & Saved Views"
              body="Tag tickets with colored labels, select multiple items for bulk status/priority/label/delete actions, and pin filtered Saved Views to the sidebar."
            />
            <FeatureCard
              title="Tiptap WYSIWYG Markdown"
              body="Write descriptions and internal notes in rich WYSIWYG with checklists, code blocks, bug templates, and a 1-click MD source toggle."
            />
            <FeatureCard
              title="Dark Mode & 5 Accent Themes"
              body="Supports System, Light, and Dark color schemes plus Slate, Indigo, Emerald, Amber, and Rose accent themes in Settings."
            />
            <FeatureCard
              title="Type-to-Confirm Danger Zone"
              body="Destructive project, ticket, and bulk deletions require typing the exact slug, ticket key, or DELETE phrase in a modal dialog."
            />
          </div>
        </section>

        {/* 3. Chrome Extension v0.2 Setup */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-950">
            3. Chrome Extension (v0.2.0) Quick-Capture &amp; Diagnostics
          </h2>
          <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-xs leading-relaxed text-slate-600">
            <li>
              Open{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                chrome://extensions
              </code>
              , enable <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and
              select <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">extension/</code>.
            </li>
            <li>
              Open <strong>Extension settings</strong> and set your API origin to:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-slate-900">
                  {origin}
                </code>
                <button
                  type="button"
                  onClick={() => void copySnippet("origin", origin)}
                  className="inline-flex h-7 items-center gap-1 rounded border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-700 hover:border-slate-950"
                >
                  {copiedId === "origin" ? (
                    <>
                      <CheckIcon className="h-3 w-3 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
            </li>
            <li>
              Choose your <strong>Full-page form target</strong>: either the public form (
              <code className="font-mono">/submit/[slug]</code>) or the authenticated admin editor (
              <code className="font-mono">/projects/by-slug/[slug]/feedback/new</code>).
            </li>
            <li>
              The extension automatically captures active URL, viewport resolution + DPR, recent
              failed HTTP resources (<code className="font-mono">&gt;= 400</code>), and optional
              visible-tab screenshots.
            </li>
          </ol>
        </section>

        {/* 4. MCP Server, External Trackers & Two-Way Webhooks */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-950">
            4. MCP Server, External Trackers &amp; Two-Way Webhooks
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Connect AI coding agents directly via <code className="font-mono">/api/mcp</code>,
            promote tickets to GitHub Issues / GitLab Issues / Linear / Jira / Bitbucket, and
            configure incoming webhooks so external status changes sync back automatically.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CodeBlock
              title="Streamable HTTP MCP Config"
              code={mcpConfigJson}
              copied={copiedId === "mcp-http"}
              onCopy={() => void copySnippet("mcp-http", mcpConfigJson)}
            />
            <CodeBlock
              title="Local Stdio MCP Bridge Config"
              code={stdioConfigJson}
              copied={copiedId === "mcp-stdio"}
              onCopy={() => void copySnippet("mcp-stdio", stdioConfigJson)}
            />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 text-xs">
            <p className="font-semibold text-slate-900">Two-Way Tracker Webhook Endpoints</p>
            <p className="mt-1 text-slate-600">
              Point GitHub, GitLab, Linear, or Jira issue webhooks to the URLs below (optionally
              secured with <code className="font-mono">TRACKER_WEBHOOK_SECRET</code>):
            </p>
            <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-700">
              <li>GitHub: {origin}/api/webhooks/trackers/github</li>
              <li>GitLab: {origin}/api/webhooks/trackers/gitlab</li>
              <li>Linear: {origin}/api/webhooks/trackers/linear</li>
              <li>Jira: {origin}/api/webhooks/trackers/jira</li>
            </ul>
          </div>

          <div className="mt-4">
            <CodeBlock
              title="Programmatic Ticket Intake (REST API)"
              code={curlSubmitSnippet}
              copied={copiedId === "curl"}
              onCopy={() => void copySnippet("curl", curlSubmitSnippet)}
            />
          </div>

          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs">
            <p className="font-semibold text-slate-900">
              Server Environment Variables (Trackers, Webhooks &amp; Repo-Aware AI)
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 font-mono text-[11px] text-slate-600">
              <li>GITHUB_TOKEN (Issues + Repo-Aware AI)</li>
              <li>GITLAB_TOKEN (GitLab Issues)</li>
              <li>LINEAR_API_KEY (Linear GraphQL)</li>
              <li>JIRA_EMAIL + JIRA_API_TOKEN (Jira Cloud)</li>
              <li>BITBUCKET_TOKEN (Bitbucket Issues)</li>
              <li>TRACKER_WEBHOOK_SECRET (Webhook HMAC/Token)</li>
              <li>GEMINI_API_KEY / OPENAI_API_KEY (AI Vision &amp; Fix)</li>
            </ul>
          </div>
        </section>

        {/* 5. Keyboard Shortcuts */}
        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-950">5. Keyboard Shortcuts</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 text-xs">
            <ShortcutCard keys="Ctrl / ⌘ + K" label="Command Palette" />
            <ShortcutCard keys="C" label="Create New Ticket" />
            <ShortcutCard keys="J / K" label="Next / Previous ticket in Drawer" />
            <ShortcutCard keys="Esc" label="Close Drawer or Modal" />
            <ShortcutCard keys="MD toggle" label="Tiptap WYSIWYG ↔ Markdown" />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function CodeBlock({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px]">
        <span className="font-mono text-slate-300">{title}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-white/20"
        >
          {copied ? (
            <>
              <CheckIcon className="h-3 w-3 text-emerald-400" /> Copied
            </>
          ) : (
            <>
              <CopyIcon className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="bt-scroller overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
        {code}
      </pre>
    </div>
  );
}

function ShortcutCard({ keys, label }: { keys: string; label: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3">
      <kbd className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-900 shadow-2xs">
        {keys}
      </kbd>
      <p className="mt-2 text-slate-600">{label}</p>
    </div>
  );
}
