"use client";

import type { GitPlatform, TrackerPlatform } from "@prisma/client";
import { FormEvent, useState } from "react";
import { CheckIcon } from "@/components/ui-icons";
import {
  gitPlatformLabels,
  gitPlatformOptions,
  trackerPlatformLabels,
  trackerPlatformOptions,
} from "@/lib/feedback-display";
import { detectGitPlatform } from "@/lib/git-platforms";

export type ProjectFormInitialValues = {
  id?: string;
  name?: string;
  keyPrefix?: string;
  domain?: string | null;
  gitPlatform?: GitPlatform;
  repoUrl?: string | null;
  gitDefaultBranch?: string | null;
  trackerPlatform?: TrackerPlatform;
  trackerConfig?: Record<string, string> | null;
  webhookUrl?: string | null;
  description?: string | null;
};

type ProjectFormProps = {
  mode: "create" | "edit";
  initial?: ProjectFormInitialValues;
  onSuccess?: (project: { id: string; name: string; slug: string; keyPrefix: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export default function ProjectForm({
  mode,
  initial,
  onSuccess,
  onCancel,
  submitLabel,
}: ProjectFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [keyPrefix, setKeyPrefix] = useState(initial?.keyPrefix || "");
  const [domain, setDomain] = useState(initial?.domain || "");
  const [gitPlatform, setGitPlatform] = useState<GitPlatform>(initial?.gitPlatform || "none");
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl || "");
  const [gitDefaultBranch, setGitDefaultBranch] = useState(initial?.gitDefaultBranch || "");
  const [trackerPlatform, setTrackerPlatform] = useState<TrackerPlatform>(
    initial?.trackerPlatform || "none",
  );
  const initialConfig = (initial?.trackerConfig || {}) as Record<string, string>;
  const [trackerConfig, setTrackerConfig] = useState<Record<string, string>>(initialConfig);
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [error, setError] = useState("");

  function updateConfig(key: string, value: string) {
    setSavedBanner(false);
    setTrackerConfig((prev) => ({ ...prev, [key]: value }));
  }

  function handleRepoUrlChange(nextUrl: string) {
    setSavedBanner(false);
    setRepoUrl(nextUrl);
    if (nextUrl.trim() && gitPlatform === "none") {
      const detected = detectGitPlatform(nextUrl);
      if (detected !== "none") {
        setGitPlatform(detected);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSavedBanner(false);
    setSaving(true);

    try {
      const endpoint = mode === "edit" && initial?.id ? `/api/projects/${initial.id}` : "/api/projects";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          keyPrefix: keyPrefix.trim() || undefined,
          domain,
          gitPlatform,
          repoUrl,
          gitDefaultBranch,
          trackerPlatform,
          trackerConfig: trackerPlatform === "none" ? null : trackerConfig,
          webhookUrl,
          description,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | ({ id: string; name: string; slug: string; keyPrefix: string } & { error?: string })
        | null;

      if (!response.ok || !body) {
        throw new Error(body?.error || "Unable to save project.");
      }

      if (mode === "edit") {
        setSavedBanner(true);
      }
      onSuccess?.(body);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {savedBanner && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
        >
          <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
          <span>Project settings saved.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div>
          <label htmlFor="proj-name" className="block text-sm font-medium text-slate-700">
            Project Name
          </label>
          <input
            id="proj-name"
            className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            value={name}
            onChange={(e) => {
              setSavedBanner(false);
              setName(e.target.value);
            }}
            placeholder="e.g. Web Platform"
            required
            autoFocus={mode === "create"}
          />
        </div>

        <div>
          <label htmlFor="proj-key" className="block text-sm font-medium text-slate-700">
            Ticket Key <span className="font-normal text-slate-400">(auto)</span>
          </label>
          <input
            id="proj-key"
            className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm uppercase text-slate-950 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            value={keyPrefix}
            onChange={(e) => {
              setSavedBanner(false);
              setKeyPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
            }}
            placeholder="WEB"
            maxLength={8}
          />
        </div>
      </div>

      <div>
        <label htmlFor="proj-domain" className="block text-sm font-medium text-slate-700">
          Live site domain <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="proj-domain"
          className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          value={domain}
          onChange={(e) => {
            setSavedBanner(false);
            setDomain(e.target.value);
          }}
          placeholder="app.example.com"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-slate-500">
          Used by the Chrome extension to auto-detect this project on the active tab.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Git Repository
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="proj-git-platform" className="block text-xs font-medium text-slate-700">
              Git Platform
            </label>
            <select
              id="proj-git-platform"
              value={gitPlatform}
              onChange={(e) => {
                setSavedBanner(false);
                setGitPlatform(e.target.value as GitPlatform);
              }}
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            >
              {gitPlatformOptions.map((p) => (
                <option key={p} value={p}>
                  {gitPlatformLabels[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="proj-repo" className="block text-xs font-medium text-slate-700">
              Repository URL
            </label>
            <input
              id="proj-repo"
              type="url"
              value={repoUrl}
              onChange={(e) => handleRepoUrlChange(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-950 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
            />
          </div>
        </div>
        <div>
          <label htmlFor="proj-branch" className="block text-xs font-medium text-slate-700">
            Default Branch <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="proj-branch"
            value={gitDefaultBranch}
            onChange={(e) => {
              setSavedBanner(false);
              setGitDefaultBranch(e.target.value);
            }}
            placeholder="main"
            className="mt-1 h-9 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 font-mono text-xs text-slate-950 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            External Issue Tracking Platform
          </p>
          <span className="font-mono text-[11px] text-slate-500">REST / GraphQL API + MCP ready</span>
        </div>

        <div>
          <label htmlFor="proj-tracker" className="block text-xs font-medium text-slate-700">
            Linked Tracker
          </label>
          <select
            id="proj-tracker"
            value={trackerPlatform}
            onChange={(e) => {
              setSavedBanner(false);
              setTrackerPlatform(e.target.value as TrackerPlatform);
            }}
            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-950 outline-none focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          >
            {trackerPlatformOptions.map((p) => (
              <option key={p} value={p}>
                {trackerPlatformLabels[p]}
              </option>
            ))}
          </select>
        </div>

        {trackerPlatform === "github_issues" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                GitHub Owner <span className="font-normal text-slate-400">(optional override)</span>
              </label>
              <input
                value={trackerConfig.owner || ""}
                onChange={(e) => updateConfig("owner", e.target.value)}
                placeholder="org-name"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                GitHub Repo <span className="font-normal text-slate-400">(optional override)</span>
              </label>
              <input
                value={trackerConfig.repo || ""}
                onChange={(e) => updateConfig("repo", e.target.value)}
                placeholder="repo-name"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-slate-500">
              Defaults to parsing Repository URL. Uses <code className="font-mono">GITHUB_TOKEN</code> env var.
            </p>
          </div>
        )}

        {trackerPlatform === "gitlab_issues" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">GitLab Base URL</label>
              <input
                value={trackerConfig.gitlabBaseUrl || ""}
                onChange={(e) => updateConfig("gitlabBaseUrl", e.target.value)}
                placeholder="https://gitlab.com"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Project ID or Path
              </label>
              <input
                value={trackerConfig.gitlabProjectId || ""}
                onChange={(e) => updateConfig("gitlabProjectId", e.target.value)}
                placeholder="group/project or 12345"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-slate-500">
              Uses <code className="font-mono">GITLAB_TOKEN</code> env var.
            </p>
          </div>
        )}

        {trackerPlatform === "linear" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Linear Team ID *</label>
              <input
                value={trackerConfig.linearTeamId || ""}
                onChange={(e) => updateConfig("linearTeamId", e.target.value)}
                placeholder="UUID of Linear team"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Linear Project ID <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                value={trackerConfig.linearProjectId || ""}
                onChange={(e) => updateConfig("linearProjectId", e.target.value)}
                placeholder="UUID of Linear project"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-slate-500">
              Uses <code className="font-mono">LINEAR_API_KEY</code> env var.
            </p>
          </div>
        )}

        {trackerPlatform === "jira" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Jira Site URL *</label>
              <input
                value={trackerConfig.jiraSiteUrl || ""}
                onChange={(e) => updateConfig("jiraSiteUrl", e.target.value)}
                placeholder="https://your-org.atlassian.net"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Project Key *</label>
              <input
                value={trackerConfig.jiraProjectKey || ""}
                onChange={(e) => updateConfig("jiraProjectKey", e.target.value)}
                placeholder="ENG"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Issue Type</label>
              <input
                value={trackerConfig.jiraIssueType || ""}
                onChange={(e) => updateConfig("jiraIssueType", e.target.value)}
                placeholder="Bug"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs"
              />
            </div>
            <p className="sm:col-span-2 self-end text-[11px] text-slate-500">
              Uses <code className="font-mono">JIRA_EMAIL</code> &amp;{" "}
              <code className="font-mono">JIRA_API_TOKEN</code> env vars.
            </p>
          </div>
        )}

        {trackerPlatform === "bitbucket_issues" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Workspace</label>
              <input
                value={trackerConfig.bitbucketWorkspace || ""}
                onChange={(e) => updateConfig("bitbucketWorkspace", e.target.value)}
                placeholder="workspace-slug"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Repo Slug</label>
              <input
                value={trackerConfig.bitbucketRepoSlug || ""}
                onChange={(e) => updateConfig("bitbucketRepoSlug", e.target.value)}
                placeholder="repo-slug"
                className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-xs"
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-slate-500">
              Uses <code className="font-mono">BITBUCKET_TOKEN</code> env var.
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="proj-webhook" className="block text-sm font-medium text-slate-700">
          Webhook URL <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="proj-webhook"
          type="url"
          className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none transition placeholder:font-sans placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          value={webhookUrl}
          onChange={(e) => {
            setSavedBanner(false);
            setWebhookUrl(e.target.value);
          }}
          placeholder="https://hooks.slack.com/services/..."
        />
      </div>

      <div>
        <label htmlFor="proj-desc" className="block text-sm font-medium text-slate-700">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="proj-desc"
          className="mt-1.5 min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
          value={description}
          onChange={(e) => {
            setSavedBanner(false);
            setDescription(e.target.value);
          }}
          placeholder="What is this project about?"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-md bg-slate-950 px-4 text-sm font-medium text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? mode === "edit"
              ? "Saving…"
              : "Creating…"
            : submitLabel || (mode === "edit" ? "Save Changes" : "Create Project")}
        </button>
      </div>
    </form>
  );
}
