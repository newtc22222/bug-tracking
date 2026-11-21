import { NextRequest, NextResponse } from "next/server";
import { FeedbackPriority, FeedbackType } from "@prisma/client";
import { hashApiKey } from "@/lib/api-keys";
import { priorityOptions, typeOptions } from "@/lib/feedback-display";
import { sendFeedbackNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401 });
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.projectApiKey.findUnique({
    where: { keyHash },
    include: {
      project: {
        select: { id: true, name: true, slug: true, webhookUrl: true },
      },
    },
  });

  if (!apiKey || apiKey.revokedAt !== null) {
    return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = optionalText(payload.description);
  const type = typeof payload.type === "string" ? payload.type : "";
  const priority = Object.prototype.hasOwnProperty.call(payload, "priority")
    ? payload.priority
    : null;
  const reporterName = optionalText(payload.reporterName);
  const reporterEmail = optionalText(payload.reporterEmail);
  const pageUrl = optionalText(payload.pageUrl);
  const browserInfo = optionalText(payload.browserInfo);

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (title.length > 200) {
    return NextResponse.json({ error: "Title must be 200 characters or fewer" }, { status: 400 });
  }

  if (description && description.length > 5000) {
    return NextResponse.json(
      { error: "Description must be 5000 characters or fewer" },
      { status: 400 },
    );
  }

  if (!typeOptions.includes(type as FeedbackType)) {
    return NextResponse.json({ error: "A valid feedback type is required" }, { status: 400 });
  }

  if (
    priority !== null &&
    (typeof priority !== "string" || !priorityOptions.includes(priority as FeedbackPriority))
  ) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  if (reporterName && reporterName.length > 200) {
    return NextResponse.json(
      { error: "Name must be 200 characters or fewer" },
      { status: 400 },
    );
  }

  if (reporterEmail && reporterEmail.length > 320) {
    return NextResponse.json(
      { error: "Email must be 320 characters or fewer" },
      { status: 400 },
    );
  }

  if (pageUrl && pageUrl.length > 2000) {
    return NextResponse.json(
      { error: "Page URL must be 2000 characters or fewer" },
      { status: 400 },
    );
  }

  if (browserInfo && browserInfo.length > 500) {
    return NextResponse.json(
      { error: "Browser information must be 500 characters or fewer" },
      { status: 400 },
    );
  }

  const feedback = await prisma.feedbackItem.create({
    data: {
      projectId: apiKey.projectId,
      title,
      description,
      type: type as FeedbackType,
      status: "open",
      priority: priority as FeedbackPriority | null,
      source: "api",
      reporterName,
      reporterEmail,
      ...(pageUrl ? { pageUrl } : {}),
      ...(browserInfo ? { browserInfo } : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      source: true,
      createdAt: true,
    },
  });

  if (typeof prisma.projectApiKey?.update === "function") {
    await prisma.projectApiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => null);
  }

  if (apiKey.project.webhookUrl) {
    await sendFeedbackNotification(apiKey.project, {
      id: feedback.id,
      title,
      description,
      type,
      status: "open",
      priority: (priority as string | null) ?? null,
      source: "api",
      pageUrl,
      reporterName,
      reporterEmail,
    });
  }

  return NextResponse.json({ ok: true, feedback }, { status: 201 });
}

function extractApiKey(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader && /^bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^bearer\s+/i, "").trim();
  }

  return request.headers.get("x-api-key")?.trim() || "";
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
