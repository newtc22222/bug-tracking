import Link from "next/link";
import DashboardView from "@/components/dashboard-view";
import PageContainer from "@/components/page-container";
import { NewFeedbackButton } from "@/components/project-action-buttons";
import { getDashboardData } from "@/lib/dashboard-stats";

export const dynamic = "force-dynamic";

export default async function GlobalDashboardPage() {
  const data = await getDashboardData();

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Workspace Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quick overview of inbox health, workflow bottlenecks, and resolution velocity across all
            projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/feedback"
            className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-2xs transition hover:border-slate-950 hover:text-slate-950"
          >
            Open Inbox
          </Link>
          <NewFeedbackButton label="New Ticket" />
        </div>
      </div>

      <DashboardView data={data} scope="global" />
    </PageContainer>
  );
}
