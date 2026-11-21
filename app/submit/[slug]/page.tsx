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
    <main className="min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium text-slate-500">Feedback for</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {project.name}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
            Found a bug, have an idea, or want to ask a question? Send the details below.
          </p>
        </div>
        <SubmitForm slug={project.slug} />
      </div>
    </main>
  );
}
