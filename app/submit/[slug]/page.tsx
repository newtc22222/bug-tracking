import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SubmitForm from "./SubmitForm";

export const dynamic = "force-dynamic";

export default async function PublicSubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await prisma.project.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-7 text-center">
          <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 font-mono text-xs text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            /{project.slug}
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {project.name}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Found a bug, have an idea, or want to ask a question? Share the details below.
          </p>
        </div>
        <SubmitForm slug={project.slug} />
      </div>
    </main>
  );
}
