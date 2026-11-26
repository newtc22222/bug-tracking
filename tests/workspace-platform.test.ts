import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    feedbackItem: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    feedbackStatusEvent: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    feedbackNote: {
      create: vi.fn(),
    },
    feedbackLink: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    externalIssueLink: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    workspaceSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    projectApiKey: {
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

import { PATCH as patchFeedback } from "@/app/api/feedback/[id]/route";
import { POST as bulkFeedback } from "@/app/api/feedback/bulk/route";
import { POST as createLink } from "@/app/api/feedback/[id]/links/route";
import { GET as getMcpMeta, POST as postMcp } from "@/app/api/mcp/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";
import { POST as trackerWebhook } from "@/app/api/webhooks/trackers/[provider]/route";
import { investigateWithHeuristics } from "@/lib/ai-investigate";
import { detectGitPlatform } from "@/lib/git-platforms";
import { deriveKeyPrefix } from "@/lib/ticket-keys";
import { resolveCanonicalLink, resolveDirectionForItem } from "@/lib/ticket-links";
import { APP_VERSION_LABEL } from "@/lib/version";
import { canTransitionStatus, getSelectableStatuses } from "@/lib/workflow";

describe("strict 6-status workflow engine", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows valid transitions and blocks invalid shortcuts", () => {
    expect(canTransitionStatus("open", "todo")).toBe(true);
    expect(canTransitionStatus("open", "in_progress")).toBe(true);
    expect(canTransitionStatus("open", "blocked")).toBe(true);
    expect(canTransitionStatus("open", "resolved")).toBe(false);
    expect(canTransitionStatus("closed", "open")).toBe(true);
    expect(canTransitionStatus("closed", "in_progress")).toBe(false);
    expect(getSelectableStatuses("resolved")).toEqual(["resolved", "closed", "in_progress"]);
  });

  it("enforces strict workflow in PATCH /api/feedback/[id]", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.feedbackItem.findUnique.mockResolvedValue({ status: "open" });

    const invalidRes = await patchFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );

    expect(invalidRes.status).toBe(400);
    const body = (await invalidRes.json()) as { error: string };
    expect(body.error).toContain('Cannot transition status from "open" to "resolved"');
    expect(mockPrisma.feedbackItem.update).not.toHaveBeenCalled();
  });
});

describe("ticket keys, git platforms, and canonical ticket links", () => {
  beforeEach(() => vi.clearAllMocks());

  it("derives readable key prefixes and detects git platforms", () => {
    expect(deriveKeyPrefix("Web Platform")).toBe("WP");
    expect(deriveKeyPrefix("Billing")).toBe("BILL");
    expect(detectGitPlatform("https://github.com/acme/web")).toBe("github");
    expect(detectGitPlatform("https://gitlab.com/acme/group/api")).toBe("gitlab");
    expect(detectGitPlatform("https://bitbucket.org/acme/mobile")).toBe("bitbucket");
    expect(detectGitPlatform("")).toBe("none");
  });

  it("normalizes canonical directed links and inverse directions", () => {
    const blockedBy = resolveCanonicalLink("t-child", "t-blocker", "is_blocked_by");
    expect(blockedBy).toEqual({
      sourceId: "t-blocker",
      targetId: "t-child",
      relationType: "blocks",
    });
    expect(resolveDirectionForItem("blocks", false)).toBe("is_blocked_by");
    expect(resolveDirectionForItem("causes", false)).toBe("is_caused_by");
    expect(resolveDirectionForItem("relates_to", false)).toBe("relates_to");
  });

  it("rejects self-links via POST /api/feedback/[id]/links", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    const res = await createLink(
      new NextRequest("http://localhost:3000/api/feedback/fb-1/links", {
        method: "POST",
        body: JSON.stringify({ targetId: "fb-1", direction: "blocks" }),
      }),
      { params: Promise.resolve({ id: "fb-1" }) },
    );
    expect(res.status).toBe(400);
  });
});

describe("workspace settings, AI investigate, and MCP server", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads and updates workspace settings including layout width and presentation modes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.workspaceSettings.findUnique.mockResolvedValue(null);

    const getRes = await getSettings();
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({
      layoutWidth: "full",
      defaultTicketView: "list_full",
      newProjectMode: "page",
      newFeedbackMode: "modal",
      ticketReviewMode: "drawer",
    });

    mockPrisma.workspaceSettings.upsert.mockResolvedValue({
      id: "default",
      layoutWidth: "wide",
      defaultTicketView: "kanban",
      newProjectMode: "drawer",
      newFeedbackMode: "modal",
      ticketReviewMode: "drawer",
      sidebarCollapsed: true,
      completedTours: [],
    });

    const patchRes = await patchSettings(
      new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          layoutWidth: "wide",
          defaultTicketView: "kanban",
          newProjectMode: "drawer",
          sidebarCollapsed: true,
        }),
      }),
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).layoutWidth).toBe("wide");
  });

  it("generates heuristic root causes and coding-agent fix prompt", () => {
    const result = investigateWithHeuristics({
      ticketKey: "WEB-7",
      title: "Checkout API returns 500 timeout",
      description: "Happens on submit",
      type: "bug",
      status: "open",
      priority: "urgent",
      projectName: "Web Store",
      projectSlug: "web-store",
      pageUrl: "https://shop.example.com/checkout",
    });

    expect(result.rootCauseHypotheses.length).toBeGreaterThan(0);
    expect(result.investigationChecklist.length).toBeGreaterThan(0);
    expect(result.agentPrompt).toContain("[WEB-7]");
    expect(result.agentPrompt).toContain("https://shop.example.com/checkout");
  });

  it("exposes MCP metadata and handles JSON-RPC initialize & tools/list", async () => {
    const metaRes = await getMcpMeta();
    expect(metaRes.status).toBe(200);
    const meta = (await metaRes.json()) as { tools: Array<{ name: string }> };
    expect(meta.tools.map((t) => t.name)).toContain("investigate_ticket");

    mockAuth.mockResolvedValue(null);
    const unauthRes = await postMcp(
      new NextRequest("http://localhost:3000/api/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
    );
    expect(unauthRes.status).toBe(401);

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    const initRes = await postMcp(
      new NextRequest("http://localhost:3000/api/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      }),
    );
    expect(initRes.status).toBe(200);
    const initJson = (await initRes.json()) as { result: { serverInfo: { name: string } } };
    expect(initJson.result.serverInfo.name).toBe("bug-tracking-mcp");

    const listRes = await postMcp(
      new NextRequest("http://localhost:3000/api/mcp", {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      }),
    );
    expect(listRes.status).toBe(200);
    const listJson = (await listRes.json()) as { result: { tools: unknown[] } };
    expect(listJson.result.tools.length).toBeGreaterThanOrEqual(8);
  });

  it("supports dark mode & multi-themes, workflow-safe bulk actions, two-way webhooks, and app version", async () => {
    expect(APP_VERSION_LABEL).toMatch(/^v\d+\.\d+\.\d+/);

    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    mockPrisma.workspaceSettings.upsert.mockResolvedValue({
      id: "default",
      layoutWidth: "full",
      defaultTicketView: "list_full",
      newProjectMode: "page",
      newFeedbackMode: "modal",
      ticketReviewMode: "drawer",
      sidebarCollapsed: false,
      themeMode: "dark",
      themeAccent: "indigo",
      completedTours: [],
    });

    const themeRes = await patchSettings(
      new NextRequest("http://localhost:3000/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ themeMode: "dark", themeAccent: "indigo" }),
      }),
    );
    expect(themeRes.status).toBe(200);
    expect(await themeRes.json()).toMatchObject({ themeMode: "dark", themeAccent: "indigo" });

    // Bulk status enforces strict workflow: in_progress -> resolved succeeds, open -> resolved skipped
    mockPrisma.feedbackItem.findMany.mockResolvedValue([
      { id: "fb-valid", status: "in_progress" },
      { id: "fb-invalid", status: "open" },
    ]);
    mockPrisma.feedbackItem.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.feedbackStatusEvent.createMany.mockResolvedValue({ count: 1 });

    const bulkRes = await bulkFeedback(
      new NextRequest("http://localhost:3000/api/feedback/bulk", {
        method: "POST",
        body: JSON.stringify({
          ids: ["fb-valid", "fb-invalid"],
          action: "status",
          value: "resolved",
        }),
      }),
    );
    expect(bulkRes.status).toBe(200);
    expect(await bulkRes.json()).toEqual({ ok: true, updated: 1, skipped: 1 });

    // Two-way GitHub webhook updates external status and adds internal note
    mockPrisma.externalIssueLink.findMany.mockResolvedValue([
      {
        id: "ext-1",
        feedbackItemId: "fb-valid",
        provider: "github_issues",
        externalId: "42",
        externalKey: "#42",
        externalUrl: "https://github.com/org/repo/issues/42",
        externalStatus: "open",
      },
    ]);
    mockPrisma.externalIssueLink.update.mockResolvedValue({ id: "ext-1" });
    mockPrisma.feedbackNote.create.mockResolvedValue({ id: "note-1" });

    const hookRes = await trackerWebhook(
      new NextRequest("http://localhost:3000/api/webhooks/trackers/github", {
        method: "POST",
        body: JSON.stringify({
          issue: { number: 42, state: "closed", html_url: "https://github.com/org/repo/issues/42" },
        }),
      }),
      { params: Promise.resolve({ provider: "github" }) },
    );
    expect(hookRes.status).toBe(200);
    expect(await hookRes.json()).toMatchObject({ ok: true, externalStatus: "closed", updatedLinks: 1 });
    expect(mockPrisma.feedbackNote.create).toHaveBeenCalledTimes(1);
  });
});
