import { NextRequest, NextResponse } from "next/server";
import { generateApiKey } from "@/lib/api-keys";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id: projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const apiKeys = await prisma.projectApiKey.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(apiKeys);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id: projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Key name is required" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json(
      { error: "Key name must be 100 characters or fewer" },
      { status: 400 },
    );
  }

  const { rawKey, keyPrefix, keyHash } = generateApiKey();
  const apiKey = await prisma.projectApiKey.create({
    data: {
      projectId,
      name,
      keyPrefix,
      keyHash,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ apiKey, rawKey }, { status: 201 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id: projectId } = await context.params;
  const keyId = request.nextUrl.searchParams.get("keyId")?.trim() || "";

  if (!keyId) {
    return NextResponse.json({ error: "keyId query parameter is required" }, { status: 400 });
  }

  const existing = await prisma.projectApiKey.findFirst({
    where: { id: keyId, projectId },
    select: { id: true, revokedAt: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  if (!existing.revokedAt) {
    await prisma.projectApiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
