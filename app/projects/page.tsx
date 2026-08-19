import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-500">Bug Tracking</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Projects</h1>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-slate-900">No projects yet</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create your first project to start organizing feedback.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 inline-block text-sm font-medium text-slate-950 underline underline-offset-4 hover:text-slate-600"
          >
            Create a project
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="block px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-slate-950">{project.name}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {project.description || "No description provided."}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">/{project.slug}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
