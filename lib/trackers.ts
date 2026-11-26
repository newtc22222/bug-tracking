import type { TrackerPlatform } from "@prisma/client";
import { buildGithubIssuePayload, extractGithubOwnerRepo } from "@/lib/github";

export type TrackerConfig = {
  // GitHub
  owner?: string;
  repo?: string;
  // GitLab
  gitlabBaseUrl?: string;
  gitlabProjectId?: string;
  // Linear
  linearTeamId?: string;
  linearProjectId?: string;
  // Jira
  jiraSiteUrl?: string;
  jiraProjectKey?: string;
  jiraIssueType?: string;
  // Bitbucket
  bitbucketWorkspace?: string;
  bitbucketRepoSlug?: string;
};

export type TrackerProjectInput = {
  id: string;
  name: string;
  slug: string;
  repoUrl?: string | null;
  trackerPlatform: TrackerPlatform;
  trackerConfig?: TrackerConfig | null;
};

export type TrackerFeedbackInput = {
  id: string;
  ticketKey?: string | null;
  title: string;
  description?: string | null;
  type: string;
  priority?: string | null;
  source: string;
  pageUrl?: string | null;
  browserInfo?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
};

export type ExternalIssueResult = {
  provider: TrackerPlatform;
  externalId: string;
  externalKey: string;
  externalUrl: string;
  externalStatus: string;
};

export async function createExternalTrackerIssue({
  project,
  feedback,
}: {
  project: TrackerProjectInput;
  feedback: TrackerFeedbackInput;
}): Promise<ExternalIssueResult> {
  const config = (project.trackerConfig || {}) as TrackerConfig;

  switch (project.trackerPlatform) {
    case "github_issues":
      return createGithubIssue(project, feedback, config);
    case "gitlab_issues":
      return createGitlabIssue(project, feedback, config);
    case "linear":
      return createLinearIssue(project, feedback, config);
    case "jira":
      return createJiraIssue(project, feedback, config);
    case "bitbucket_issues":
      return createBitbucketIssue(project, feedback, config);
    case "none":
    default:
      throw new Error("No external issue tracker is configured for this project.");
  }
}

export async function syncExternalTrackerStatus({
  project,
  provider,
  externalId,
}: {
  project: TrackerProjectInput;
  provider: TrackerPlatform;
  externalId: string;
}): Promise<{ externalStatus: string }> {
  const config = (project.trackerConfig || {}) as TrackerConfig;

  switch (provider) {
    case "github_issues": {
      const token = process.env.GITHUB_TOKEN?.trim();
      if (!token) throw new Error("GITHUB_TOKEN is not configured on the server.");
      const ref = resolveGithubRef(project.repoUrl, config);
      if (!ref) throw new Error("GitHub owner/repo is not configured.");

      const res = await fetch(
        `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${encodeURIComponent(externalId)}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "bug-tracking-app",
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = (await res.json().catch(() => null)) as { state?: string; message?: string } | null;
      if (!res.ok || !data?.state) {
        throw new Error(data?.message || `GitHub API returned HTTP ${res.status}`);
      }
      return { externalStatus: data.state };
    }

    case "gitlab_issues": {
      const token = process.env.GITLAB_TOKEN?.trim();
      if (!token) throw new Error("GITLAB_TOKEN is not configured on the server.");
      const { baseUrl, projectId } = resolveGitlabRef(project.repoUrl, config);
      if (!projectId) throw new Error("GitLab project ID/path is not configured.");

      const res = await fetch(
        `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/issues/${encodeURIComponent(externalId)}`,
        {
          headers: { "PRIVATE-TOKEN": token },
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = (await res.json().catch(() => null)) as { state?: string; message?: string } | null;
      if (!res.ok || !data?.state) {
        throw new Error(data?.message || `GitLab API returned HTTP ${res.status}`);
      }
      return { externalStatus: data.state };
    }

    case "linear": {
      const apiKey = process.env.LINEAR_API_KEY?.trim();
      if (!apiKey) throw new Error("LINEAR_API_KEY is not configured on the server.");

      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          query: `query IssueState($id: String!) { issue(id: $id) { state { name } } }`,
          variables: { id: externalId },
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        data?: { issue?: { state?: { name?: string } } };
        errors?: Array<{ message?: string }>;
      } | null;
      const stateName = data?.data?.issue?.state?.name;
      if (!res.ok || !stateName) {
        throw new Error(data?.errors?.[0]?.message || `Linear API returned HTTP ${res.status}`);
      }
      return { externalStatus: stateName };
    }

    case "jira": {
      const email = process.env.JIRA_EMAIL?.trim();
      const token = process.env.JIRA_API_TOKEN?.trim();
      if (!email || !token) {
        throw new Error("JIRA_EMAIL and JIRA_API_TOKEN must be configured on the server.");
      }
      const siteUrl = normalizeBaseUrl(config.jiraSiteUrl);
      if (!siteUrl) throw new Error("Jira site URL is not configured.");

      const auth = Buffer.from(`${email}:${token}`).toString("base64");
      const res = await fetch(
        `${siteUrl}/rest/api/3/issue/${encodeURIComponent(externalId)}?fields=status`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Basic ${auth}`,
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        fields?: { status?: { name?: string } };
        errorMessages?: string[];
      } | null;
      const statusName = data?.fields?.status?.name;
      if (!res.ok || !statusName) {
        throw new Error(data?.errorMessages?.[0] || `Jira API returned HTTP ${res.status}`);
      }
      return { externalStatus: statusName };
    }

    case "bitbucket_issues": {
      const token = process.env.BITBUCKET_TOKEN?.trim();
      if (!token) throw new Error("BITBUCKET_TOKEN is not configured on the server.");
      const ref = resolveBitbucketRef(project.repoUrl, config);
      if (!ref) throw new Error("Bitbucket workspace/repo is not configured.");

      const res = await fetch(
        `https://api.bitbucket.org/2.0/repositories/${ref.workspace}/${ref.repoSlug}/issues/${encodeURIComponent(externalId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        state?: string;
        error?: { message?: string };
      } | null;
      if (!res.ok || !data?.state) {
        throw new Error(data?.error?.message || `Bitbucket API returned HTTP ${res.status}`);
      }
      return { externalStatus: data.state };
    }

    default:
      throw new Error("Unsupported tracker platform.");
  }
}

async function createGithubIssue(
  project: TrackerProjectInput,
  feedback: TrackerFeedbackInput,
  config: TrackerConfig,
): Promise<ExternalIssueResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured on the server.");
  }
  const ref = resolveGithubRef(project.repoUrl, config);
  if (!ref) {
    throw new Error("Project does not have a valid GitHub repository URL or owner/repo config.");
  }

  const payload = buildGithubIssuePayload(project.name, feedback);
  const res = await fetch(`https://api.github.com/repos/${ref.owner}/${ref.repo}/issues`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "bug-tracking-app",
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as {
    html_url?: string;
    number?: number;
    state?: string;
    message?: string;
  } | null;

  if (!res.ok || !data?.html_url || typeof data.number !== "number") {
    throw new Error(data?.message || `GitHub API returned HTTP ${res.status}`);
  }

  return {
    provider: "github_issues",
    externalId: String(data.number),
    externalKey: `#${data.number}`,
    externalUrl: data.html_url,
    externalStatus: data.state || "open",
  };
}

async function createGitlabIssue(
  project: TrackerProjectInput,
  feedback: TrackerFeedbackInput,
  config: TrackerConfig,
): Promise<ExternalIssueResult> {
  const token = process.env.GITLAB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITLAB_TOKEN is not configured on the server.");
  }
  const { baseUrl, projectId } = resolveGitlabRef(project.repoUrl, config);
  if (!projectId) {
    throw new Error("Configure GitLab Project ID or a valid GitLab repository URL.");
  }

  const payload = buildGithubIssuePayload(project.name, feedback);
  const res = await fetch(
    `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/issues`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PRIVATE-TOKEN": token,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        title: payload.title,
        description: payload.body,
        labels: payload.labels.join(","),
      }),
    },
  );

  const data = (await res.json().catch(() => null)) as {
    iid?: number;
    web_url?: string;
    state?: string;
    message?: string;
  } | null;

  if (!res.ok || !data?.web_url || typeof data.iid !== "number") {
    throw new Error(
      typeof data?.message === "string" ? data.message : `GitLab API returned HTTP ${res.status}`,
    );
  }

  return {
    provider: "gitlab_issues",
    externalId: String(data.iid),
    externalKey: `#${data.iid}`,
    externalUrl: data.web_url,
    externalStatus: data.state || "opened",
  };
}

async function createLinearIssue(
  project: TrackerProjectInput,
  feedback: TrackerFeedbackInput,
  config: TrackerConfig,
): Promise<ExternalIssueResult> {
  const apiKey = process.env.LINEAR_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured on the server.");
  }
  const teamId = config.linearTeamId?.trim();
  if (!teamId) {
    throw new Error("Configure a Linear Team ID in project tracker settings.");
  }

  const payload = buildGithubIssuePayload(project.name, feedback);
  const priorityMap: Record<string, number> = {
    urgent: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      query: `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier url state { name } }
        }
      }`,
      variables: {
        input: {
          teamId,
          ...(config.linearProjectId?.trim() ? { projectId: config.linearProjectId.trim() } : {}),
          title: payload.title,
          description: payload.body,
          ...(feedback.priority && priorityMap[feedback.priority]
            ? { priority: priorityMap[feedback.priority] }
            : {}),
        },
      },
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    data?: {
      issueCreate?: {
        success?: boolean;
        issue?: { id: string; identifier: string; url: string; state?: { name?: string } };
      };
    };
    errors?: Array<{ message?: string }>;
  } | null;

  const issue = data?.data?.issueCreate?.issue;
  if (!res.ok || !issue) {
    throw new Error(data?.errors?.[0]?.message || `Linear API returned HTTP ${res.status}`);
  }

  return {
    provider: "linear",
    externalId: issue.id,
    externalKey: issue.identifier,
    externalUrl: issue.url,
    externalStatus: issue.state?.name || "Triage",
  };
}

async function createJiraIssue(
  project: TrackerProjectInput,
  feedback: TrackerFeedbackInput,
  config: TrackerConfig,
): Promise<ExternalIssueResult> {
  const email = process.env.JIRA_EMAIL?.trim();
  const token = process.env.JIRA_API_TOKEN?.trim();
  if (!email || !token) {
    throw new Error("JIRA_EMAIL and JIRA_API_TOKEN must be configured on the server.");
  }

  const siteUrl = normalizeBaseUrl(config.jiraSiteUrl);
  const projectKey = config.jiraProjectKey?.trim();
  if (!siteUrl || !projectKey) {
    throw new Error("Configure Jira Site URL and Project Key in project tracker settings.");
  }

  const payload = buildGithubIssuePayload(project.name, feedback);
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const res = await fetch(`${siteUrl}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary: payload.title,
        issuetype: { name: config.jiraIssueType?.trim() || (feedback.type === "bug" ? "Bug" : "Task") },
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: payload.body }],
            },
          ],
        },
      },
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    id?: string;
    key?: string;
    errorMessages?: string[];
  } | null;

  if (!res.ok || !data?.key) {
    throw new Error(data?.errorMessages?.[0] || `Jira API returned HTTP ${res.status}`);
  }

  return {
    provider: "jira",
    externalId: data.key,
    externalKey: data.key,
    externalUrl: `${siteUrl}/browse/${data.key}`,
    externalStatus: "Open",
  };
}

async function createBitbucketIssue(
  project: TrackerProjectInput,
  feedback: TrackerFeedbackInput,
  config: TrackerConfig,
): Promise<ExternalIssueResult> {
  const token = process.env.BITBUCKET_TOKEN?.trim();
  if (!token) {
    throw new Error("BITBUCKET_TOKEN is not configured on the server.");
  }

  const ref = resolveBitbucketRef(project.repoUrl, config);
  if (!ref) {
    throw new Error("Configure Bitbucket workspace/repo or a Bitbucket repository URL.");
  }

  const payload = buildGithubIssuePayload(project.name, feedback);
  const res = await fetch(
    `https://api.bitbucket.org/2.0/repositories/${ref.workspace}/${ref.repoSlug}/issues`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        title: payload.title,
        content: { raw: payload.body },
        kind: feedback.type === "bug" ? "bug" : "enhancement",
      }),
    },
  );

  const data = (await res.json().catch(() => null)) as {
    id?: number;
    state?: string;
    links?: { html?: { href?: string } };
    error?: { message?: string };
  } | null;

  if (!res.ok || typeof data?.id !== "number") {
    throw new Error(data?.error?.message || `Bitbucket API returned HTTP ${res.status}`);
  }

  return {
    provider: "bitbucket_issues",
    externalId: String(data.id),
    externalKey: `#${data.id}`,
    externalUrl:
      data.links?.html?.href ||
      `https://bitbucket.org/${ref.workspace}/${ref.repoSlug}/issues/${data.id}`,
    externalStatus: data.state || "new",
  };
}

function resolveGithubRef(repoUrl: string | null | undefined, config: TrackerConfig) {
  if (config.owner?.trim() && config.repo?.trim()) {
    return { owner: config.owner.trim(), repo: config.repo.trim() };
  }
  return extractGithubOwnerRepo(repoUrl);
}

function resolveGitlabRef(repoUrl: string | null | undefined, config: TrackerConfig) {
  let baseUrl = normalizeBaseUrl(config.gitlabBaseUrl) || "https://gitlab.com";
  let projectId = config.gitlabProjectId?.trim() || "";

  if (!projectId && repoUrl) {
    try {
      const url = new URL(repoUrl.includes("://") ? repoUrl : `https://${repoUrl}`);
      baseUrl = `${url.protocol}//${url.host}`;
      projectId = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    } catch {
      // ignore
    }
  }

  return { baseUrl, projectId };
}

function resolveBitbucketRef(repoUrl: string | null | undefined, config: TrackerConfig) {
  if (config.bitbucketWorkspace?.trim() && config.bitbucketRepoSlug?.trim()) {
    return {
      workspace: config.bitbucketWorkspace.trim(),
      repoSlug: config.bitbucketRepoSlug.trim(),
    };
  }
  if (!repoUrl) return null;
  try {
    const url = new URL(repoUrl.includes("://") ? repoUrl : `https://${repoUrl}`);
    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { workspace: parts[0], repoSlug: parts[1].replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim() || "";
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}
