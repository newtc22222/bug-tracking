import { NextRequest, NextResponse } from "next/server";
import { FeedbackSource, FeedbackType } from "@prisma/client";
import { sendFeedbackNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { allowRateLimitedAction } from "@/lib/rate-limit";
import { allocateNextTicketKey } from "@/lib/ticket-keys";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;
const MAX_SCREENSHOT_LENGTH = 2_000_000;
const feedbackTypes = Object.values(FeedbackType);

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, webhookUrl: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  // Bots that fill the honeypot receive the same apparent success response as real submissions.
  if (typeof payload.website === "string" && payload.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request);
  if (!(await allowRateLimitedAction(`submit:${ip}`, MAX_SUBMISSIONS_PER_WINDOW, RATE_LIMIT_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = optionalText(payload.description);
  const type = typeof payload.type === "string" ? payload.type : "";
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

  if (!feedbackTypes.includes(type as FeedbackType)) {
    return NextResponse.json({ error: "A valid feedback type is required" }, { status: 400 });
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

  let screenshotDataUrl: string | null = null;
  if (
    Object.prototype.hasOwnProperty.call(payload, "screenshotDataUrl") &&
    payload.screenshotDataUrl !== null &&
    payload.screenshotDataUrl !== undefined
  ) {
    if (typeof payload.screenshotDataUrl !== "string") {
      return NextResponse.json({ error: "Invalid screenshot format" }, { status: 400 });
    }
    const trimmedShot = payload.screenshotDataUrl.trim();
    if (trimmedShot) {
      if (!trimmedShot.startsWith("data:image/")) {
        return NextResponse.json(
          { error: "Screenshot must be a valid image data URL" },
          { status: 400 },
        );
      }
      if (trimmedShot.length > MAX_SCREENSHOT_LENGTH) {
        return NextResponse.json(
          { error: "Screenshot exceeds maximum allowed size" },
          { status: 400 },
        );
      }
      screenshotDataUrl = trimmedShot;
    }
  }

  const descriptionWithContext = appendExtensionContext(description, pageUrl, browserInfo);
  const source: FeedbackSource =
    pageUrl || browserInfo || screenshotDataUrl ? "extension" : "public_form";

  const keyAlloc = await allocateNextTicketKey(project.id);

  const feedbackItem = await prisma.feedbackItem.create({
    data: {
      projectId: project.id,
      ...(keyAlloc.ticketKey
        ? { sequenceNumber: keyAlloc.sequenceNumber, ticketKey: keyAlloc.ticketKey }
        : {}),
      title,
      description: descriptionWithContext,
      type: type as FeedbackType,
      status: "open",
      priority: null,
      source,
      reporterName,
      reporterEmail,
      ...(pageUrl ? { pageUrl } : {}),
      ...(browserInfo ? { browserInfo } : {}),
      ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
    },
    select: {
      id: true,
      title: true,
      type: true,
      createdAt: true,
    },
  });

  if (project.webhookUrl) {
    await sendFeedbackNotification(
      {
        id: project.id,
        name: project.name || slug,
        slug: project.slug || slug,
        webhookUrl: project.webhookUrl,
      },
      {
        id: feedbackItem.id,
        title,
        description: descriptionWithContext,
        type,
        status: "open",
        priority: null,
        source,
        pageUrl,
        reporterName,
        reporterEmail,
      },
    );
  }

  return NextResponse.json({ ok: true, feedback: feedbackItem }, { status: 201 });
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function appendExtensionContext(
  description: string | null,
  pageUrl: string | null,
  browserInfo: string | null,
): string | null {
  if (!pageUrl && !browserInfo) {
    return description;
  }

  const contextBlock = [
    "---",
    "Submitted via extension",
    `Page: ${pageUrl || "(not provided)"}`,
    `Browser: ${browserInfo || "(not provided)"}`,
  ].join("\n");

  return [description, contextBlock].filter(Boolean).join("\n\n");
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
