import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/domain";

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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const name = typeof payload.name === "string" ? payload.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const repoUrl = typeof payload.repoUrl === "string" ? payload.repoUrl.trim() : null;
  const description =
    typeof payload.description === "string" ? payload.description.trim() : null;
  const domain = normalizeDomain(typeof payload.domain === "string" ? payload.domain : "");

  if (domain.length > 253) {
    return NextResponse.json({ error: "Domain must be 253 characters or fewer" }, { status: 400 });
  }

  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        domain: domain || null,
        repoUrl: repoUrl || null,
        description: description || null,
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (isPrismaUniqueError(error)) {
      return NextResponse.json({ error: "That domain is already linked to a project" }, { status: 409 });
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
