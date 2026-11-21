import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseProjectPayload } from "@/lib/project-validation";
import { slugify } from "@/lib/slug";

export async function GET() {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          feedbackItems: {
            where: { status: "open" },
          },
        },
      },
    },
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

  const parsed = parseProjectPayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.name) || "project";
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  try {
    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        slug,
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
