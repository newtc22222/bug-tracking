export type GithubRepoRef = {
  owner: string;
  repo: string;
};

export function extractGithubOwnerRepo(repoUrl: string | null | undefined): GithubRepoRef | null {
  const trimmed = typeof repoUrl === "string" ? repoUrl.trim() : "";
  if (!trimmed) {
    return null;
  }

  const slugPattern = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
  if (!trimmed.includes("://") && !trimmed.includes("github.com")) {
    const directMatch = trimmed.match(slugPattern);
    if (!directMatch) {
      return null;
    }
    return { owner: directMatch[1], repo: directMatch[2] };
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== "github.com" && hostname !== "www.github.com") {
      return null;
    }

    const parts = url.pathname
      .replace(/^\/+|\/+$/g, "")
      .split("/")
      .filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/i, "");

    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

export function buildGithubIssuePayload(
  projectName: string,
  feedback: {
    title: string;
    description?: string | null;
    type: string;
    priority?: string | null;
    source: string;
    pageUrl?: string | null;
    browserInfo?: string | null;
    reporterName?: string | null;
    reporterEmail?: string | null;
  },
): { title: string; body: string; labels: string[] } {
  const metadataLines = [
    `- **Project:** ${projectName}`,
    `- **Type:** ${feedback.type}`,
    feedback.priority ? `- **Priority:** ${feedback.priority}` : null,
    `- **Source:** ${feedback.source}`,
    feedback.pageUrl ? `- **Page URL:** ${feedback.pageUrl}` : null,
    feedback.browserInfo ? `- **Browser:** ${feedback.browserInfo}` : null,
    feedback.reporterName || feedback.reporterEmail
      ? `- **Reporter:** ${feedback.reporterName || "Unknown"}${feedback.reporterEmail ? ` (${feedback.reporterEmail})` : ""}`
      : null,
  ].filter(Boolean);

  const sections = [
    feedback.description?.trim() || "No description provided.",
    "",
    "---",
    metadataLines.join("\n"),
  ];

  return {
    title: feedback.title,
    body: sections.join("\n"),
    labels: [feedback.type],
  };
}
