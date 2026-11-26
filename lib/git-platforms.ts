import type { GitPlatform } from "@prisma/client";

export function detectGitPlatform(repoUrl: string | null | undefined): GitPlatform {
  const trimmed = typeof repoUrl === "string" ? repoUrl.trim().toLowerCase() : "";
  if (!trimmed) return "none";

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (host === "github.com" || host === "www.github.com" || host.includes("github.")) {
      return "github";
    }
    if (host === "gitlab.com" || host === "www.gitlab.com" || host.includes("gitlab.")) {
      return "gitlab";
    }
    if (host === "bitbucket.org" || host === "www.bitbucket.org" || host.includes("bitbucket.")) {
      return "bitbucket";
    }
    if (host === "dev.azure.com" || host.endsWith(".visualstudio.com")) {
      return "azure_devops";
    }
    if (host.includes("gitea.")) {
      return "gitea";
    }
    return "custom";
  } catch {
    return "custom";
  }
}

export function extractRepoDisplayPath(repoUrl: string | null | undefined): string | null {
  const trimmed = typeof repoUrl === "string" ? repoUrl.trim() : "";
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const cleaned = url.pathname
      .replace(/^\/+|\/+$/g, "")
      .replace(/\.git$/i, "");
    return cleaned || url.hostname;
  } catch {
    return trimmed;
  }
}
