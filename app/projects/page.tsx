import Link from "next/link";
import PageContainer from "@/components/page-container";
import { NewProjectButton } from "@/components/project-action-buttons";
import { ExternalLinkIcon, GitBranchIcon } from "@/components/ui-icons";
import { gitPlatformLabels, trackerPlatformLabels } from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, openFeedbackCount, urgentHighOpenCount, blockedCount] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            feedbackItems: {
              where: { status: { in: ["open", "todo", "in_progress", "blocked"] } },
            },
          },
        },
      },
    }),
    prisma.feedbackItem.count({
      where: { status: "open" },
    }),
    prisma.feedbackItem.count({
      where: {
        status: { in: ["open", "todo", "in_progress", "blocked"] },
        priority: { in: ["urgent", "high"] },
      },
    }),
    prisma.feedbackItem.count({
      where: { status: "blocked" },
    }),
  ]);

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Repositories, live domains, external trackers, and intake channels feeding into your
            workspace.
          </p>
        </div>
        <NewProjectButton label="New Project" />
      </div>

      <section
        aria-label="Workspace summary"
        className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-xs font-medium text-slate-500">Total Projects</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {projects.length}
          </p>
        </div>

        <Link
          href="/feedback?status=open"
          className="group rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Open Triage Queue</p>
            <span className="text-xs text-slate-400 transition group-hover:text-slate-700">→</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {openFeedbackCount}
          </p>
        </Link>

        <Link
          href="/feedback?priority=urgent"
          className="group rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {urgentHighOpenCount > 0 && (
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rose-600" />
              )}
              <span>Urgent &amp; High Active</span>
            </p>
            <span className="text-xs text-slate-400 transition group-hover:text-slate-700">→</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {urgentHighOpenCount}
          </p>
        </Link>

        <Link
          href="/feedback?status=blocked"
          className="group rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">Blocked Tickets</p>
            <span className="text-xs text-slate-400 transition group-hover:text-slate-700">→</span>
          </div>
          <p
            className={`mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums ${
              blockedCount > 0 ? "text-rose-700" : "text-slate-950"
            }`}
          >
            {blockedCount}
          </p>
        </Link>
      </section>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Create your first project to start organizing feedback and generating intake links.
          </p>
          <div className="mt-5 flex justify-center">
            <NewProjectButton label="Create a project" />
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const activeCount = project._count.feedbackItems;
            return (
              <article
                key={project.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                        {project.keyPrefix}
                      </span>
                      <h2 className="min-w-0 text-base font-semibold tracking-tight text-slate-950">
                        <Link
                          href={`/projects/${project.id}/dashboard`}
                          className="block truncate hover:underline underline-offset-4"
                        >
                          {project.name}
                        </Link>
                      </h2>
                    </div>
                    <Link
                      href={`/projects/${project.id}/feedback`}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums ring-1 ring-inset transition ${
                        activeCount > 0
                          ? "bg-blue-50 text-blue-700 ring-blue-600/15 hover:bg-blue-100"
                          : "bg-slate-100 text-slate-500 ring-slate-500/15 hover:bg-slate-200/70"
                      }`}
                    >
                      {activeCount} active
                    </Link>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                      /{project.slug}
                    </span>
                    {project.domain && (
                      <span className="truncate text-slate-500">{project.domain}</span>
                    )}
                    {project.gitPlatform !== "none" && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-slate-600 ring-1 ring-inset ring-slate-200">
                        <GitBranchIcon className="h-3 w-3" />
                        {gitPlatformLabels[project.gitPlatform]}
                      </span>
                    )}
                    {project.trackerPlatform !== "none" && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 ring-1 ring-inset ring-indigo-600/15">
                        {trackerPlatformLabels[project.trackerPlatform]}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs font-medium">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projects/${project.id}/dashboard`}
                      className="text-slate-700 transition hover:text-slate-950"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href={`/projects/${project.id}/feedback`}
                      className="text-slate-700 transition hover:text-slate-950"
                    >
                      Tickets
                    </Link>
                    <a
                      href={`/submit/${project.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-slate-500 transition hover:text-slate-950"
                    >
                      <span>Public Form</span>
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-slate-500 transition hover:text-slate-950"
                  >
                    Settings →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
