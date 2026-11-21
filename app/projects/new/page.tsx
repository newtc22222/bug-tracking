"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-950">
        ← Back to projects
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">New Project</h1>
      <p className="mt-2 text-sm text-slate-500">
        Add a repository and live site you want to track feedback for.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My project"
            required
            autoFocus
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating…" : "Create Project"}
        </button>
      </form>
    </main>
  );
}
