import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { TrackerPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

const providerMap: Record<string, TrackerPlatform> = {
  github: "github_issues",
  github_issues: "github_issues",
  gitlab: "gitlab_issues",
  gitlab_issues: "gitlab_issues",
  linear: "linear",
  jira: "jira",
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { provider: rawProvider } = await context.params;
  const provider = providerMap[rawProvider.toLowerCase()];

  if (!provider) {
    return NextResponse.json({ error: "Unsupported webhook provider" }, { status: 400 });
  }

  const rawBody = await request.text();

  const webhookSecret = process.env.TRACKER_WEBHOOK_SECRET?.trim();
  if (webhookSecret && !verifyWebhookSignature(request, rawBody, webhookSecret, provider)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = extractIssueUpdate(provider, payload);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const matchingLinks = await prisma.externalIssueLink.findMany({
    where: {
      provider,
      OR: [
        { externalId: parsed.externalId },
        ...(parsed.externalKey ? [{ externalKey: parsed.externalKey }] : []),
        ...(parsed.externalUrl ? [{ externalUrl: parsed.externalUrl }] : []),
      ],
    },
  });

  let updatedCount = 0;
  for (const link of matchingLinks) {
    const previousStatus = link.externalStatus;
    await prisma.externalIssueLink.update({
      where: { id: link.id },
      data: {
        externalStatus: parsed.nextStatus,
        lastSyncedAt: new Date(),
      },
    });
    updatedCount += 1;

    if (previousStatus !== parsed.nextStatus) {
      await prisma.feedbackNote.create({
        data: {
          feedbackItemId: link.feedbackItemId,
          authorEmail: `webhook:${rawProvider.toLowerCase()}`,
          body: `External tracker **${link.externalKey}** status updated: \`${previousStatus || "unknown"}\` → \`${parsed.nextStatus}\`.`,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    provider,
    externalId: parsed.externalId,
    externalStatus: parsed.nextStatus,
    updatedLinks: updatedCount,
  });
}

function verifyWebhookSignature(
  request: NextRequest,
  rawBody: string,
  secret: string,
  provider: TrackerPlatform,
): boolean {
  const genericHeader = request.headers.get("x-webhook-secret")?.trim();
  if (genericHeader && timingSafeEqual(genericHeader, secret)) {
    return true;
  }

  if (provider === "github_issues") {
    const sig = request.headers.get("x-hub-signature-256")?.trim() || "";
    const expected = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    return timingSafeEqual(sig, expected);
  }

  if (provider === "gitlab_issues") {
    const token = request.headers.get("x-gitlab-token")?.trim() || "";
    return timingSafeEqual(token, secret);
  }

  if (provider === "linear") {
    const sig = request.headers.get("linear-signature")?.trim() || "";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return timingSafeEqual(sig, expected);
  }

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function extractIssueUpdate(
  provider: TrackerPlatform,
  payload: Record<string, unknown>,
): { externalId: string; externalKey?: string; externalUrl?: string; nextStatus: string } | null {
  if (provider === "github_issues") {
    const issue = payload.issue as Record<string, unknown> | undefined;
    if (!issue || typeof issue.number !== "number" || typeof issue.state !== "string") {
      return null;
    }
    return {
      externalId: String(issue.number),
      externalKey: `#${issue.number}`,
      externalUrl: typeof issue.html_url === "string" ? issue.html_url : undefined,
      nextStatus: issue.state,
    };
  }

  if (provider === "gitlab_issues") {
    const attrs = payload.object_attributes as Record<string, unknown> | undefined;
    if (!attrs || typeof attrs.iid !== "number" || typeof attrs.state !== "string") {
      return null;
    }
    return {
      externalId: String(attrs.iid),
      externalKey: `#${attrs.iid}`,
      externalUrl: typeof attrs.url === "string" ? attrs.url : undefined,
      nextStatus: attrs.state,
    };
  }

  if (provider === "linear") {
    const data = payload.data as Record<string, unknown> | undefined;
    const state = data?.state as Record<string, unknown> | undefined;
    if (!data || typeof data.id !== "string" || typeof state?.name !== "string") {
      return null;
    }
    return {
      externalId: data.id,
      externalKey: typeof data.identifier === "string" ? data.identifier : undefined,
      externalUrl: typeof data.url === "string" ? data.url : undefined,
      nextStatus: state.name,
    };
  }

  if (provider === "jira") {
    const issue = payload.issue as Record<string, unknown> | undefined;
    const fields = issue?.fields as Record<string, unknown> | undefined;
    const status = fields?.status as Record<string, unknown> | undefined;
    if (!issue || typeof issue.key !== "string" || typeof status?.name !== "string") {
      return null;
    }
    return {
      externalId: issue.key,
      externalKey: issue.key,
      nextStatus: status.name,
    };
  }

  return null;
}
