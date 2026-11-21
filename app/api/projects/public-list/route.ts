import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public by design: the extension needs a fallback project picker without admin credentials.
// Keep this response limited to public-safe project names and slugs.
export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });

  return NextResponse.json(projects);
}
