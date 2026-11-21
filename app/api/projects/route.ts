import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/domain";
import { slugify } from "@/lib/slug";

export async function GET() {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

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

  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        slug,
        domain: domain || null,
        repoUrl: repoUrl || null,
        description: description || null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      return NextResponse.json({ error: "That domain is already linked to a project" }, { status: 409 });
    }

    throw error;
  }
}

function isPrismaUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
