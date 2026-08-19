import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

// TODO: Protect admin project management routes with authentication before deployment.

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
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
  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const project = await prisma.project.create({
    data: {
      name,
      slug,
      repoUrl: repoUrl || null,
      description: description || null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
