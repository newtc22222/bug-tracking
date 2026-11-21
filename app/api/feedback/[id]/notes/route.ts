import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession, requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  const feedbackItem = await prisma.feedbackItem.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!feedbackItem) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  const [notes, statusEvents] = await Promise.all([
    prisma.feedbackNote.findMany({
      where: { feedbackItemId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feedbackStatusEvent.findMany({
      where: { feedbackItemId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ notes, statusEvents });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdminSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const { id } = await context.params;
  const feedbackItem = await prisma.feedbackItem.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!feedbackItem) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
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
  const noteBody = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!noteBody) {
    return NextResponse.json({ error: "Note body is required" }, { status: 400 });
  }

  if (noteBody.length > 5000) {
    return NextResponse.json(
      { error: "Note must be 5000 characters or fewer" },
      { status: 400 },
    );
  }

  const note = await prisma.feedbackNote.create({
    data: {
      feedbackItemId: id,
      authorEmail: authResult.email,
      body: noteBody,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
