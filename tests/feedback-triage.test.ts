import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    feedbackItem: {
      findMany: vi.fn(),
      count: vi.fn(),
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

import { GET as listGlobalFeedback } from "@/app/api/feedback/route";
import { PATCH as patchFeedback } from "@/app/api/feedback/[id]/route";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";

describe("parseFeedbackQueryParams", () => {
  it("builds filters, search OR clauses, sort orders, and pagination defaults", () => {
    const result = parseFeedbackQueryParams(
      new URLSearchParams("q=%20login%20&status=open&type=bug&priority=none&source=extension&sort=priority_desc&page=2&pageSize=15"),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.filters).toEqual({
      q: "login",
      projectId: undefined,
      status: "open",
      type: "bug",
      priority: "none",
      source: "extension",
      sort: "priority_desc",
    });
    expect(result.where).toEqual({
      status: "open",
      type: "bug",
      priority: null,
      source: "extension",
      OR: [
        { ticketKey: { contains: "login", mode: "insensitive" } },
        { title: { contains: "login", mode: "insensitive" } },
        { description: { contains: "login", mode: "insensitive" } },
        { reporterName: { contains: "login", mode: "insensitive" } },
        { reporterEmail: { contains: "login", mode: "insensitive" } },
      ],
    });
    expect(result.orderBy).toEqual([
      { priority: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ]);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(15);
    expect(result.skip).toBe(15);
    expect(result.take).toBe(15);
  });

  it("applies default pagination and clamps pageSize to 100", () => {
    const defaults = parseFeedbackQueryParams({});
    expect(defaults.ok).toBe(true);
    if (defaults.ok) {
      expect(defaults.page).toBe(1);
      expect(defaults.pageSize).toBe(20);
      expect(defaults.skip).toBe(0);
      expect(defaults.take).toBe(20);
      expect(defaults.orderBy).toEqual({ createdAt: "desc" });
    }

    const clamped = parseFeedbackQueryParams({ pageSize: "250", sort: "priority_asc" });
    expect(clamped.ok).toBe(true);
    if (clamped.ok) {
      expect(clamped.pageSize).toBe(100);
      expect(clamped.take).toBe(100);
      expect(clamped.orderBy).toEqual([
        { priority: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ]);
    }
  });

  it("rejects invalid enum, sort, and pagination parameters", () => {
    expect(parseFeedbackQueryParams({ status: "bogus" })).toEqual({
      ok: false,
      error: "Invalid status filter",
    });
    expect(parseFeedbackQueryParams({ type: "bogus" })).toEqual({
      ok: false,
      error: "Invalid type filter",
    });
    expect(parseFeedbackQueryParams({ priority: "urgent" }).ok).toBe(true);
    expect(parseFeedbackQueryParams({ priority: "critical" })).toEqual({
      ok: false,
      error: "Invalid priority filter",
    });
    expect(parseFeedbackQueryParams({ source: "slack" })).toEqual({
      ok: false,
      error: "Invalid source filter",
    });
    expect(parseFeedbackQueryParams({ sort: "random" })).toEqual({
      ok: false,
      error: "Invalid sort option",
    });
    expect(parseFeedbackQueryParams({ page: "0" })).toEqual({
      ok: false,
      error: "Invalid page parameter",
    });
    expect(parseFeedbackQueryParams({ pageSize: "-2" })).toEqual({
      ok: false,
      error: "Invalid pageSize parameter",
    });
  });
});

describe("GET /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await listGlobalFeedback(
      new NextRequest("http://localhost:3000/api/feedback"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(mockPrisma.feedbackItem.findMany).not.toHaveBeenCalled();
  });

  it("returns 400 when filter parameters are invalid", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });

    const response = await listGlobalFeedback(
      new NextRequest("http://localhost:3000/api/feedback?status=invalid"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid status filter" });
  });

  it("returns paginated items and total count for authenticated admin", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.feedbackItem.findMany.mockResolvedValue([
      {
        id: "fb-1",
        title: "Crash on save",
        status: "open",
        source: "extension",
        project: { id: "proj-1", name: "Portal", slug: "portal" },
      },
    ]);
    mockPrisma.feedbackItem.count.mockResolvedValue(25);

    const response = await listGlobalFeedback(
      new NextRequest(
        "http://localhost:3000/api/feedback?q=crash&source=extension&page=2&pageSize=10",
      ),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.feedbackItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        include: {
          project: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
    );
    expect(await response.json()).toEqual({
      items: [
        {
          id: "fb-1",
          title: "Crash on save",
          status: "open",
          source: "extension",
          project: { id: "proj-1", name: "Portal", slug: "portal" },
        },
      ],
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
    });
  });
});

describe("PATCH /api/feedback/[id]", () => {
  const context = { params: Promise.resolve({ id: "fb-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockPrisma.feedbackItem.update).not.toHaveBeenCalled();
  });

  it("updates status and priority inline, including clearing priority to null", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.feedbackItem.update.mockResolvedValue({
      id: "fb-1",
      status: "in_progress",
      priority: "high",
      project: { id: "proj-1", name: "Portal", slug: "portal" },
    });

    const statusRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "in_progress", priority: "high" }),
      }),
      context,
    );

    expect(statusRes.status).toBe(200);
    expect(mockPrisma.feedbackItem.update).toHaveBeenCalledWith({
      where: { id: "fb-1" },
      data: { status: "in_progress", priority: "high" },
      include: { project: { select: { id: true, name: true, slug: true } } },
    });

    mockPrisma.feedbackItem.update.mockResolvedValue({
      id: "fb-1",
      status: "in_progress",
      priority: null,
      project: { id: "proj-1", name: "Portal", slug: "portal" },
    });

    const clearPriorityRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ priority: null }),
      }),
      context,
    );

    expect(clearPriorityRes.status).toBe(200);
    expect(mockPrisma.feedbackItem.update).toHaveBeenLastCalledWith({
      where: { id: "fb-1" },
      data: { priority: null },
      include: { project: { select: { id: true, name: true, slug: true } } },
    });
  });

  it("validates empty or invalid bodies and returns 404 when record is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });

    const emptyRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      context,
    );
    expect(emptyRes.status).toBe(400);

    const badStatusRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "invalid" }),
      }),
      context,
    );
    expect(badStatusRes.status).toBe(400);

    const badPriorityRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ priority: "" }),
      }),
      context,
    );
    expect(badPriorityRes.status).toBe(400);

    mockPrisma.feedbackItem.update.mockRejectedValue({ code: "P2025" });
    const notFoundRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/missing", {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(notFoundRes.status).toBe(404);
  });
});
