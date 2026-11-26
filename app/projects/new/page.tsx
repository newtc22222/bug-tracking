"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/ui-icons";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain, repoUrl, webhookUrl, description }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Unable to create project.");
      }

      router.push("/projects");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create project.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        <span>Projects</span>
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New Project</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a repository and live site you want to track feedback for.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-project-name" className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="new-project-name"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My project"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="new-project-domain"
              className="block text-sm font-medium text-slate-700"
            >
              Live site domain <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="new-project-domain"
              aria-describedby="new-project-domain-help"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="app.example.com"
              autoComplete="url"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <p id="new-project-domain-help" className="mt-1.5 text-xs text-slate-500">
              Used by the browser extension to match the current site.
            </p>
          </div>

          <div>
            <label htmlFor="new-project-repo" className="block text-sm font-medium text-slate-700">
              Repository URL <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="new-project-repo"
              type="url"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              placeholder="https://github.com/you/project"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          <div>
            <label
              htmlFor="new-project-webhook"
              className="block text-sm font-medium text-slate-700"
            >
              Webhook URL <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="new-project-webhook"
              type="url"
              aria-describedby="new-project-webhook-help"
              className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <p id="new-project-webhook-help" className="mt-1.5 text-xs text-slate-500">
              Slack, Discord, or custom JSON webhook notified on new submissions.
            </p>
          </div>

          <div>
            <label
              htmlFor="new-project-description"
              className="block text-sm font-medium text-slate-700"
            >
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="new-project-description"
              className="mt-1.5 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project about?"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link
              href="/projects"
              className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
