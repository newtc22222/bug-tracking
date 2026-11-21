import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { parseFeedbackQueryParams } from "@/lib/feedback-query";
import { prisma } from "@/lib/prisma";

const MAX_EXPORT_ITEMS = 5000;

export async function GET(request: NextRequest) {
  const unauthorizedResponse = await requireAdminApiSession();
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const formatParam = request.nextUrl.searchParams.get("format")?.trim().toLowerCase() || "csv";
  if (formatParam !== "csv" && formatParam !== "json") {
    return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
  }

  const parsed = parseFeedbackQueryParams(request.nextUrl.searchParams, {
    defaultPageSize: 100,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const items = await prisma.feedbackItem.findMany({
    where: parsed.where,
    orderBy: parsed.orderBy,
    take: MAX_EXPORT_ITEMS,
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (formatParam === "json") {
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feedback-export.json"',
      },
    });
  }

  const headers = [
    "id",
    "projectName",
    "projectSlug",
    "title",
    "description",
    "type",
    "status",
    "priority",
    "source",
    "reporterName",
    "reporterEmail",
    "pageUrl",
    "browserInfo",
    "githubIssueUrl",
    "createdAt",
    "updatedAt",
  ];

  const rows = items.map((item) =>
    [
      item.id,
      item.project?.name || "",
      item.project?.slug || "",
      item.title,
      item.description || "",
      item.type,
      item.status,
      item.priority || "",
      item.source,
      item.reporterName || "",
      item.reporterEmail || "",
      item.pageUrl || "",
      item.browserInfo || "",
      item.githubIssueUrl || "",
      item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
      item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt),
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="feedback-export.csv"',
    },
  });
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
