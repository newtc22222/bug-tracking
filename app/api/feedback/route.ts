import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const parsed = parseFeedbackQueryParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const [items, total] = await Promise.all([
    prisma.feedbackItem.findMany({
      where: parsed.where,
      orderBy: parsed.orderBy,
      skip: parsed.skip,
      take: parsed.take,
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.feedbackItem.count({ where: parsed.where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages: Math.max(1, Math.ceil(total / parsed.pageSize)),
  });
}
