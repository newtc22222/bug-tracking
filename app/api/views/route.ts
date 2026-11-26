import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const views = await prisma.savedView.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ views });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;
  const filters =
    body?.filters && typeof body.filters === "object" && !Array.isArray(body.filters)
      ? (body.filters as Record<string, unknown>)
      : null;

  if (!name) {
    return NextResponse.json({ error: "View name is required" }, { status: 400 });
  }
  if (!filters) {
    return NextResponse.json({ error: "Filters object is required" }, { status: 400 });
  }

  const created = await prisma.savedView.create({
    data: {
      name,
      projectId,
      filters: filters as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ view: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "View id is required" }, { status: 400 });
  }

  await prisma.savedView.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
