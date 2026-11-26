import Link from "next/link";
import { ExternalLinkIcon, PlusIcon } from "@/components/ui-icons";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, openFeedbackCount, highPriorityOpenCount] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            feedbackItems: {
              where: { status: "open" },
            },
          },
        },
      },
    }),
    prisma.feedbackItem.count({
      where: { status: "open" },
    }),
    prisma.feedbackItem.count({
      where: { status: "open", priority: "high" },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Repositories, live domains, and intake channels feeding into your inbox.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>New Project</span>
        </Link>
      </div>

      <section
        aria-label="Workspace summary"
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
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
            <p className="text-xs font-medium text-slate-500">Open Feedback Items</p>
            <span className="text-xs text-slate-400 transition group-hover:text-slate-700">→</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {openFeedbackCount}
          </p>
        </Link>

        <Link
          href="/feedback?status=open&priority=high"
          className="group rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {highPriorityOpenCount > 0 && (
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
              )}
              <span>High-Priority Open</span>
            </p>
            <span className="text-xs text-slate-400 transition group-hover:text-slate-700">→</span>
          </div>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
            {highPriorityOpenCount}
          </p>
        </Link>
      </section>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-base font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Create your first project to start organizing feedback and generating intake links.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>Create a project</span>
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const openCount = project._count.feedbackItems;
            return (
              <article
                key={project.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-base font-semibold tracking-tight text-slate-950">
                      <Link
                        href={`/projects/${project.id}`}
                        className="block truncate hover:underline underline-offset-4"
                      >
                        {project.name}
                      </Link>
                    </h2>
                    <Link
                      href={`/projects/${project.id}/feedback?status=open`}
                      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-medium tabular-nums ring-1 ring-inset transition ${
                        openCount > 0
                          ? "bg-blue-50 text-blue-700 ring-blue-600/15 hover:bg-blue-100"
                          : "bg-slate-100 text-slate-500 ring-slate-500/15 hover:bg-slate-200/70"
                      }`}
                    >
                      {openCount} open
                    </Link>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                      /{project.slug}
                    </span>
                    {project.domain && (
                      <span className="truncate text-slate-500">{project.domain}</span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-600">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs font-medium">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/projects/${project.id}/feedback`}
                      className="text-slate-700 transition hover:text-slate-950"
                    >
                      Feedback
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
    </main>
  );
}
