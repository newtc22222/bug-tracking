"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, InboxIcon, SettingsIcon } from "@/components/ui-icons";

export default function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const isOverview = pathname === `/projects/${projectId}/dashboard`;
  const isTickets = pathname.startsWith(`/projects/${projectId}/feedback`);
  const isSettings = pathname === `/projects/${projectId}`;

  const tabs = [
    {
      href: `/projects/${projectId}/dashboard`,
      label: "Dashboard",
      icon: DashboardIcon,
      active: isOverview,
    },
    {
      href: `/projects/${projectId}/feedback`,
      label: "Tickets & Board",
      icon: InboxIcon,
      active: isTickets,
    },
    {
      href: `/projects/${projectId}`,
      label: "Settings & Integrations",
      icon: SettingsIcon,
      active: isSettings,
    },
  ];

  return (
    <nav
      aria-label="Project sections"
      className="mt-4 flex flex-wrap items-center gap-1 border-b border-slate-200/80 pb-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab.active
                ? "bg-slate-950 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
