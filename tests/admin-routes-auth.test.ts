import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feedbackItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

import { GET as listProjects, POST as createProject } from "@/app/api/projects/route";
import {
  DELETE as deleteProject,
  GET as getProject,
  PUT as updateProject,
} from "@/app/api/projects/[id]/route";
import {
  GET as listProjectFeedback,
  POST as createProjectFeedback,
} from "@/app/api/projects/[id]/feedback/route";
import {
  DELETE as deleteFeedback,
  GET as getFeedback,
  PUT as updateFeedback,
} from "@/app/api/feedback/[id]/route";

describe("admin API routes authentication and CRUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 on every protected admin endpoint when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const projectContext = { params: Promise.resolve({ id: "proj-1" }) };
    const feedbackContext = { params: Promise.resolve({ id: "fb-1" }) };

    const responses = await Promise.all([
      listProjects(),
      createProject(
        new NextRequest("http://localhost:3000/api/projects", {
          method: "POST",
          body: JSON.stringify({ name: "App" }),
        }),
      ),
      getProject(new NextRequest("http://localhost:3000/api/projects/proj-1"), projectContext),
      updateProject(
        new NextRequest("http://localhost:3000/api/projects/proj-1", {
          method: "PUT",
          body: JSON.stringify({ name: "App" }),
        }),
        projectContext,
      ),
      deleteProject(new NextRequest("http://localhost:3000/api/projects/proj-1"), projectContext),
      listProjectFeedback(
        new NextRequest("http://localhost:3000/api/projects/proj-1/feedback"),
        projectContext,
      ),
      createProjectFeedback(
        new NextRequest("http://localhost:3000/api/projects/proj-1/feedback", {
          method: "POST",
          body: JSON.stringify({ title: "Bug", type: "bug" }),
        }),
        projectContext,
      ),
      getFeedback(new NextRequest("http://localhost:3000/api/feedback/fb-1"), feedbackContext),
      updateFeedback(
        new NextRequest("http://localhost:3000/api/feedback/fb-1", {
          method: "PUT",
          body: JSON.stringify({ title: "Bug", type: "bug", status: "open" }),
        }),
        feedbackContext,
      ),
      deleteFeedback(new NextRequest("http://localhost:3000/api/feedback/fb-1"), feedbackContext),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    }

    expect(mockPrisma.project.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.project.create).not.toHaveBeenCalled();
    expect(mockPrisma.feedbackItem.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.feedbackItem.findUnique).not.toHaveBeenCalled();
  });

  it("allows authenticated admin access and handles slug collisions on POST /api/projects", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });

    mockPrisma.project.findMany.mockResolvedValue([{ id: "proj-1", name: "App", slug: "app" }]);
    const listRes = await listProjects();
    expect(listRes.status).toBe(200);
    expect(await listRes.json()).toEqual([{ id: "proj-1", name: "App", slug: "app" }]);

    mockPrisma.project.findUnique
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.project.create.mockResolvedValue({
      id: "proj-2",
      name: "My App",
      slug: "my-app-1",
      keyPrefix: "MA",
      domain: "app.example.com",
      repoUrl: null,
      description: null,
    });

    const createRes = await createProject(
      new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "My App",
          domain: "https://APP.example.com/login",
        }),
      }),
    );

    expect(createRes.status).toBe(201);
    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My App",
        slug: "my-app-1",
        keyPrefix: "MA",
        domain: "app.example.com",
        repoUrl: null,
        description: null,
      },
    });
  });

  it("allows authenticated admin CRUD on project, project feedback, and feedback routes", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", email: "admin@example.com" } });
    const projectContext = { params: Promise.resolve({ id: "proj-1" }) };
    const feedbackContext = { params: Promise.resolve({ id: "fb-1" }) };

    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1", name: "App", slug: "app" });
    const getProjRes = await getProject(
      new NextRequest("http://localhost:3000/api/projects/proj-1"),
      projectContext,
    );
    expect(getProjRes.status).toBe(200);

    mockPrisma.project.update.mockResolvedValue({
      id: "proj-1",
      name: "App Updated",
      slug: "app",
      domain: "app.example.com",
      repoUrl: null,
      description: "Desc",
    });
    const putProjRes = await updateProject(
      new NextRequest("http://localhost:3000/api/projects/proj-1", {
        method: "PUT",
        body: JSON.stringify({
          name: "App Updated",
          domain: "app.example.com",
          description: "Desc",
        }),
      }),
      projectContext,
    );
    expect(putProjRes.status).toBe(200);

    mockPrisma.project.delete.mockResolvedValue({ id: "proj-1" });
    const delProjRes = await deleteProject(
      new NextRequest("http://localhost:3000/api/projects/proj-1"),
      projectContext,
    );
    expect(delProjRes.status).toBe(200);
    expect(await delProjRes.json()).toEqual({ ok: true });

    mockPrisma.feedbackItem.findMany.mockResolvedValue([{ id: "fb-1", title: "Issue" }]);
    const listFbRes = await listProjectFeedback(
      new NextRequest("http://localhost:3000/api/projects/proj-1/feedback?status=open"),
      projectContext,
    );
    expect(listFbRes.status).toBe(200);

    mockPrisma.feedbackItem.create.mockResolvedValue({ id: "fb-2", title: "New bug" });
    const createFbRes = await createProjectFeedback(
      new NextRequest("http://localhost:3000/api/projects/proj-1/feedback", {
        method: "POST",
        body: JSON.stringify({ title: "New bug", type: "bug" }),
      }),
      projectContext,
    );
    expect(createFbRes.status).toBe(201);

    mockPrisma.feedbackItem.findUnique.mockResolvedValue({ id: "fb-1", title: "Issue" });
    const getFbRes = await getFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1"),
      feedbackContext,
    );
    expect(getFbRes.status).toBe(200);

    mockPrisma.feedbackItem.update.mockResolvedValue({
      id: "fb-1",
      title: "Issue Updated",
      type: "bug",
      status: "resolved",
    });
    const putFbRes = await updateFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1", {
        method: "PUT",
        body: JSON.stringify({
          title: "Issue Updated",
          type: "bug",
          status: "resolved",
        }),
      }),
      feedbackContext,
    );
    expect(putFbRes.status).toBe(200);

    mockPrisma.feedbackItem.delete.mockResolvedValue({ id: "fb-1" });
    const delFbRes = await deleteFeedback(
      new NextRequest("http://localhost:3000/api/feedback/fb-1"),
      feedbackContext,
    );
    expect(delFbRes.status).toBe(200);
    expect(await delFbRes.json()).toEqual({ ok: true });
  });
});
