import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { labelIds?: unknown } | null;

  if (!Array.isArray(body?.labelIds) || !body.labelIds.every((v) => typeof v === "string")) {
    return NextResponse.json({ error: "labelIds must be an array of strings" }, { status: 400 });
  }

  const labelIds = Array.from(new Set(body.labelIds));

  await prisma.$transaction([
    prisma.feedbackLabel.deleteMany({ where: { feedbackItemId: id } }),
    ...(labelIds.length > 0
      ? [
          prisma.feedbackLabel.createMany({
            data: labelIds.map((labelId) => ({ feedbackItemId: id, labelId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  const updated = await prisma.feedbackLabel.findMany({
    where: { feedbackItemId: id },
    include: { label: true },
  });

  return NextResponse.json({ labels: updated.map((entry) => entry.label) });
}
