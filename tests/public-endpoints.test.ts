import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET as getHealth } from "@/app/api/health/route";
import { GET as lookupDomain } from "@/app/api/lookup/route";
import { GET as listPublicProjects } from "@/app/api/projects/public-list/route";

describe("public lookup, public project list, and health endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { found: false } when domain parameter is missing or does not match", async () => {
    const emptyResponse = await lookupDomain(
      new NextRequest("http://localhost:3000/api/lookup"),
    );
    expect(emptyResponse.status).toBe(200);
    expect(await emptyResponse.json()).toEqual({ found: false });
    expect(mockPrisma.project.findUnique).not.toHaveBeenCalled();

    mockPrisma.project.findUnique.mockResolvedValue(null);
    const missingResponse = await lookupDomain(
      new NextRequest("http://localhost:3000/api/lookup?domain=unknown.example.com"),
    );
    expect(missingResponse.status).toBe(200);
    expect(await missingResponse.json()).toEqual({ found: false });
  });

  it("normalizes domain input and returns { found: true, slug, name } on match", async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      slug: "demo-app",
      name: "Demo App",
    });

    const response = await lookupDomain(
      new NextRequest("http://localhost:3000/api/lookup?domain=https://APP.Example.com:8443/path"),
    );

    expect(response.status).toBe(200);
    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { domain: "app.example.com" },
      select: { slug: true, name: true },
    });
    expect(await response.json()).toEqual({
      found: true,
      slug: "demo-app",
      name: "Demo App",
    });
  });

  it("returns public-safe project { slug, name } list", async () => {
    mockPrisma.project.findMany.mockResolvedValue([
      { slug: "alpha", name: "Alpha" },
      { slug: "beta", name: "Beta" },
    ]);

    const response = await listPublicProjects();

    expect(response.status).toBe(200);
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    });
    expect(await response.json()).toEqual([
      { slug: "alpha", name: "Alpha" },
      { slug: "beta", name: "Beta" },
    ]);
  });

  it("returns 200 on GET /api/health when DB query succeeds and 503 when it fails", async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const okResponse = await getHealth();
    expect(okResponse.status).toBe(200);
    expect(await okResponse.json()).toEqual({ status: "ok", database: "connected" });

    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));
    const errResponse = await getHealth();
    expect(errResponse.status).toBe(503);
    expect(await errResponse.json()).toEqual({ status: "error", database: "disconnected" });
  });
});
