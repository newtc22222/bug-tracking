"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import PublicSubmitLink from "@/components/public-submit-link";
import { useParams, useRouter } from "next/navigation";

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
        setName(body.name);
        setDomain(body.domain || "");

        const feedbackResponse = await fetch(`/api/projects/${params.id}/feedback?status=open`);
        if (feedbackResponse.ok) {
          const feedbackItems = (await feedbackResponse.json()) as unknown[];
          setOpenFeedbackCount(feedbackItems.length);
        }
        setRepoUrl(body.repoUrl || "");
        setWebhookUrl(body.webhookUrl || "");
        setDescription(body.description || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load project.");
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [params.id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this project? This action cannot be undone.")) {
      return;
    }

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
      <main className="mx-auto w-full max-w-md px-4 py-14">
        <p className="text-sm text-slate-500">Loading project…</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-950">
          ← Back to projects
        </Link>
        <h1 className="mt-8 text-2xl font-semibold text-slate-950">Project unavailable</h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-950">
        ← Back to projects
      </Link>
      <div className="mt-6">
        <p className="text-sm text-slate-500">Project /{project.slug}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Edit Project</h1>
      </div>

      <Link
        href={`/projects/${params.id}/feedback`}
        className="mt-6 flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-sm transition hover:border-slate-400"
      >
        <span className="font-medium text-slate-800">Project Feedback</span>
        <span className="text-slate-500">
          {openFeedbackCount === null ? "View" : `${openFeedbackCount} open`}
          <span className="ml-2">→</span>
        </span>
      </Link>

      <PublicSubmitLink slug={project.slug} />

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Live site domain <span className="font-normal text-slate-400">(optional)</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="app.example.com"
            autoComplete="url"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Used by the browser extension to match the current site.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Repository URL <span className="font-normal text-slate-400">(optional)</span>
          <input
            type="url"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            placeholder="https://github.com/you/project"
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Webhook URL <span className="font-normal text-slate-400">(optional)</span>
          <input
            type="url"
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://hooks.slack.com/services/..."
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Slack, Discord, or custom JSON webhook notified on new submissions.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is this project about?"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || deleting}
            className="flex-1 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </main>
  );
}
