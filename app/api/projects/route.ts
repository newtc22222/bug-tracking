import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { detectGitPlatform } from "@/lib/git-platforms";
import { prisma } from "@/lib/prisma";
import { parseProjectPayload } from "@/lib/project-validation";
import { slugify } from "@/lib/slug";
import { generateUniqueKeyPrefix } from "@/lib/ticket-keys";

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

  const keyPrefix = await generateUniqueKeyPrefix(
    parsed.data.keyPrefix,
    parsed.data.name,
    slug,
  );

  const inferredGitPlatform =
    parsed.data.gitPlatform ?? (parsed.data.repoUrl ? detectGitPlatform(parsed.data.repoUrl) : undefined);

  try {
    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        slug,
        keyPrefix,
        domain: parsed.data.domain,
        repoUrl: parsed.data.repoUrl,
        description: parsed.data.description,
        ...(parsed.data.webhookUrl !== undefined ? { webhookUrl: parsed.data.webhookUrl } : {}),
        ...(inferredGitPlatform ? { gitPlatform: inferredGitPlatform } : {}),
        ...(parsed.data.gitDefaultBranch !== undefined
          ? { gitDefaultBranch: parsed.data.gitDefaultBranch }
          : {}),
        ...(parsed.data.trackerPlatform ? { trackerPlatform: parsed.data.trackerPlatform } : {}),
        ...(parsed.data.trackerConfig !== undefined
          ? { trackerConfig: parsed.data.trackerConfig ?? undefined }
          : {}),
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueError(error)) {
      const target = getUniqueTarget(error);
      if (target.includes("keyPrefix")) {
        return NextResponse.json(
          { error: "That project key prefix is already in use" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "That domain is already linked to a project" },
        { status: 409 },
      );
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

function getUniqueTarget(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "meta" in error &&
    typeof error.meta === "object" &&
    error.meta !== null &&
    "target" in error.meta
  ) {
    return String(error.meta.target);
  }
  return "";
}
