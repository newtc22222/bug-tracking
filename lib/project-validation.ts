import { normalizeDomain } from "@/lib/domain";

export type ParsedProjectPayload =
  | {
      ok: true;
      data: {
        name: string;
        domain: string | null;
        repoUrl: string | null;
        description: string | null;
        webhookUrl?: string | null;
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

  return {
    ok: true,
    data: {
      name,
      domain: domain || null,
      repoUrl: repoUrl || null,
      description: description || null,
      ...(hasWebhookUrl ? { webhookUrl } : {}),
    },
  };
}
