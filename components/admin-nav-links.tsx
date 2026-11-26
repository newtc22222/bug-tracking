"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon, InboxIcon } from "@/components/ui-icons";

export default function AdminNavLinks({ openCount }: { openCount: number }) {
  const pathname = usePathname();
  const isInboxActive = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const isProjectsActive = pathname === "/projects" || pathname.startsWith("/projects/");

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      <Link
        href="/feedback"
        aria-current={isInboxActive ? "page" : undefined}
        className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
          isInboxActive
            ? "bg-slate-900/5 text-slate-950"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950"
        }`}
      >
        <InboxIcon className="h-3.5 w-3.5 text-slate-500" />
        <span>Inbox</span>
        <span
          className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] leading-none tabular-nums ${
            isInboxActive
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
          }`}
        >
          {openCount}
        </span>
      </Link>

      <Link
        href="/projects"
        aria-current={isProjectsActive ? "page" : undefined}
        className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
          isProjectsActive
            ? "bg-slate-900/5 text-slate-950"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-950"
        }`}
      >
        <FolderIcon className="h-3.5 w-3.5 text-slate-500" />
        <span>Projects</span>
      </Link>
    </nav>
  );
}
