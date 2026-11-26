import Link from "next/link";
import { notFound } from "next/navigation";
import DashboardView from "@/components/dashboard-view";
import PageContainer from "@/components/page-container";
import { NewFeedbackButton } from "@/components/project-action-buttons";
import ProjectTabs from "@/components/project-tabs";
import { getDashboardData } from "@/lib/dashboard-stats";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true, keyPrefix: true, description: true },
  });

  if (!project) {
    notFound();
  }

  const data = await getDashboardData(projectId);

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="transition hover:text-slate-950">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-slate-800">{project.name}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{project.name}</h1>
            <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
              {project.keyPrefix}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              /{project.slug}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {project.description || "Project health, status breakdown, and resolution metrics."}
          </p>
        </div>

        <NewFeedbackButton projectId={project.id} label="New Ticket" />
      </div>

      <ProjectTabs projectId={project.id} />

      <DashboardView data={data} scope="project" projectId={project.id} />
    </PageContainer>
  );
}
