import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ExtensionAdminCreateRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const rawParams = await searchParams;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!project) {
    notFound();
  }

  const query = new URLSearchParams();
  for (const key of ["pageUrl", "browserInfo", "source"]) {
    const val = rawParams[key];
    if (typeof val === "string" && val.trim()) {
      query.set(key, val);
    }
  }
  if (!query.has("source")) {
    query.set("source", "extension");
  }

  redirect(`/projects/${project.id}/feedback/new?${query.toString()}`);
}
