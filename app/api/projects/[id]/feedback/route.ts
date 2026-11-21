import { NextRequest, NextResponse } from "next/server";
import {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";
import { requireAdminApiSession } from "@/lib/auth";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const feedbackTypes = Object.values(FeedbackType);
const feedbackStatuses = Object.values(FeedbackStatus);
const feedbackPriorities = Object.values(FeedbackPriority);
const feedbackSources = Object.values(FeedbackSource);

export async function GET(request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id: projectId } = await context.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const parsed = parseFeedbackQueryParams(request.nextUrl.searchParams, { projectId });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const feedbackItems = await prisma.feedbackItem.findMany({
    where: parsed.where,
    orderBy: parsed.orderBy,
  });

  return NextResponse.json(feedbackItems);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id: projectId } = await context.params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const type = typeof payload.type === "string" ? payload.type : "";
  const status = typeof payload.status === "string" ? payload.status : FeedbackStatus.open;
  const priority = typeof payload.priority === "string" ? payload.priority : null;
  const source = typeof payload.source === "string" ? payload.source : FeedbackSource.manual;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!feedbackTypes.includes(type as FeedbackType)) {
    return NextResponse.json({ error: "A valid type is required" }, { status: 400 });
  }

  if (!feedbackStatuses.includes(status as FeedbackStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (priority !== null && !feedbackPriorities.includes(priority as FeedbackPriority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  if (!feedbackSources.includes(source as FeedbackSource)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const description = optionalText(payload.description);
  const reporterName = optionalText(payload.reporterName);
  const reporterEmail = optionalText(payload.reporterEmail);

  const feedbackItem = await prisma.feedbackItem.create({
    data: {
      projectId,
      title,
      description,
      type: type as FeedbackType,
      status: status as FeedbackStatus,
      priority: priority as FeedbackPriority | null,
      source: source as FeedbackSource,
      reporterName,
      reporterEmail,
    },
  });

  return NextResponse.json(feedbackItem, { status: 201 });
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
