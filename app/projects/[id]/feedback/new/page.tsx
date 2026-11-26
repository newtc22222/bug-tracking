"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import FeedbackCreateForm from "@/components/feedback-create-form";
import PageContainer from "@/components/page-container";
import { ArrowLeftIcon } from "@/components/ui-icons";
import { useWorkspace } from "@/components/workspace-provider";

export default function NewFeedbackPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { projects } = useWorkspace();

  const initialPageUrl = searchParams.get("pageUrl") || "";
  const initialBrowserInfo = searchParams.get("browserInfo") || "";
  const initialSource = searchParams.get("source") === "extension" ? "extension" : "manual";

  return (
    <PageContainer>
      <Link
        href={`/projects/${params.id}/feedback`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-950"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        <span>Back to tickets</span>
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">New Ticket</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record a bug, improvement, feature request, or question using the full-page editor.
        </p>
      </div>

      <div className="mt-6">
        <FeedbackCreateForm
          projects={projects}
          defaultProjectId={params.id}
          lockProject
          initialPageUrl={initialPageUrl}
          initialBrowserInfo={initialBrowserInfo}
          initialSource={initialSource}
          onCancel={() => router.push(`/projects/${params.id}/feedback`)}
          onSuccess={() => {
            router.push(`/projects/${params.id}/feedback`);
            router.refresh();
          }}
        />
      </div>
    </PageContainer>
  );
}
