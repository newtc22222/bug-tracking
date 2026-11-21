import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    feedbackItem: {
      findMany: vi.fn(),
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

import { POST as runAiTriage } from "@/app/api/feedback/ai-triage/route";
import {
  analyzeFeedbackText,
  analyzeWithHeuristics,
  findDuplicateCandidates,
} from "@/lib/ai-triage";

describe("analyzeWithHeuristics and provider fallback", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it("classifies urgent bugs, cleans title, and preserves extension context", () => {
    const result = analyzeWithHeuristics({
      title: "   checkout page throws 500 crash   ",
      description:
        "Payment fails after clicking submit.\n\n---\nSubmitted via extension\nPage: https://shop.example.com/checkout\nBrowser: Chrome",
    });

    expect(result.cleanedTitle).toBe("Checkout page throws 500 crash");
    expect(result.suggestedType).toBe("bug");
    expect(result.suggestedPriority).toBe("high");
    expect(result.provider).toBe("heuristic");
    expect(result.fallbackUsed).toBe(false);
    expect(result.structuredDescription).toContain("Summary: Checkout page throws 500 crash");
    expect(result.structuredDescription).toContain(
      "---\nSubmitted via extension\nPage: https://shop.example.com/checkout\nBrowser: Chrome",
    );
  });

  it("classifies feature, question, and improvement feedback accurately", () => {
    const feature = analyzeWithHeuristics({
      title: "Add support for dark mode export",
      description: "Feature request to allow users to export reports.",
    });
    expect(feature.suggestedType).toBe("feature");
    expect(feature.suggestedPriority).toBe("medium");

    const question = analyzeWithHeuristics({
      title: "How do I configure SSO?",
      description: "Where can I find documentation for SAML setup?",
    });
    expect(question.suggestedType).toBe("question");
    expect(question.suggestedPriority).toBe("low");

    const improvement = analyzeWithHeuristics({
      title: "Improve button spacing on mobile",
      description: "Minor cosmetic spacing polish on settings card.",
    });
    expect(improvement.suggestedType).toBe("improvement");
    expect(improvement.suggestedPriority).toBe("low");
  });

  it("falls back to heuristic triage when an external provider fails", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "sk-test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    const result = await analyzeFeedbackText({
      title: "cannot login on staging",
      description: "Returns 500 error",
    });

    expect(result.provider).toBe("heuristic");
    expect(result.fallbackUsed).toBe(true);
    expect(result.suggestedType).toBe("bug");
    expect(result.suggestedPriority).toBe("high");
  });
});

describe("findDuplicateCandidates", () => {
  it("ranks matching items above threshold and excludes the current feedback item", () => {
    const candidates = [
      {
        id: "fb-self",
        title: "Checkout payment button throws 500 error",
        description: "Happens on Safari",
        status: "open" as const,
        type: "bug" as const,
        priority: "high" as const,
        createdAt: new Date("2026-11-20T10:00:00.000Z"),
      },
      {
        id: "fb-match",
        title: "Checkout payment submit throws 500 error",
        description: "Users cannot pay on checkout page",
        status: "in_progress" as const,
        type: "bug" as const,
        priority: "high" as const,
        createdAt: new Date("2026-11-19T10:00:00.000Z"),
      },
      {
        id: "fb-unrelated",
        title: "Typo on footer copyright year",
        description: "Says 2024 instead of 2026",
        status: "open" as const,
        type: "improvement" as const,
        priority: "low" as const,
        createdAt: new Date("2026-11-18T10:00:00.000Z"),
      },
    ];

    const duplicates = findDuplicateCandidates({
      title: "Checkout payment button throws 500 error",
      description: "Happens on Safari when submitting checkout",
      candidates,
      excludeId: "fb-self",
    });

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].id).toBe("fb-match");
    expect(duplicates[0].similarity).toBeGreaterThanOrEqual(0.25);
  });
});

describe("POST /api/feedback/ai-triage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await runAiTriage(
      new NextRequest("http://localhost:3000/api/feedback/ai-triage", {
        method: "POST",
        body: JSON.stringify({ title: "Broken login" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });

    const response = await runAiTriage(
      new NextRequest("http://localhost:3000/api/feedback/ai-triage", {
        method: "POST",
        body: JSON.stringify({ title: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Title is required" });
  });

  it("returns analysis and duplicate candidates for authenticated admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.feedbackItem.findMany.mockResolvedValue([
      {
        id: "fb-2",
        title: "Login crash on Safari mobile",
        description: "Browser freezes on submit",
        status: "open",
        type: "bug",
        priority: "high",
        createdAt: new Date("2026-11-20T00:00:00.000Z"),
      },
    ]);

    const response = await runAiTriage(
      new NextRequest("http://localhost:3000/api/feedback/ai-triage", {
        method: "POST",
        body: JSON.stringify({
          projectId: "proj-1",
          feedbackId: "fb-1",
          title: "login crash on safari",
          description: "browser freezes after tapping login",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.analysis.suggestedType).toBe("bug");
    expect(json.analysis.suggestedPriority).toBe("high");
    expect(json.duplicates).toHaveLength(1);
    expect(json.duplicates[0].id).toBe("fb-2");
  });
});
