"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FeedbackTypeIcon } from "@/components/ui-icons";
import { useWorkspace } from "@/components/workspace-provider";
import type { DashboardData } from "@/lib/dashboard-stats";
import {
  priorityBadgeClass,
  priorityLabels,
  statusBadgeClass,
  statusLabels,
  typeAccentClass,
} from "@/lib/feedback-display";

const STATUS_COLORS: Record<string, string> = {
  open: "#2563eb",
  todo: "#4f46e5",
  in_progress: "#d97706",
  blocked: "#e11d48",
  resolved: "#059669",
  closed: "#64748b",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#e11d48",
  high: "#f97316",
  medium: "#eab308",
  low: "#94a3b8",
  none: "#cbd5e1",
};

type DashboardViewProps = {
  data: DashboardData;
  scope: "global" | "project";
  projectId?: string;
};

export default function DashboardView({ data, scope, projectId }: DashboardViewProps) {
  const { openTicket } = useWorkspace();
  const baseFeedbackHref = projectId ? `/projects/${projectId}/feedback` : "/feedback";

  return (
    <div className="mt-6 space-y-6">
      {/* KPI strip */}
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Tickets" value={data.kpis.total} href={baseFeedbackHref} />
        <KpiCard
          label="Open Queue"
          value={data.kpis.openQueue}
          accent="text-blue-700"
          href={`${baseFeedbackHref}?status=open`}
        />
        <KpiCard
          label="To Do & In Progress"
          value={data.kpis.activeWork}
          accent="text-amber-700"
          href={`${baseFeedbackHref}?status=in_progress`}
        />
        <KpiCard
          label="Blocked"
          value={data.kpis.blocked}
          accent={data.kpis.blocked > 0 ? "text-rose-700" : "text-slate-950"}
          href={`${baseFeedbackHref}?status=blocked`}
        />
        <KpiCard
          label="Urgent & High Open"
          value={data.kpis.urgentAndHighOpen}
          accent={data.kpis.urgentAndHighOpen > 0 ? "text-rose-700" : "text-slate-950"}
          href={`${baseFeedbackHref}?priority=urgent`}
        />
        <KpiCard
          label="Avg Resolve (30d)"
          value={
            data.kpis.avgResolutionHours !== null ? `${data.kpis.avgResolutionHours}h` : "—"
          }
          subtext={`${data.kpis.resolvedLast30d} resolved`}
        />
      </section>

      {/* Main Charts row */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">14-Day Inflow vs. Resolved</h2>
              <p className="text-xs text-slate-500">
                Daily ticket intake compared against tickets transitioned to Resolved.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-900" />
                Created
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Resolved
              </span>
            </div>
          </div>

          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend30d} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#0f172a"
                  fill="#0f172a"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="#059669"
                  fill="#059669"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-950">Status Distribution</h2>
          <p className="text-xs text-slate-500">Current backlog across all 6 workflow states.</p>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.statusCounts}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={78}
                  tick={{ fontSize: 11, fill: "#334155" }}
                />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]}>
                  {data.statusCounts.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#475569"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Priority, Types & Sources row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-950">Priority Breakdown</h2>
          <div className="mt-4 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.priorityCounts} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }} />
                <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                  {data.priorityCounts.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-950">Ticket Types</h2>
          <p className="text-xs text-slate-500">Classification mix across this scope.</p>
          <ul className="mt-4 space-y-2.5">
            {data.typeCounts.map((t) => {
              const pct = data.kpis.total > 0 ? Math.round((t.count / data.kpis.total) * 100) : 0;
              return (
                <li key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-1.5 font-medium ${typeAccentClass(t.type)}`}>
                      <FeedbackTypeIcon type={t.type} className="h-3.5 w-3.5" />
                      <span className="text-slate-800">{t.label}</span>
                    </span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {t.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h2 className="text-sm font-semibold text-slate-950">Intake Channels</h2>
          <p className="text-xs text-slate-500">Where reports originate.</p>
          <ul className="mt-4 space-y-2.5">
            {data.sourceCounts.map((s) => {
              const pct = data.kpis.total > 0 ? Math.round((s.count / data.kpis.total) * 100) : 0;
              return (
                <li key={s.source} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{s.label}</span>
                    <span className="font-mono text-slate-600 tabular-nums">
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Actionable Queues: Needs Triage & Blocked */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Needs Immediate Triage</h2>
              <p className="text-xs text-slate-500">Open tickets without priority or marked Urgent.</p>
            </div>
            <Link
              href={`${baseFeedbackHref}?status=open`}
              className="text-xs font-medium text-slate-600 hover:text-slate-950"
            >
              View all →
            </Link>
          </div>
          {data.needsTriage.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">All open tickets have been triaged.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.needsTriage.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => openTicket(item.id)}
                    className="min-w-0 flex-1 truncate text-left font-medium text-slate-900 hover:underline"
                  >
                    <span className="mr-1.5 font-mono text-[11px] text-slate-500">
                      {item.ticketKey || item.id.slice(0, 8)}
                    </span>
                    {item.title}
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {item.priority && (
                      <span className={priorityBadgeClass(item.priority)}>
                        {priorityLabels[item.priority]}
                      </span>
                    )}
                    <span className={statusBadgeClass(item.status)}>
                      {statusLabels[item.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Blocked Tickets</h2>
              <p className="text-xs text-slate-500">Issues currently halted by dependencies.</p>
            </div>
            <Link
              href={`${baseFeedbackHref}?status=blocked`}
              className="text-xs font-medium text-slate-600 hover:text-slate-950"
            >
              View all →
            </Link>
          </div>
          {data.blockedTickets.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">No blocked tickets right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.blockedTickets.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => openTicket(item.id)}
                    className="min-w-0 flex-1 truncate text-left font-medium text-slate-900 hover:underline"
                  >
                    <span className="mr-1.5 font-mono text-[11px] text-slate-500">
                      {item.ticketKey || item.id.slice(0, 8)}
                    </span>
                    {item.title}
                  </button>
                  <span className={priorityBadgeClass(item.priority)}>
                    {item.priority ? priorityLabels[item.priority] : "No priority"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Global Project Health Table */}
      {scope === "global" && data.projectHealth.length > 0 && (
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Project Health Overview</h2>
              <p className="text-xs text-slate-500">
                Quick comparison across all tracked projects.
              </p>
            </div>
            <Link href="/projects" className="text-xs font-medium text-slate-600 hover:text-slate-950">
              Manage projects →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Project</th>
                  <th className="px-3 py-2 font-semibold">Urgent</th>
                  <th className="px-3 py-2 font-semibold">Blocked</th>
                  <th className="px-3 py-2 font-semibold">Open / To Do</th>
                  <th className="px-3 py-2 font-semibold">In Progress</th>
                  <th className="px-3 py-2 font-semibold">Total</th>
                  <th className="py-2 pl-3 text-right font-semibold">Quick Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.projectHealth.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/projects/${proj.id}/dashboard`}
                        className="inline-flex items-center gap-2 font-semibold text-slate-900 hover:underline"
                      >
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                          {proj.keyPrefix}
                        </span>
                        <span>{proj.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      {proj.urgent > 0 ? (
                        <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          {proj.urgent}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">
                      <span className={proj.blocked > 0 ? "font-semibold text-rose-700" : "text-slate-400"}>
                        {proj.blocked}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-800">{proj.open}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-amber-700">
                      {proj.inProgress}
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-slate-500">{proj.total}</td>
                    <td className="py-2.5 pl-3 text-right">
                      <div className="inline-flex items-center gap-2.5 font-medium">
                        <Link
                          href={`/projects/${proj.id}/dashboard`}
                          className="text-slate-600 hover:text-slate-950"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href={`/projects/${proj.id}/feedback`}
                          className="text-slate-900 hover:underline"
                        >
                          Board / List
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtext,
  accent = "text-slate-950",
  href,
}: {
  label: string;
  value: number | string;
  subtext?: string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums ${accent}`}>
        {value}
      </p>
      {subtext && <p className="mt-0.5 text-[11px] text-slate-400">{subtext}</p>}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
