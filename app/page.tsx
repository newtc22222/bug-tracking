import Link from "next/link";
import {
  BrandMarkIcon,
  DashboardIcon,
  FolderIcon,
  InboxIcon,
  SparklesIcon,
} from "@/components/ui-icons";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-950"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-950 text-white shadow-xs">
              <BrandMarkIcon className="h-3.5 w-3.5" />
            </span>
            <span>Bug Tracking</span>
          </Link>

          <Link
            href="/login"
            className="inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Self-hosted developer workbench</span>
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Linear-speed triage for every project.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Manage multiple repositories with strict workflow Kanban boards, linked dependencies,
            rich Markdown editing, AI investigation, external tracker sync, and built-in MCP tools—while
            keeping bug capture effortless.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800"
            >
              <DashboardIcon className="h-4 w-4" />
              <span>Workspace Dashboard</span>
            </Link>
            <Link
              href="/feedback"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
            >
              <InboxIcon className="h-4 w-4 text-slate-500" />
              <span>Feedback Inbox</span>
            </Link>
            <Link
              href="/projects"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
            >
              <FolderIcon className="h-4 w-4 text-slate-500" />
              <span>View Projects</span>
            </Link>
          </div>
        </div>

        <section
          aria-label="Capabilities"
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <InboxIcon className="h-4 w-4 text-slate-700" />
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Strict Workflow &amp; Kanban</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Switch between Full List, Fixed List, Card Grid, and Kanban with strict 6-state
              workflow transitions and linked ticket dependencies.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <SparklesIcon className="h-4 w-4 text-slate-700" />
            <h2 className="mt-3 text-sm font-semibold text-slate-950">AI Investigate &amp; MCP</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Generate root-cause hypotheses and coding-agent fix prompts, or connect agents
              directly via the built-in <code className="font-mono text-slate-700">/api/mcp</code>{" "}
              server.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <FolderIcon className="h-4 w-4 text-slate-700" />
            <h2 className="mt-3 text-sm font-semibold text-slate-950">Multi-Platform Sync</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Link GitHub, GitLab, Bitbucket, Linear, and Jira alongside public forms, Chrome
              extension captures, and scoped API keys.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
