import { NextRequest, NextResponse } from "next/server";
import { FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// TODO: Protect admin feedback routes with authentication before deployment.

type RouteContext = {
  params: Promise<{ id: string }>;
};

const feedbackTypes = Object.values(FeedbackType);
const feedbackStatuses = Object.values(FeedbackStatus);
const feedbackPriorities = Object.values(FeedbackPriority);

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const feedbackItem = await prisma.feedbackItem.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!feedbackItem) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  return NextResponse.json(feedbackItem);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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
  const status = typeof payload.status === "string" ? payload.status : "";
  const priority = Object.prototype.hasOwnProperty.call(payload, "priority")
    ? payload.priority
    : undefined;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (!feedbackTypes.includes(type as FeedbackType)) {
    return NextResponse.json({ error: "A valid type is required" }, { status: 400 });
  }

  if (!feedbackStatuses.includes(status as FeedbackStatus)) {
    return NextResponse.json({ error: "A valid status is required" }, { status: 400 });
  }

  if (
    priority !== undefined &&
    priority !== null &&
    (typeof priority !== "string" || !feedbackPriorities.includes(priority as FeedbackPriority))
  ) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  try {
    const feedbackItem = await prisma.feedbackItem.update({
      where: { id },
      data: {
        title,
        description: optionalText(payload.description),
        type: type as FeedbackType,
        status: status as FeedbackStatus,
        ...(priority === undefined
          ? {}
          : { priority: priority as FeedbackPriority | null }),
      },
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json(feedbackItem);
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.feedbackItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    throw error;
  }
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}
