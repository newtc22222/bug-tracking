"use client";

import type { GitPlatform, TrackerPlatform } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageContainer from "@/components/page-container";
import ConfirmDangerModal from "@/components/confirm-danger-modal";
import ProjectApiKeysPanel from "@/components/project-api-keys-panel";
import ProjectForm from "@/components/project-form";
import ProjectTabs from "@/components/project-tabs";
import PublicSubmitLink from "@/components/public-submit-link";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@/components/ui-icons";
import { useWorkspace } from "@/components/workspace-provider";

type Project = {
  id: string;
  name: string;
  slug: string;
  keyPrefix: string;
  domain: string | null;
  gitPlatform: GitPlatform;
  repoUrl: string | null;
  gitDefaultBranch: string | null;
  trackerPlatform: TrackerPlatform;
  trackerConfig: Record<string, string> | null;
  webhookUrl: string | null;
  description: string | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { openNewFeedback } = useWorkspace();
  const [project, setProject] = useState<Project | null>(null);
  const [openFeedbackCount, setOpenFeedbackCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);
        const body = (await response.json().catch(() => null)) as Project & { error?: string };

        if (!response.ok) {
          throw new Error(body.error || "Project not found.");
        }

        setProject(body);

        const feedbackResponse = await fetch(`/api/projects/${params.id}/feedback?status=open`);
        if (feedbackResponse.ok) {
          const feedbackItems = (await feedbackResponse.json()) as unknown[];
          setOpenFeedbackCount(feedbackItems.length);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load project.");
      } finally {
        setLoading(false);
      }
    }

    void loadProject();
  }, [params.id]);

  async function handleDelete() {
    setError("");
    setDeleting(true);

    try {
      const response = await fetch(`/api/projects/${params.id}`, { method: "DELETE" });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(body?.error || "Unable to delete project.");
      }

      router.push("/projects");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete project.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="h-[460px] animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            <div className="h-44 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          <span>Back to projects</span>
        </Link>
        <div className="mt-6 rounded-xl border border-slate-200/80 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-950">Project unavailable</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="transition hover:text-slate-950">
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate font-medium text-slate-800">{project.name}</span>
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
            Configure Git platform, external issue trackers, domain matching, webhooks, and API/MCP
            keys.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNewFeedback(project.id)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3.5 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>New Ticket</span>
        </button>
      </div>

      <ProjectTabs projectId={project.id} />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="mb-5 text-sm font-semibold text-slate-950">
              Project Settings &amp; Integrations
            </h2>
            <ProjectForm
              mode="edit"
              initial={project}
              onSuccess={(updated) => {
                setProject((prev) => (prev ? { ...prev, ...updated } : prev));
                router.refresh();
              }}
            />
          </section>

          <section className="rounded-xl border border-red-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Danger Zone</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Permanently delete this project and all associated tickets, links, and API keys.
                </p>
              </div>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Delete Project…</span>
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          </section>

          <ConfirmDangerModal
            open={confirmDelete}
            title={`Delete project "${project.name}"?`}
            description="This will permanently erase the project and all nested data."
            consequences={[
              "Deletes every ticket, screenshot, internal note, and status event in this project.",
              "Revokes and deletes all project API / MCP keys and public submit links.",
              "Removes all cross-project ticket links referencing this project.",
            ]}
            confirmPhrase={project.slug}
            confirmLabel="Delete Project"
            busy={deleting}
            error={error}
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(false)}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Open Triage Queue
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <p className="font-mono text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">
                {openFeedbackCount === null ? "—" : openFeedbackCount}
              </p>
              <span className="text-xs text-slate-500">open items</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/projects/${params.id}/feedback`}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
              >
                Open Tickets →
              </Link>
              <Link
                href={`/projects/${params.id}/dashboard`}
                className="inline-flex h-8 items-center rounded-md bg-slate-950 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Dashboard
              </Link>
            </div>
          </section>

          <PublicSubmitLink slug={project.slug} />

          <ProjectApiKeysPanel projectId={project.id} />
        </aside>
      </div>
    </PageContainer>
  );
}
