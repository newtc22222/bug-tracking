import { NextRequest, NextResponse } from "next/server";
import { analyzeFeedbackText, findDuplicateCandidates } from "@/lib/ai-triage";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
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

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const description = typeof payload.description === "string" ? payload.description : "";
  const projectId = typeof payload.projectId === "string" ? payload.projectId.trim() : "";
  const feedbackId = typeof payload.feedbackId === "string" ? payload.feedbackId.trim() : undefined;
  const currentType = typeof payload.type === "string" ? payload.type : undefined;
  const currentPriority = typeof payload.priority === "string" ? payload.priority : undefined;

  const analysis = await analyzeFeedbackText({
    title,
    description,
    currentType,
    currentPriority,
  });

  const candidates = projectId
    ? await prisma.feedbackItem.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          type: true,
          priority: true,
          createdAt: true,
        },
      })
    : [];

  const duplicates = findDuplicateCandidates({
    title,
    description,
    candidates,
    excludeId: feedbackId,
  });

  return NextResponse.json({ analysis, duplicates });
}
