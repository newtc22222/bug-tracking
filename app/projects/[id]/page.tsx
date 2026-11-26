"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProjectApiKeysPanel from "@/components/project-api-keys-panel";
import PublicSubmitLink from "@/components/public-submit-link";
import { ArrowLeftIcon, CheckIcon, PlusIcon, TrashIcon } from "@/components/ui-icons";

type Project = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  repoUrl: string | null;
  webhookUrl: string | null;
  description: string | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [openFeedbackCount, setOpenFeedbackCount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${params.id}`);
        const body = (await response.json().catch(() => null)) as Project & { error?: string };

        if (!response.ok) {
          throw new Error(body.error || "Project not found.");
        }

        setProject(body);
        setName(body.name);
        setDomain(body.domain || "");
        setRepoUrl(body.repoUrl || "");
        setWebhookUrl(body.webhookUrl || "");
        setDescription(body.description || "");

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

    loadProject();
  }, [params.id]);

  function clearSavedBanner() {
    if (savedBanner) {
      setSavedBanner(false);
    }
    if (savedTimerRef.current !== null) {
      window.clearTimeout(savedTimerRef.current);
      savedTimerRef.current = null;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    clearSavedBanner();
    setSaving(true);

    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, repoUrl, webhookUrl, description }),
      });

      const body = (await response.json().catch(() => null)) as Project & { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Unable to save project.");
      }

      setProject(body);
      setName(body.name);
      setDomain(body.domain || "");
      setRepoUrl(body.repoUrl || "");
      setWebhookUrl(body.webhookUrl || "");
      setDescription(body.description || "");
      setSavedBanner(true);
      savedTimerRef.current = window.setTimeout(() => setSavedBanner(false), 3200);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

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
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="h-[460px] animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            <div className="h-28 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
            <div className="h-44 animate-pulse rounded-xl border border-slate-200/80 bg-white" />
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
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
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
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
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
              /{project.slug}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Configure repository links, domain matching, webhooks, and API keys.
          </p>
        </div>

        <Link
          href={`/projects/${params.id}/feedback`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-800 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
        >
          <span>Open Feedback</span>
          <span className="text-slate-400">→</span>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-sm font-semibold text-slate-950">Project Settings</h2>

            {savedBanner && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
              >
                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span>Changes saved.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div>
                <label htmlFor="project-name" className="block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  id="project-name"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={name}
                  onChange={(event) => {
                    clearSavedBanner();
                    setName(event.target.value);
                  }}
                  required
                />
              </div>

              <div>
                <label htmlFor="project-domain" className="block text-sm font-medium text-slate-700">
                  Live site domain <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="project-domain"
                  aria-describedby="project-domain-help"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={domain}
                  onChange={(event) => {
                    clearSavedBanner();
                    setDomain(event.target.value);
                  }}
                  placeholder="app.example.com"
                  autoComplete="url"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p id="project-domain-help" className="mt-1.5 text-xs text-slate-500">
                  Used by the browser extension to match the current site.
                </p>
              </div>

              <div>
                <label htmlFor="project-repo" className="block text-sm font-medium text-slate-700">
                  Repository URL <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="project-repo"
                  type="url"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={repoUrl}
                  onChange={(event) => {
                    clearSavedBanner();
                    setRepoUrl(event.target.value);
                  }}
                  placeholder="https://github.com/you/project"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </div>

              <div>
                <label htmlFor="project-webhook" className="block text-sm font-medium text-slate-700">
                  Webhook URL <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="project-webhook"
                  type="url"
                  aria-describedby="project-webhook-help"
                  className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={webhookUrl}
                  onChange={(event) => {
                    clearSavedBanner();
                    setWebhookUrl(event.target.value);
                  }}
                  placeholder="https://hooks.slack.com/services/..."
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <p id="project-webhook-help" className="mt-1.5 text-xs text-slate-500">
                  Slack, Discord, or custom JSON webhook notified on new submissions.
                </p>
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  className="mt-1.5 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                  value={description}
                  onChange={(event) => {
                    clearSavedBanner();
                    setDescription(event.target.value);
                  }}
                  placeholder="What is this project about?"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-red-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Danger Zone</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Permanently delete this project and all associated feedback items and API keys.
                </p>
              </div>

              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                    className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || deleting}
                    onClick={handleDelete}
                    className="h-8 rounded-md bg-red-600 px-3 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  <span>Delete Project</span>
                </button>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Feedback Queue
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
                View Feedback →
              </Link>
              <Link
                href={`/projects/${params.id}/feedback/new`}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-950 px-3 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <PlusIcon className="h-3 w-3" />
                <span>New</span>
              </Link>
            </div>
          </section>

          <PublicSubmitLink slug={project.slug} />

          <ProjectApiKeysPanel projectId={project.id} />
        </aside>
      </div>
    </main>
  );
}
