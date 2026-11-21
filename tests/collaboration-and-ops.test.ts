import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    project: {
      findUnique: vi.fn(),
    },
    feedbackItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    feedbackNote: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    feedbackStatusEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    projectApiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    rateLimitBucket: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

import {
  GET as getNotesAndHistory,
  POST as createNote,
} from "@/app/api/feedback/[id]/notes/route";
import { PATCH as patchFeedback } from "@/app/api/feedback/[id]/route";
import { GET as exportFeedback } from "@/app/api/feedback/export/route";
import {
  DELETE as revokeProjectApiKey,
  GET as listProjectApiKeys,
  POST as createProjectApiKey,
} from "@/app/api/projects/[id]/api-keys/route";
import { POST as submitViaApiKey } from "@/app/api/v1/feedback/route";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { allowRateLimitedAction } from "@/lib/rate-limit";

describe("internal admin notes and status history", () => {
  const context = { params: Promise.resolve({ id: "fb-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication and creates/lists notes and status events", async () => {
    mockAuth.mockResolvedValue(null);
    const unauth = await getNotesAndHistory(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/notes"),
      context,
    );
    expect(unauth.status).toBe(401);

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@bugtrack.com" } });
    mockPrisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1" });
    mockPrisma.feedbackNote.findMany.mockResolvedValue([
      { id: "n1", authorEmail: "admin@bugtrack.com", body: "Investigating", createdAt: new Date() },
    ]);
    mockPrisma.feedbackStatusEvent.findMany.mockResolvedValue([
      {
        id: "e1",
        fromStatus: "open",
        toStatus: "in_progress",
        actorEmail: "admin@bugtrack.com",
        createdAt: new Date(),
      },
    ]);

    const listRes = await getNotesAndHistory(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/notes"),
      context,
    );
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.notes).toHaveLength(1);
    expect(listed.statusEvents).toHaveLength(1);

    const emptyNoteRes = await createNote(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/notes", {
        method: "POST",
        body: JSON.stringify({ body: "   " }),
      }),
      context,
    );
    expect(emptyNoteRes.status).toBe(400);

    mockPrisma.feedbackNote.create.mockResolvedValue({
      id: "n2",
      feedbackItemId: "fb-1",
      authorEmail: "admin@bugtrack.com",
      body: "Reproduced locally",
      createdAt: new Date(),
    });
    const createRes = await createNote(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/notes", {
        method: "POST",
        body: JSON.stringify({ body: "Reproduced locally" }),
      }),
      context,
    );
    expect(createRes.status).toBe(201);
    expect(mockPrisma.feedbackNote.create).toHaveBeenCalledWith({
      data: {
        feedbackItemId: "fb-1",
        authorEmail: "admin@bugtrack.com",
        body: "Reproduced locally",
      },
    });
  });

  it("records a status transition event only when status changes on PATCH", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@bugtrack.com" } });

    mockPrisma.feedbackItem.findUnique.mockResolvedValueOnce({ status: "open" });
    mockPrisma.feedbackItem.update.mockResolvedValueOnce({
      id: "fb-1",
      status: "resolved",
      project: { id: "p1", name: "App", slug: "app" },
    });

    const changed = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      context,
    );
    expect(changed.status).toBe(200);
    expect(mockPrisma.feedbackStatusEvent.create).toHaveBeenCalledWith({
      data: {
        feedbackItemId: "fb-1",
        fromStatus: "open",
        toStatus: "resolved",
        actorEmail: "admin@bugtrack.com",
      },
    });

    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@bugtrack.com" } });
    mockPrisma.feedbackItem.findUnique.mockResolvedValueOnce({ status: "resolved" });
    mockPrisma.feedbackItem.update.mockResolvedValueOnce({
      id: "fb-1",
      status: "resolved",
      project: { id: "p1", name: "App", slug: "app" },
    });

    const unchanged = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      context,
    );
    expect(unchanged.status).toBe(200);
    expect(mockPrisma.feedbackStatusEvent.create).not.toHaveBeenCalled();
  });
});

describe("programmatic API keys and POST /api/v1/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates prefixed keys and deterministic SHA-256 hashes", () => {
    const generated = generateApiKey();
    expect(generated.rawKey.startsWith("btk_")).toBe(true);
    expect(generated.keyPrefix).toBe(generated.rawKey.slice(0, 12));
    expect(generated.keyHash).toBe(hashApiKey(generated.rawKey));
  });

  it("manages project API keys via GET, POST, and DELETE", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@bugtrack.com" } });
    const context = { params: Promise.resolve({ id: "proj-1" }) };

    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1" });
    mockPrisma.projectApiKey.findMany.mockResolvedValue([
      { id: "k1", projectId: "proj-1", name: "CI", keyPrefix: "btk_12345678", revokedAt: null },
    ]);

    const listRes = await listProjectApiKeys(
      new NextRequest("http://localhost:3000/api/projects/proj-1/api-keys"),
      context,
    );
    expect(listRes.status).toBe(200);

    mockPrisma.projectApiKey.create.mockResolvedValue({
      id: "k2",
      projectId: "proj-1",
      name: "CLI",
      keyPrefix: "btk_abcdef12",
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date(),
    });
    const createRes = await createProjectApiKey(
      new NextRequest("http://localhost:3000/api/projects/proj-1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: "CLI" }),
      }),
      context,
    );
    expect(createRes.status).toBe(201);
    const createdJson = await createRes.json();
    expect(createdJson.rawKey).toMatch(/^btk_[a-f0-9]{48}$/);

    mockPrisma.projectApiKey.findFirst.mockResolvedValue({ id: "k2", revokedAt: null });
    const revokeRes = await revokeProjectApiKey(
      new NextRequest("http://localhost:3000/api/projects/proj-1/api-keys?keyId=k2", {
        method: "DELETE",
      }),
      context,
    );
    expect(revokeRes.status).toBe(200);
    expect(mockPrisma.projectApiKey.update).toHaveBeenCalledWith({
      where: { id: "k2" },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects missing/revoked keys and creates source=api feedback with valid key", async () => {
    const noKeyRes = await submitViaApiKey(
      new NextRequest("http://localhost:3000/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({ title: "API bug", type: "bug" }),
      }),
    );
    expect(noKeyRes.status).toBe(401);

    mockPrisma.projectApiKey.findUnique.mockResolvedValueOnce({
      id: "k1",
      projectId: "proj-1",
      revokedAt: new Date(),
      project: { id: "proj-1", name: "App", slug: "app", webhookUrl: null },
    });
    const revokedRes = await submitViaApiKey(
      new NextRequest("http://localhost:3000/api/v1/feedback", {
        method: "POST",
        headers: { Authorization: "Bearer btk_revoked" },
        body: JSON.stringify({ title: "API bug", type: "bug" }),
      }),
    );
    expect(revokedRes.status).toBe(401);

    mockPrisma.projectApiKey.findUnique.mockResolvedValueOnce({
      id: "k2",
      projectId: "proj-1",
      revokedAt: null,
      project: { id: "proj-1", name: "App", slug: "app", webhookUrl: null },
    });
    mockPrisma.feedbackItem.create.mockResolvedValue({
      id: "fb-api-1",
      title: "API bug",
      type: "bug",
      status: "open",
      priority: "high",
      source: "api",
      createdAt: new Date("2026-11-21T00:00:00.000Z"),
    });
    mockPrisma.projectApiKey.update.mockResolvedValue({ id: "k2" });

    const okRes = await submitViaApiKey(
      new NextRequest("http://localhost:3000/api/v1/feedback", {
        method: "POST",
        headers: { "x-api-key": "btk_valid" },
        body: JSON.stringify({ title: "API bug", type: "bug", priority: "high" }),
      }),
    );
    expect(okRes.status).toBe(201);
    expect(mockPrisma.feedbackItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj-1",
          source: "api",
          priority: "high",
        }),
      }),
    );
  });
});

describe("CSV/JSON export and persistent rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports filtered feedback as escaped CSV and JSON", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@bugtrack.com" } });
    mockPrisma.feedbackItem.findMany.mockResolvedValue([
      {
        id: "fb-1",
        title: 'Crash, on "save"',
        description: "Line 1\nLine 2",
        type: "bug",
        status: "open",
        priority: "high",
        source: "extension",
        reporterName: "Alice",
        reporterEmail: "alice@example.com",
        pageUrl: "https://app.example.com",
        browserInfo: "Chrome",
        githubIssueUrl: null,
        createdAt: new Date("2026-11-21T00:00:00.000Z"),
        updatedAt: new Date("2026-11-21T01:00:00.000Z"),
        project: { id: "p1", name: "App", slug: "app" },
      },
    ]);

    const csvRes = await exportFeedback(
      new NextRequest("http://localhost:3000/api/feedback/export?format=csv"),
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    const csvText = await csvRes.text();
    expect(csvText).toContain('"Crash, on ""save"""');
    expect(csvText).toContain('"Line 1\nLine 2"');

    const jsonRes = await exportFeedback(
      new NextRequest("http://localhost:3000/api/feedback/export?format=json"),
    );
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-type")).toContain("application/json");
    const jsonBody = await jsonRes.json();
    expect(jsonBody.items).toHaveLength(1);
  });

  it("tracks, blocks, and resets persistent DB rate-limit buckets", async () => {
    mockPrisma.rateLimitBucket.findUnique.mockResolvedValueOnce(null);
    expect(await allowRateLimitedAction("submit:1.2.3.4", 5, 60_000)).toBe(true);
    expect(mockPrisma.rateLimitBucket.upsert).toHaveBeenCalledTimes(1);

    mockPrisma.rateLimitBucket.findUnique.mockResolvedValueOnce({
      key: "submit:1.2.3.4",
      count: 3,
      windowStart: new Date(),
    });
    expect(await allowRateLimitedAction("submit:1.2.3.4", 5, 60_000)).toBe(true);
    expect(mockPrisma.rateLimitBucket.update).toHaveBeenCalledWith({
      where: { key: "submit:1.2.3.4" },
      data: { count: { increment: 1 } },
    });

    mockPrisma.rateLimitBucket.findUnique.mockResolvedValueOnce({
      key: "submit:1.2.3.4",
      count: 5,
      windowStart: new Date(),
    });
    expect(await allowRateLimitedAction("submit:1.2.3.4", 5, 60_000)).toBe(false);

    mockPrisma.rateLimitBucket.findUnique.mockResolvedValueOnce({
      key: "submit:1.2.3.4",
      count: 5,
      windowStart: new Date(Date.now() - 120_000),
    });
    expect(await allowRateLimitedAction("submit:1.2.3.4", 5, 60_000)).toBe(true);
    expect(mockPrisma.rateLimitBucket.upsert).toHaveBeenCalledTimes(2);
  });
});
