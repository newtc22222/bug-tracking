import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-stats";

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const projectId = request.nextUrl.searchParams.get("projectId")?.trim() || undefined;
  const data = await getDashboardData(projectId);
  return NextResponse.json(data);
}
