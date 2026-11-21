import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    project: {
      findUnique: vi.fn(),
    },
    feedbackItem: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { POST as submitFeedback } from "@/app/api/submit/[slug]/route";

function makeSubmitRequest(body: unknown, ip: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/submit/demo-app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/submit/[slug]", () => {
  const context = { params: Promise.resolve({ slug: "demo-app" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1" });
  });

  it("returns 404 when the project slug does not exist", async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null);

    const response = await submitFeedback(
      makeSubmitRequest({ title: "Bug", type: "bug" }, "10.0.0.1"),
      context,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Project not found" });
  });

  it("silently accepts honeypot submissions without creating a database record", async () => {
    const response = await submitFeedback(
      makeSubmitRequest({ title: "Spam", type: "bug", website: "https://spam.example" }, "10.0.0.2"),
      context,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockPrisma.feedbackItem.create).not.toHaveBeenCalled();
  });

  it("validates required fields, types, and field lengths", async () => {
    const missingTitle = await submitFeedback(
      makeSubmitRequest({ title: "  ", type: "bug" }, "10.0.0.3"),
      context,
    );
    expect(missingTitle.status).toBe(400);

    const invalidType = await submitFeedback(
      makeSubmitRequest({ title: "Valid title", type: "invalid" }, "10.0.0.4"),
      context,
    );
    expect(invalidType.status).toBe(400);

    const longTitle = await submitFeedback(
      makeSubmitRequest({ title: "x".repeat(201), type: "bug" }, "10.0.0.5"),
      context,
    );
    expect(longTitle.status).toBe(400);

    const longDescription = await submitFeedback(
      makeSubmitRequest(
        { title: "Valid title", type: "bug", description: "x".repeat(5001) },
        "10.0.0.6",
      ),
      context,
    );
    expect(longDescription.status).toBe(400);
  });

  it("creates public_form feedback items when no extension context is present", async () => {
    mockPrisma.feedbackItem.create.mockResolvedValue({
      title: "Button misaligned",
      type: "bug",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await submitFeedback(
      makeSubmitRequest(
        {
          title: "Button misaligned",
          description: "Overlaps header on mobile.",
          type: "bug",
          reporterName: "Alice",
          reporterEmail: "alice@example.com",
        },
        "10.0.0.7",
      ),
      context,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.feedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          title: "Button misaligned",
          description: "Overlaps header on mobile.",
          type: "bug",
          source: "public_form",
          reporterName: "Alice",
          reporterEmail: "alice@example.com",
        }),
      }),
    );
  });

  it("creates extension feedback items and appends delimited page/browser context", async () => {
    mockPrisma.feedbackItem.create.mockResolvedValue({
      title: "Broken chart",
      type: "improvement",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await submitFeedback(
      makeSubmitRequest(
        {
          title: "Broken chart",
          description: "Tooltip cuts off.",
          type: "improvement",
          pageUrl: "https://app.example.com/analytics",
          browserInfo: "Chrome 130 / Windows",
        },
        "10.0.0.8",
      ),
      context,
    );

    expect(response.status).toBe(201);
    expect(mockPrisma.feedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "extension",
          description:
            "Tooltip cuts off.\n\n---\nSubmitted via extension\nPage: https://app.example.com/analytics\nBrowser: Chrome 130 / Windows",
        }),
      }),
    );
  });

  it("enforces per-IP rate limiting after 5 submissions in the window", async () => {
    mockPrisma.feedbackItem.create.mockResolvedValue({
      title: "Rate limit test",
      type: "question",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const ip = "192.0.2.55";
    for (let i = 0; i < 5; i += 1) {
      const response = await submitFeedback(
        makeSubmitRequest({ title: `Item ${i}`, type: "question" }, ip),
        context,
      );
      expect(response.status).toBe(201);
    }

    const blockedResponse = await submitFeedback(
      makeSubmitRequest({ title: "Item 6", type: "question" }, ip),
      context,
    );

    expect(blockedResponse.status).toBe(429);
    expect(await blockedResponse.json()).toEqual({
      error: "Too many submissions. Please try again later.",
    });
  });
});
