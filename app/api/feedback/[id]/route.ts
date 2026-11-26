import { NextRequest, NextResponse } from "next/server";
import { FeedbackPriority, FeedbackStatus, FeedbackType, Prisma } from "@prisma/client";
import { requireAdminApiSession, requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canTransitionStatus, getTransitionErrorMessage } from "@/lib/workflow";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const feedbackTypes = Object.values(FeedbackType);
const feedbackStatuses = Object.values(FeedbackStatus);
const feedbackPriorities = Object.values(FeedbackPriority);

export async function GET(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  const feedbackItem = await prisma.feedbackItem.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          keyPrefix: true,
          gitPlatform: true,
          repoUrl: true,
          trackerPlatform: true,
          trackerConfig: true,
        },
      },
      externalLinks: {
        orderBy: { createdAt: "desc" },
      },
      labels: {
        include: { label: true },
      },
    },
  });

  if (!feedbackItem) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  return NextResponse.json(feedbackItem);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

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
    const previousStatus = await readPreviousStatus(id);

    if (previousStatus && !canTransitionStatus(previousStatus, status as FeedbackStatus)) {
      return NextResponse.json(
        { error: getTransitionErrorMessage(previousStatus, status as FeedbackStatus) },
        { status: 400 },
      );
    }

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
          select: {
            id: true,
            name: true,
            slug: true,
            keyPrefix: true,
            gitPlatform: true,
            repoUrl: true,
            trackerPlatform: true,
            trackerConfig: true,
          },
        },
        externalLinks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    await recordStatusTransitionIfChanged({
      feedbackItemId: id,
      fromStatus: previousStatus,
      toStatus: status as FeedbackStatus,
      actorEmail: authResult.email,
    });

    return NextResponse.json(feedbackItem);
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    throw error;
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const { id } = await context.params;
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
  const updateData: Prisma.FeedbackItemUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(payload, "title")) {
    const title = typeof payload.title === "string" ? payload.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    updateData.title = title;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "description")) {
    if (payload.description !== null && typeof payload.description !== "string") {
      return NextResponse.json({ error: "Invalid description" }, { status: 400 });
    }
    updateData.description = optionalText(payload.description);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "type")) {
    if (typeof payload.type !== "string" || !feedbackTypes.includes(payload.type as FeedbackType)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    updateData.type = payload.type as FeedbackType;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "status")) {
    if (
      typeof payload.status !== "string" ||
      !feedbackStatuses.includes(payload.status as FeedbackStatus)
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updateData.status = payload.status as FeedbackStatus;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "priority")) {
    if (
      payload.priority !== null &&
      (typeof payload.priority !== "string" ||
        !feedbackPriorities.includes(payload.priority as FeedbackPriority))
    ) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    updateData.priority = payload.priority as FeedbackPriority | null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "At least one field is required" }, { status: 400 });
  }

  try {
    const nextStatus =
      typeof updateData.status === "string" ? (updateData.status as FeedbackStatus) : undefined;
    const previousStatus = nextStatus ? await readPreviousStatus(id) : undefined;

    if (nextStatus && previousStatus && !canTransitionStatus(previousStatus, nextStatus)) {
      return NextResponse.json(
        { error: getTransitionErrorMessage(previousStatus, nextStatus) },
        { status: 400 },
      );
    }

    const feedbackItem = await prisma.feedbackItem.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (nextStatus) {
      await recordStatusTransitionIfChanged({
        feedbackItemId: id,
        fromStatus: previousStatus,
        toStatus: nextStatus,
        actorEmail: authResult.email,
      });
    }

    return NextResponse.json(feedbackItem);
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

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

async function readPreviousStatus(id: string): Promise<FeedbackStatus | undefined> {
  if (typeof prisma.feedbackItem?.findUnique !== "function") {
    return undefined;
  }

  const existing = await prisma.feedbackItem.findUnique({
    where: { id },
    select: { status: true },
  });

  return existing?.status;
}

async function recordStatusTransitionIfChanged({
  feedbackItemId,
  fromStatus,
  toStatus,
  actorEmail,
}: {
  feedbackItemId: string;
  fromStatus: FeedbackStatus | undefined;
  toStatus: FeedbackStatus;
  actorEmail: string;
}): Promise<void> {
  if (
    !fromStatus ||
    fromStatus === toStatus ||
    typeof prisma.feedbackStatusEvent?.create !== "function"
  ) {
    return;
  }

  await prisma.feedbackStatusEvent.create({
    data: {
      feedbackItemId,
      fromStatus,
      toStatus,
      actorEmail,
    },
  });
}
