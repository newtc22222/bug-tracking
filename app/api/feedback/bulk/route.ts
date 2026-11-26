import { NextRequest, NextResponse } from "next/server";
import type { FeedbackPriority, FeedbackStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/auth";
import { priorityOptions, statusOptions } from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";
import { canTransitionStatus } from "@/lib/workflow";

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth.errorResponse) return auth.errorResponse;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rawIds = body?.ids;
  const action = typeof body?.action === "string" ? body.action : "";

  if (!Array.isArray(rawIds) || rawIds.length === 0 || !rawIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "At least one ticket id is required" }, { status: 400 });
  }

  const ids = Array.from(new Set(rawIds)).slice(0, 100);

  if (action === "delete") {
    const result = await prisma.feedbackItem.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, updated: result.count, skipped: 0 });
  }

  if (action === "priority") {
    const value = body?.value;
    if (
      value !== null &&
      (typeof value !== "string" || !priorityOptions.includes(value as FeedbackPriority))
    ) {
      return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
    }
    const result = await prisma.feedbackItem.updateMany({
      where: { id: { in: ids } },
      data: { priority: value as FeedbackPriority | null },
    });
    return NextResponse.json({ ok: true, updated: result.count, skipped: 0 });
  }

  if (action === "status") {
    const targetStatus = typeof body?.value === "string" ? body.value : "";
    if (!statusOptions.includes(targetStatus as FeedbackStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    const nextStatus = targetStatus as FeedbackStatus;
    const existing = await prisma.feedbackItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });

    const eligible = existing.filter(
      (item) => item.status !== nextStatus && canTransitionStatus(item.status, nextStatus),
    );
    const skipped = existing.length - eligible.length;

    if (eligible.length > 0) {
      await prisma.$transaction([
        prisma.feedbackItem.updateMany({
          where: { id: { in: eligible.map((e) => e.id) } },
          data: { status: nextStatus },
        }),
        prisma.feedbackStatusEvent.createMany({
          data: eligible.map((e) => ({
            feedbackItemId: e.id,
            fromStatus: e.status,
            toStatus: nextStatus,
            actorEmail: auth.email,
          })),
        }),
      ]);
    }

    return NextResponse.json({ ok: true, updated: eligible.length, skipped });
  }

  if (action === "add_label") {
    const labelId = typeof body?.value === "string" ? body.value.trim() : "";
    if (!labelId) {
      return NextResponse.json({ error: "labelId value is required" }, { status: 400 });
    }
    await prisma.feedbackLabel.createMany({
      data: ids.map((feedbackItemId) => ({ feedbackItemId, labelId })),
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true, updated: ids.length, skipped: 0 });
  }

  return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
}
