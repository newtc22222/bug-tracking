import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { buildGithubIssuePayload, extractGithubOwnerRepo } from "@/lib/github";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  const feedback = await prisma.feedbackItem.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, slug: true, repoUrl: true },
      },
    },
  });

  if (!feedback) {
    return NextResponse.json({ error: "Feedback item not found" }, { status: 404 });
  }

  if (feedback.githubIssueUrl) {
    return NextResponse.json(
      { error: "This feedback item is already linked to a GitHub issue" },
      { status: 409 },
    );
  }

  const repoRef = extractGithubOwnerRepo(feedback.project.repoUrl);
  if (!repoRef) {
    return NextResponse.json(
      { error: "Project does not have a valid GitHub repository URL" },
      { status: 400 },
    );
  }

  const githubToken = process.env.GITHUB_TOKEN?.trim();
  if (!githubToken) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN is not configured on the server" },
      { status: 400 },
    );
  }

  const issuePayload = buildGithubIssuePayload(feedback.project.name, feedback);

  let ghResponse: Response;
  try {
    ghResponse = await fetch(
      `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}/issues`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "bug-tracking-app",
        },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify(issuePayload),
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach GitHub API" },
      { status: 502 },
    );
  }

  const ghData = (await ghResponse.json().catch(() => null)) as {
    html_url?: string;
    number?: number;
    message?: string;
  } | null;

  if (!ghResponse.ok || !ghData?.html_url || typeof ghData.number !== "number") {
    return NextResponse.json(
      { error: ghData?.message || `GitHub API returned HTTP ${ghResponse.status}` },
      { status: 502 },
    );
  }

  const updated = await prisma.feedbackItem.update({
    where: { id },
    data: {
      githubIssueUrl: ghData.html_url,
      githubIssueNumber: ghData.number,
    },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return NextResponse.json(
    {
      ok: true,
      githubIssueUrl: ghData.html_url,
      githubIssueNumber: ghData.number,
      feedbackItem: updated,
    },
    { status: 201 },
  );
}
