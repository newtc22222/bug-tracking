"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import PageContainer from "@/components/page-container";
import ProjectForm from "@/components/project-form";
import { ArrowLeftIcon } from "@/components/ui-icons";

export default function NewProjectPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        <span>Projects</span>
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New Project</h1>
        <p className="mt-1 text-sm text-slate-500">
          Add a repository, live site domain, and external issue tracking platform.
        </p>
      </div>

      <section className="mt-6 max-w-3xl rounded-xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <ProjectForm
          mode="create"
          onCancel={() => router.push("/projects")}
          onSuccess={(project) => {
            router.push(`/projects/${project.id}/dashboard`);
            router.refresh();
          }}
        />
      </section>
    </PageContainer>
  );
}
