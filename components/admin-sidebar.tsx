"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpenIcon,
  BrandMarkIcon,
  DashboardIcon,
  FolderIcon,
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SlidersIcon,
  XIcon,
} from "@/components/ui-icons";
import { useWorkspace, type SavedViewItem } from "@/components/workspace-provider";
import { buildFeedbackQueryString } from "@/lib/feedback-query";
import { APP_VERSION_LABEL } from "@/lib/version";

type AdminSidebarProps = {
  logoutAction: () => Promise<void>;
};

export default function AdminSidebar({ logoutAction }: AdminSidebarProps) {
  const pathname = usePathname();
  const {
    settings,
    projects,
    savedViews,
    openCount,
    updateSettings,
    refreshSavedViews,
    openNewFeedback,
    openNewProject,
    openCommandPalette,
  } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);

  const collapsed = settings.sidebarCollapsed;

  function toggleCollapsed() {
    void updateSettings({ sidebarCollapsed: !collapsed });
  }

  function cycleTheme() {
    const next =
      settings.themeMode === "light"
        ? "dark"
        : settings.themeMode === "dark"
          ? "system"
          : "light";
    void updateSettings({ themeMode: next });
  }

  async function handleDeleteView(viewId: string) {
    const res = await fetch(`/api/views?id=${encodeURIComponent(viewId)}`, { method: "DELETE" });
    if (res.ok) {
      refreshSavedViews(savedViews.filter((v) => v.id !== viewId));
    }
  }

  function buildViewHref(view: SavedViewItem): string {
    const base = view.projectId ? `/projects/${view.projectId}/feedback` : "/feedback";
    const qs = buildFeedbackQueryString(view.filters);
    return `${base}${qs}`;
  }

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: DashboardIcon,
      active: pathname === "/dashboard",
    },
    {
      href: "/feedback",
      label: "Inbox",
      icon: InboxIcon,
      active: pathname === "/feedback" || pathname.startsWith("/feedback/"),
      badge: openCount,
    },
    {
      href: "/projects",
      label: "Projects",
      icon: FolderIcon,
      active: pathname === "/projects",
    },
  ];

  const footerNavItems = [
    {
      href: "/guide",
      label: "Wiki & Guide",
      icon: BookOpenIcon,
      active: pathname === "/guide",
    },
    {
      href: "/settings",
      label: "Settings",
      icon: SettingsIcon,
      active: pathname === "/settings",
    },
  ];

  const sidebarContent = (isCompact: boolean) => (
    <div className="flex h-full flex-col">
      {/* Brand header */}
      <div
        className={`flex h-14 shrink-0 items-center border-b border-slate-200/80 px-3 ${
          isCompact ? "justify-center" : "justify-between"
        }`}
      >
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-950"
          title="Bug Tracking"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white shadow-xs">
            <BrandMarkIcon className="h-3.5 w-3.5" />
          </span>
          {!isCompact && (
            <span className="flex items-center gap-1.5 truncate">
              <span className="truncate">Bug Tracking</span>
              <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] font-medium text-slate-500">
                {APP_VERSION_LABEL}
              </span>
            </span>
          )}
        </Link>

        {!isCompact && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 lg:inline-flex"
          >
            <PanelLeftIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick actions */}
      <div className="shrink-0 space-y-1.5 border-b border-slate-200/60 p-2.5">
        <button
          type="button"
          data-tour="quick-create"
          onClick={() => {
            setMobileOpen(false);
            openNewFeedback();
          }}
          title="New Ticket (C)"
          className={`flex h-8.5 w-full items-center rounded-md bg-slate-950 text-xs font-medium text-white shadow-2xs transition hover:bg-slate-800 ${
            isCompact ? "justify-center px-0" : "justify-between px-2.5"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="h-3.5 w-3.5" />
            {!isCompact && <span>New Ticket</span>}
          </span>
          {!isCompact && (
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">C</kbd>
          )}
        </button>

        <button
          type="button"
          data-tour="command-palette-btn"
          onClick={() => {
            setMobileOpen(false);
            openCommandPalette();
          }}
          title="Command Palette (Ctrl+K)"
          className={`flex h-8 w-full items-center rounded-md border border-slate-200/90 bg-slate-50/70 text-xs text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 ${
            isCompact ? "justify-center px-0" : "justify-between px-2.5"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <SearchIcon className="h-3.5 w-3.5" />
            {!isCompact && <span>Jump to…</span>}
          </span>
          {!isCompact && <kbd className="font-mono text-[10px] text-slate-400">⌘K</kbd>}
        </button>
      </div>

      {/* Primary navigation + Saved Views + Projects */}
      <div
        data-tour="sidebar-nav"
        className="bt-scroller flex-1 overflow-y-auto px-2 py-3 space-y-5"
      >
        <nav aria-label="Workspace" className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={isCompact ? item.label : undefined}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                  isCompact ? "justify-center" : "justify-between"
                } ${
                  item.active
                    ? "bg-slate-900/7 text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                <span className="inline-flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                  {!isCompact && <span className="truncate">{item.label}</span>}
                </span>
                {!isCompact && typeof item.badge === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums ${
                      item.active
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pinned Saved Views */}
        {!isCompact && savedViews.length > 0 && (
          <div>
            <div className="px-2.5 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Saved Views
              </span>
            </div>
            <ul className="space-y-0.5">
              {savedViews.map((view) => (
                <li key={view.id} className="group flex items-center justify-between gap-1">
                  <Link
                    href={buildViewHref(view)}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    <SlidersIcon className="h-3 w-3 shrink-0 text-slate-400" />
                    <span className="truncate">{view.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteView(view.id)}
                    aria-label={`Remove saved view ${view.name}`}
                    className="hidden rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 group-hover:inline-flex"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Projects quick-switcher */}
        {!isCompact && (
          <div>
            <div className="flex items-center justify-between px-2.5 pb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Projects
              </span>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openNewProject();
                }}
                title="Add project"
                className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </div>
            <ul className="space-y-0.5">
              {projects.length === 0 ? (
                <li className="px-2.5 py-1 text-xs text-slate-400">No projects yet</li>
              ) : (
                projects.map((proj) => {
                  const isActive = pathname.startsWith(`/projects/${proj.id}`);
                  return (
                    <li key={proj.id}>
                      <Link
                        href={`/projects/${proj.id}/feedback`}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                          isActive
                            ? "bg-slate-900/7 text-slate-950"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                            {proj.keyPrefix}
                          </span>
                          <span className="truncate">{proj.name}</span>
                        </span>
                        {proj.openCount > 0 && (
                          <span className="shrink-0 font-mono text-[10px] text-slate-400 tabular-nums">
                            {proj.openCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Footer nav: Theme quick-toggle, Wiki, Settings, Expand, Logout */}
      <div className="shrink-0 border-t border-slate-200/80 p-2 space-y-0.5">
        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${settings.themeMode} (click to switch)`}
          className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 ${
            isCompact ? "justify-center" : "justify-between"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="text-sm leading-none">
              {settings.themeMode === "dark" ? "☾" : settings.themeMode === "light" ? "☀" : "◐"}
            </span>
            {!isCompact && <span>Theme</span>}
          </span>
          {!isCompact && (
            <span className="font-mono text-[10px] capitalize text-slate-400">
              {settings.themeMode}
            </span>
          )}
        </button>

        {footerNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={isCompact ? item.label : undefined}
              aria-current={item.active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                isCompact ? "justify-center" : ""
              } ${
                item.active
                  ? "bg-slate-900/7 text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              {!isCompact && <span>{item.label}</span>}
            </Link>
          );
        })}

        {isCompact && (
          <button
            type="button"
            onClick={toggleCollapsed}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="hidden w-full items-center justify-center rounded-md px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 lg:flex"
          >
            <PanelLeftIcon className="h-3.5 w-3.5" />
          </button>
        )}

        <form action={logoutAction}>
          <button
            type="submit"
            title="Log out"
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 ${
              isCompact ? "justify-center" : ""
            }`}
          >
            <LogOutIcon className="h-3.5 w-3.5 shrink-0" />
            {!isCompact && <span>Log out</span>}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
          <Link href="/dashboard" className="text-sm font-semibold text-slate-950">
            Bug Tracking
          </Link>
        </div>
        <button
          type="button"
          onClick={() => openNewFeedback()}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-slate-950 px-2.5 text-xs font-medium text-white"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          <span>New</span>
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <XIcon className="h-4 w-4" />
            </button>
            {sidebarContent(false)}
          </aside>
        </div>
      )}

      <aside
        className={`hidden shrink-0 border-r border-slate-200/80 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col transition-[width] duration-150 ${
          collapsed ? "lg:w-16" : "lg:w-60"
        }`}
      >
        {sidebarContent(collapsed)}
      </aside>
    </>
  );
}
