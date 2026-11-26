import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProjectPayload } from "@/lib/project-validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  const project = await prisma.project.findUnique({ where: { id } });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseProjectPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updateData: Prisma.ProjectUpdateInput = {
    name: parsed.data.name,
    domain: parsed.data.domain,
    repoUrl: parsed.data.repoUrl,
    description: parsed.data.description,
    ...(parsed.data.webhookUrl !== undefined ? { webhookUrl: parsed.data.webhookUrl } : {}),
    ...(parsed.data.keyPrefix !== undefined ? { keyPrefix: parsed.data.keyPrefix } : {}),
    ...(parsed.data.gitPlatform !== undefined ? { gitPlatform: parsed.data.gitPlatform } : {}),
    ...(parsed.data.gitDefaultBranch !== undefined
      ? { gitDefaultBranch: parsed.data.gitDefaultBranch }
      : {}),
    ...(parsed.data.trackerPlatform !== undefined
      ? { trackerPlatform: parsed.data.trackerPlatform }
      : {}),
    ...(parsed.data.trackerConfig !== undefined
      ? {
          trackerConfig:
            parsed.data.trackerConfig === null
              ? Prisma.JsonNull
              : (parsed.data.trackerConfig as Prisma.InputJsonValue),
        }
      : {}),
  };

  try {
    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(project);
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (isPrismaUniqueError(error)) {
      return NextResponse.json(
        { error: "That domain or project key prefix is already linked to another project" },
        { status: 409 },
      );
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
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    throw error;
  }
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2025"
  );
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
