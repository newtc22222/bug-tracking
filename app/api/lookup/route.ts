import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDomain } from "@/lib/domain";

// Public by design: the extension cannot safely hold an admin secret.
export async function GET(request: NextRequest) {
  const domainParam = request.nextUrl.searchParams.get("domain") || "";
  const domain = normalizeDomain(domainParam);

  if (!domain) {
    return NextResponse.json({ found: false });
  }

  const project = await prisma.project.findUnique({
    where: { domain },
    select: { slug: true, name: true },
  });

  if (!project) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({ found: true, ...project });
}
