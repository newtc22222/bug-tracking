import type { GitPlatform, TrackerPlatform } from "@prisma/client";
import { normalizeDomain } from "@/lib/domain";
import { gitPlatformOptions, trackerPlatformOptions } from "@/lib/feedback-display";
import { detectGitPlatform } from "@/lib/git-platforms";
import { normalizeKeyPrefix } from "@/lib/ticket-keys";

export type ParsedProjectPayload =
  | {
      ok: true;
      data: {
        name: string;
        domain: string | null;
        repoUrl: string | null;
        description: string | null;
        webhookUrl?: string | null;
        keyPrefix?: string;
        gitPlatform?: GitPlatform;
        gitDefaultBranch?: string | null;
        trackerPlatform?: TrackerPlatform;
        trackerConfig?: Record<string, string> | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

export function parseProjectPayload(body: unknown): ParsedProjectPayload {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const repoUrl = typeof payload.repoUrl === "string" ? payload.repoUrl.trim() : null;
  const description =
    typeof payload.description === "string" ? payload.description.trim() : null;
  const domain = normalizeDomain(typeof payload.domain === "string" ? payload.domain : "");

  if (domain.length > 253) {
    return { ok: false, error: "Domain must be 253 characters or fewer" };
  }

  const hasWebhookUrl = Object.prototype.hasOwnProperty.call(payload, "webhookUrl");
  let webhookUrl: string | null | undefined;

  if (hasWebhookUrl) {
    if (payload.webhookUrl !== null && typeof payload.webhookUrl !== "string") {
      return { ok: false, error: "Webhook URL must be a valid http(s) URL" };
    }
    const trimmedWebhook =
      typeof payload.webhookUrl === "string" ? payload.webhookUrl.trim() : "";
    if (trimmedWebhook && !/^https?:\/\//i.test(trimmedWebhook)) {
      return { ok: false, error: "Webhook URL must start with http:// or https://" };
    }
    webhookUrl = trimmedWebhook || null;
  }

  const hasKeyPrefix = Object.prototype.hasOwnProperty.call(payload, "keyPrefix");
  let keyPrefix: string | undefined;
  if (hasKeyPrefix && typeof payload.keyPrefix === "string" && payload.keyPrefix.trim()) {
    const normalized = normalizeKeyPrefix(payload.keyPrefix);
    if (normalized.length < 2 || normalized.length > 8) {
      return { ok: false, error: "Project key prefix must be 2 to 8 letters or numbers" };
    }
    keyPrefix = normalized;
  }

  const hasGitPlatform = Object.prototype.hasOwnProperty.call(payload, "gitPlatform");
  let gitPlatform: GitPlatform | undefined;
  if (hasGitPlatform) {
    if (
      typeof payload.gitPlatform !== "string" ||
      !gitPlatformOptions.includes(payload.gitPlatform as GitPlatform)
    ) {
      return { ok: false, error: "Invalid git platform" };
    }
    gitPlatform = payload.gitPlatform as GitPlatform;
    if (gitPlatform === "none" && repoUrl) {
      gitPlatform = detectGitPlatform(repoUrl);
    }
  }

  const hasGitBranch = Object.prototype.hasOwnProperty.call(payload, "gitDefaultBranch");
  let gitDefaultBranch: string | null | undefined;
  if (hasGitBranch) {
    gitDefaultBranch =
      typeof payload.gitDefaultBranch === "string" && payload.gitDefaultBranch.trim()
        ? payload.gitDefaultBranch.trim().slice(0, 100)
        : null;
  }

  const hasTrackerPlatform = Object.prototype.hasOwnProperty.call(payload, "trackerPlatform");
  let trackerPlatform: TrackerPlatform | undefined;
  if (hasTrackerPlatform) {
    if (
      typeof payload.trackerPlatform !== "string" ||
      !trackerPlatformOptions.includes(payload.trackerPlatform as TrackerPlatform)
    ) {
      return { ok: false, error: "Invalid tracker platform" };
    }
    trackerPlatform = payload.trackerPlatform as TrackerPlatform;
  }

  const hasTrackerConfig = Object.prototype.hasOwnProperty.call(payload, "trackerConfig");
  let trackerConfig: Record<string, string> | null | undefined;
  if (hasTrackerConfig) {
    if (payload.trackerConfig === null) {
      trackerConfig = null;
    } else if (
      typeof payload.trackerConfig === "object" &&
      !Array.isArray(payload.trackerConfig)
    ) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(payload.trackerConfig as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) {
          cleaned[k] = v.trim().slice(0, 300);
        }
      }
      trackerConfig = Object.keys(cleaned).length > 0 ? cleaned : null;
    } else {
      return { ok: false, error: "Invalid tracker config" };
    }
  }

  return {
    ok: true,
    data: {
      name,
      domain: domain || null,
      repoUrl: repoUrl || null,
      description: description || null,
      ...(hasWebhookUrl ? { webhookUrl } : {}),
      ...(keyPrefix ? { keyPrefix } : {}),
      ...(gitPlatform ? { gitPlatform } : {}),
      ...(hasGitBranch ? { gitDefaultBranch } : {}),
      ...(trackerPlatform ? { trackerPlatform } : {}),
      ...(hasTrackerConfig ? { trackerConfig } : {}),
    },
  };
}
