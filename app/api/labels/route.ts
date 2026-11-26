import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { labelColorOptions } from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() || undefined;
  const labels = await prisma.label.findMany({
    where: projectId ? { OR: [{ projectId: null }, { projectId }] } : {},
    orderBy: [{ projectId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ labels });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  const color =
    typeof body?.color === "string" &&
    (labelColorOptions as readonly string[]).includes(body.color)
      ? body.color
      : "slate";
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Label name is required" }, { status: 400 });
  }

  const created = await prisma.label.create({
    data: { name, color, projectId },
  });

  return NextResponse.json({ label: created }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Label id is required" }, { status: 400 });
  }

  await prisma.label.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
