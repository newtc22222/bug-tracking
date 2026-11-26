import { NextRequest, NextResponse } from "next/server";
import type { TrackerPlatform } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/auth";
import { trackerPlatformOptions } from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";
import {
  createExternalTrackerIssue,
  syncExternalTrackerStatus,
  type TrackerConfig,
} from "@/lib/trackers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const feedback = await prisma.feedbackItem.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          repoUrl: true,
          trackerPlatform: true,
          trackerConfig: true,
        },
      },
      externalLinks: true,
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  // Optional manual link mode: { mode: "manual", provider, externalKey, externalUrl }
  if (body.mode === "manual") {
    const provider =
      typeof body.provider === "string" &&
      trackerPlatformOptions.includes(body.provider as TrackerPlatform) &&
      body.provider !== "none"
        ? (body.provider as TrackerPlatform)
        : feedback.project.trackerPlatform;

    const externalUrl = typeof body.externalUrl === "string" ? body.externalUrl.trim() : "";
    const externalKey = typeof body.externalKey === "string" ? body.externalKey.trim() : "";

    if (!provider || provider === "none") {
      return NextResponse.json({ error: "Select a tracker platform" }, { status: 400 });
    }
    if (!externalUrl || !/^https?:\/\//i.test(externalUrl)) {
      return NextResponse.json({ error: "A valid http(s) issue URL is required" }, { status: 400 });
    }
    const derivedKey = externalKey || externalUrl.split("/").filter(Boolean).pop() || "linked";

    const created = await prisma.externalIssueLink.create({
      data: {
        feedbackItemId: id,
        provider,
        externalId: derivedKey,
        externalKey: derivedKey,
        externalUrl,
        externalStatus: "linked",
      },
    });

    return NextResponse.json({ ok: true, link: created }, { status: 201 });
  }

  const targetProvider =
    typeof body.provider === "string" &&
    trackerPlatformOptions.includes(body.provider as TrackerPlatform) &&
    body.provider !== "none"
      ? (body.provider as TrackerPlatform)
      : feedback.project.trackerPlatform;

  if (!targetProvider || targetProvider === "none") {
    return NextResponse.json(
      { error: "Configure an issue tracking platform on this project first." },
      { status: 400 },
    );
  }

  try {
    const result = await createExternalTrackerIssue({
      project: {
        ...feedback.project,
        trackerPlatform: targetProvider,
        trackerConfig: (feedback.project.trackerConfig || null) as TrackerConfig | null,
      },
      feedback,
    });

    const link = await prisma.externalIssueLink.create({
      data: {
        feedbackItemId: id,
        provider: result.provider,
        externalId: result.externalId,
        externalKey: result.externalKey,
        externalUrl: result.externalUrl,
        externalStatus: result.externalStatus,
      },
    });

    if (result.provider === "github_issues" && !feedback.githubIssueUrl) {
      const num = Number.parseInt(result.externalId, 10);
      await prisma.feedbackItem.update({
        where: { id },
        data: {
          githubIssueUrl: result.externalUrl,
          githubIssueNumber: Number.isNaN(num) ? null : num,
        },
      });
    }

    return NextResponse.json({ ok: true, link }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to promote issue" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const linkId = typeof body.linkId === "string" ? body.linkId.trim() : "";

  if (!linkId) {
    return NextResponse.json({ error: "linkId is required" }, { status: 400 });
  }

  const link = await prisma.externalIssueLink.findUnique({
    where: { id: linkId },
    include: {
      feedbackItem: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              repoUrl: true,
              trackerPlatform: true,
              trackerConfig: true,
            },
          },
        },
      },
    },
  });

  if (!link || link.feedbackItemId !== id) {
    return NextResponse.json({ error: "External link not found" }, { status: 404 });
  }

  try {
    const synced = await syncExternalTrackerStatus({
      project: {
        ...link.feedbackItem.project,
        trackerConfig: (link.feedbackItem.project.trackerConfig || null) as TrackerConfig | null,
      },
      provider: link.provider,
      externalId: link.externalId,
    });

    const updated = await prisma.externalIssueLink.update({
      where: { id: linkId },
      data: {
        externalStatus: synced.externalStatus,
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, link: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync status" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const linkId = request.nextUrl.searchParams.get("linkId")?.trim();
  if (!linkId) {
    return NextResponse.json({ error: "linkId is required" }, { status: 400 });
  }

  const link = await prisma.externalIssueLink.findUnique({ where: { id: linkId } });
  if (!link || link.feedbackItemId !== id) {
    return NextResponse.json({ error: "External link not found" }, { status: 404 });
  }

  await prisma.externalIssueLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
