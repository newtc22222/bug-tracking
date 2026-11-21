import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    project: {
      findUnique: vi.fn(),
    },
    feedbackItem: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: mockAuth,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { POST as promoteToGithub } from "@/app/api/feedback/[id]/github/route";
import { POST as submitFeedback } from "@/app/api/submit/[slug]/route";
import { extractGithubOwnerRepo } from "@/lib/github";
import { sendFeedbackNotification } from "@/lib/notifications";

describe("structured context, screenshot validation, and webhook notifications on submit", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("rejects non-image or oversized screenshotDataUrl", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      name: "Demo",
      slug: "demo",
      webhookUrl: null,
    });

    const badFormat = await submitFeedback(
      new NextRequest("http://localhost:3000/api/submit/demo", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.1" },
        body: JSON.stringify({
          title: "Broken UI",
          type: "bug",
          screenshotDataUrl: "https://evil.example/image.png",
        }),
      }),
      { params: Promise.resolve({ slug: "demo" }) },
    );
    expect(badFormat.status).toBe(400);

    const oversized = await submitFeedback(
      new NextRequest("http://localhost:3000/api/submit/demo", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.2" },
        body: JSON.stringify({
          title: "Broken UI",
          type: "bug",
          screenshotDataUrl: `data:image/jpeg;base64,${"a".repeat(2_000_005)}`,
        }),
      }),
      { params: Promise.resolve({ slug: "demo" }) },
    );
    expect(oversized.status).toBe(400);
  });

  it("stores structured context columns, screenshot, and fires Slack/Discord/generic webhook resiliently", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Webhook timeout"));
    vi.stubGlobal("fetch", fetchMock);

    mockPrisma.project.findUnique.mockResolvedValue({
      id: "proj-1",
      name: "Demo",
      slug: "demo",
      webhookUrl: "https://hooks.slack.com/services/T000/B000/XXX",
    });
    mockPrisma.feedbackItem.create.mockResolvedValue({
      id: "fb-1",
      title: "Modal clipped",
      type: "bug",
      createdAt: new Date("2026-11-21T00:00:00.000Z"),
    });

    const response = await submitFeedback(
      new NextRequest("http://localhost:3000/api/submit/demo", {
        method: "POST",
        headers: { "x-forwarded-for": "198.51.100.3" },
        body: JSON.stringify({
          title: "Modal clipped",
          type: "bug",
          pageUrl: "https://app.example.com/settings",
          browserInfo: "Chrome 131",
          screenshotDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
        }),
      }),
      { params: Promise.resolve({ slug: "demo" }) },
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.feedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "extension",
          pageUrl: "https://app.example.com/settings",
          browserInfo: "Chrome 131",
          screenshotDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hooks.slack.com/services/T000/B000/XXX",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("formats Slack, Discord, and generic JSON webhooks properly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const slackRes = await sendFeedbackNotification(
      { id: "p1", name: "App", slug: "app", webhookUrl: "https://hooks.slack.com/services/a/b/c" },
      { title: "Crash", type: "bug", source: "public_form" },
    );
    expect(slackRes).toEqual({ sent: true, format: "slack" });

    const discordRes = await sendFeedbackNotification(
      { id: "p1", name: "App", slug: "app", webhookUrl: "https://discord.com/api/webhooks/123/abc" },
      { title: "Idea", type: "feature", source: "extension" },
    );
    expect(discordRes).toEqual({ sent: true, format: "discord" });

    const genericRes = await sendFeedbackNotification(
      { id: "p1", name: "App", slug: "app", webhookUrl: "https://webhook.example.com/hook" },
      { title: "Question", type: "question", source: "api" },
    );
    expect(genericRes).toEqual({ sent: true, format: "generic" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("GitHub issue promotion", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("extracts owner and repo from GitHub URLs and slugs", () => {
    expect(extractGithubOwnerRepo("https://github.com/acme/bug-tracker")).toEqual({
      owner: "acme",
      repo: "bug-tracker",
    });
    expect(extractGithubOwnerRepo("http://github.com/acme/bug-tracker.git")).toEqual({
      owner: "acme",
      repo: "bug-tracker",
    });
    expect(extractGithubOwnerRepo("acme/bug-tracker")).toEqual({
      owner: "acme",
      repo: "bug-tracker",
    });
    expect(extractGithubOwnerRepo("https://gitlab.com/acme/bug-tracker")).toBeNull();
  });

  it("validates auth, missing repoUrl/token, duplicate promotion, and creates GitHub issue", async () => {
    const context = { params: Promise.resolve({ id: "fb-1" }) };

    mockAuth.mockResolvedValue(null);
    const unauth = await promoteToGithub(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/github", { method: "POST" }),
      context,
    );
    expect(unauth.status).toBe(401);

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });

    mockPrisma.feedbackItem.findUnique.mockResolvedValueOnce({
      id: "fb-1",
      title: "Fix button",
      type: "bug",
      source: "manual",
      githubIssueUrl: "https://github.com/acme/app/issues/1",
      project: { id: "p1", name: "App", slug: "app", repoUrl: "https://github.com/acme/app" },
    });
    const duplicate = await promoteToGithub(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/github", { method: "POST" }),
      context,
    );
    expect(duplicate.status).toBe(409);

    delete process.env.GITHUB_TOKEN;
    mockPrisma.feedbackItem.findUnique.mockResolvedValueOnce({
      id: "fb-1",
      title: "Fix button",
      type: "bug",
      source: "manual",
      githubIssueUrl: null,
      project: { id: "p1", name: "App", slug: "app", repoUrl: "https://github.com/acme/app" },
    });
    const noToken = await promoteToGithub(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/github", { method: "POST" }),
      context,
    );
    expect(noToken.status).toBe(400);

    process.env.GITHUB_TOKEN = "ghp_test";
    mockPrisma.feedbackItem.findUnique.mockResolvedValueOnce({
      id: "fb-1",
      title: "Fix button",
      description: "Broken click handler",
      type: "bug",
      priority: "high",
      source: "extension",
      pageUrl: "https://app.example.com",
      browserInfo: "Chrome",
      reporterName: null,
      reporterEmail: null,
      githubIssueUrl: null,
      project: { id: "p1", name: "App", slug: "app", repoUrl: "https://github.com/acme/app" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            html_url: "https://github.com/acme/app/issues/42",
            number: 42,
          }),
          { status: 201 },
        ),
      ),
    );

    mockPrisma.feedbackItem.update.mockResolvedValue({
      id: "fb-1",
      githubIssueUrl: "https://github.com/acme/app/issues/42",
      githubIssueNumber: 42,
      project: { id: "p1", name: "App", slug: "app" },
    });

    const created = await promoteToGithub(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/github", { method: "POST" }),
      context,
    );

    expect(created.status).toBe(201);
    expect(await created.json()).toEqual(
      expect.objectContaining({
        ok: true,
        githubIssueUrl: "https://github.com/acme/app/issues/42",
        githubIssueNumber: 42,
      }),
    );
  });
});
