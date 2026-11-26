"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import FeedbackCreateForm from "@/components/feedback-create-form";
import ProjectForm from "@/components/project-form";
import { DrawerShell, ModalShell } from "@/components/surface-shells";
import TicketDetailWorkspace from "@/components/ticket-detail-workspace";
import { SearchIcon } from "@/components/ui-icons";
import { runProductTour, type TourId } from "@/lib/tours";
import type { WorkspaceSettingsData } from "@/lib/workspace-settings";

export type SidebarProjectSummary = {
  id: string;
  name: string;
  slug: string;
  keyPrefix: string;
  openCount: number;
};

export type WorkspaceLabelItem = {
  id: string;
  name: string;
  color: string;
  projectId: string | null;
};

export type SavedViewItem = {
  id: string;
  name: string;
  projectId: string | null;
  filters: Record<string, string | undefined>;
};

type ActiveSurface =
  | { kind: "none" }
  | { kind: "new_project"; mode: "modal" | "drawer" }
  | { kind: "new_feedback"; mode: "modal" | "drawer"; projectId?: string }
  | { kind: "review_ticket"; mode: "modal" | "drawer"; ticketId: string };

type WorkspaceContextValue = {
  settings: WorkspaceSettingsData;
  projects: SidebarProjectSummary[];
  labels: WorkspaceLabelItem[];
  savedViews: SavedViewItem[];
  openCount: number;
  updateSettings: (patch: Partial<WorkspaceSettingsData>) => Promise<void>;
  refreshLabels: (next: WorkspaceLabelItem[]) => void;
  refreshSavedViews: (next: SavedViewItem[]) => void;
  registerTicketQueue: (ids: string[]) => void;
  openNewProject: () => void;
  openNewFeedback: (projectId?: string) => void;
  openTicket: (ticketId: string) => void;
  openCommandPalette: () => void;
  startTour: (tourId: TourId) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  }
  return ctx;
}

function syncTicketUrlParam(ticketId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (ticketId) {
    url.searchParams.set("ticket", ticketId);
  } else {
    url.searchParams.delete("ticket");
  }
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function WorkspaceProvider({
  initialSettings,
  projects,
  initialLabels = [],
  initialSavedViews = [],
  openCount,
  children,
}: {
  initialSettings: WorkspaceSettingsData;
  projects: SidebarProjectSummary[];
  initialLabels?: WorkspaceLabelItem[];
  initialSavedViews?: SavedViewItem[];
  openCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<WorkspaceSettingsData>(initialSettings);
  const [labels, setLabels] = useState<WorkspaceLabelItem[]>(initialLabels);
  const [savedViews, setSavedViews] = useState<SavedViewItem[]>(initialSavedViews);
  const [ticketQueue, setTicketQueue] = useState<string[]>([]);
  const [surface, setSurface] = useState<ActiveSurface>({ kind: "none" });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");

  // Synchronize themeMode (with system matchMedia change listener) and themeAccent on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.themeMode;
    root.dataset.accent = settings.themeAccent;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyDarkClass = () => {
      const shouldBeDark =
        settings.themeMode === "dark" ||
        (settings.themeMode === "system" && mediaQuery.matches);
      root.classList.toggle("dark", shouldBeDark);
    };

    applyDarkClass();
    mediaQuery.addEventListener("change", applyDarkClass);
    return () => mediaQuery.removeEventListener("change", applyDarkClass);
  }, [settings.themeMode, settings.themeAccent]);

  // Open review drawer/modal automatically if ?ticket=<id> is in URL on page load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ticketFromUrl = params.get("ticket")?.trim();
    if (ticketFromUrl && settings.ticketReviewMode !== "page") {
      // Schedule via microtask to avoid synchronous setState in effect warning
      queueMicrotask(() => {
        setSurface({
          kind: "review_ticket",
          mode: settings.ticketReviewMode === "modal" ? "modal" : "drawer",
          ticketId: ticketFromUrl,
        });
      });
    }
    // Only check on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = useCallback(async (patch: Partial<WorkspaceSettingsData>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = (await res.json()) as WorkspaceSettingsData;
        setSettings(updated);
      }
    } catch {
      // Keep optimistic state
    }
  }, []);

  const openNewProject = useCallback(() => {
    if (settings.newProjectMode === "page") {
      router.push("/projects/new");
      return;
    }
    setSurface({ kind: "new_project", mode: settings.newProjectMode });
  }, [router, settings.newProjectMode]);

  const openNewFeedback = useCallback(
    (projectId?: string) => {
      if (settings.newFeedbackMode === "page") {
        const targetProject = projectId || projects[0]?.id;
        if (targetProject) {
          router.push(`/projects/${targetProject}/feedback/new`);
          return;
        }
      }
      setSurface({
        kind: "new_feedback",
        mode: settings.newFeedbackMode === "drawer" ? "drawer" : "modal",
        projectId,
      });
    },
    [projects, router, settings.newFeedbackMode],
  );

  const openTicket = useCallback(
    (ticketId: string) => {
      if (settings.ticketReviewMode === "page") {
        router.push(`/feedback/${ticketId}`);
        return;
      }
      syncTicketUrlParam(ticketId);
      setSurface({ kind: "review_ticket", mode: settings.ticketReviewMode, ticketId });
    },
    [router, settings.ticketReviewMode],
  );

  const closeSurface = useCallback(() => {
    syncTicketUrlParam(null);
    setSurface({ kind: "none" });
  }, []);

  const stepReviewTicket = useCallback(
    (delta: 1 | -1) => {
      if (surface.kind !== "review_ticket" || ticketQueue.length < 2) return;
      const idx = ticketQueue.indexOf(surface.ticketId);
      if (idx === -1) return;
      const nextIdx = (idx + delta + ticketQueue.length) % ticketQueue.length;
      const nextId = ticketQueue[nextIdx];
      syncTicketUrlParam(nextId);
      setSurface({ kind: "review_ticket", mode: surface.mode, ticketId: nextId });
    },
    [surface, ticketQueue],
  );

  const openCommandPalette = useCallback(() => {
    setPaletteQuery("");
    setPaletteOpen(true);
  }, []);

  const startTour = useCallback(
    (tourId: TourId) => {
      void runProductTour(tourId, (completed) => {
        if (!settings.completedTours.includes(completed)) {
          void updateSettings({
            completedTours: [...settings.completedTours, completed],
          });
        }
      });
    },
    [settings.completedTours, updateSettings],
  );

  // Global keyboard shortcuts: Cmd/Ctrl+K, C (Create Ticket), J/K (Step Review Drawer)
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteQuery("");
        setPaletteOpen((v) => !v);
        return;
      }

      const target = event.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (isEditable || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "c") {
        event.preventDefault();
        openNewFeedback();
      } else if (event.key === "j" && surface.kind === "review_ticket") {
        event.preventDefault();
        stepReviewTicket(1);
      } else if (event.key === "k" && surface.kind === "review_ticket") {
        event.preventDefault();
        stepReviewTicket(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openNewFeedback, surface.kind, stepReviewTicket]);

  const currentQueueIdx =
    surface.kind === "review_ticket" ? ticketQueue.indexOf(surface.ticketId) : -1;

  const stepperActions =
    surface.kind === "review_ticket" && currentQueueIdx !== -1 && ticketQueue.length > 1 ? (
      <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] font-mono text-slate-600">
        <button
          type="button"
          onClick={() => stepReviewTicket(-1)}
          title="Previous ticket (K)"
          className="rounded px-1.5 py-0.5 hover:bg-white hover:text-slate-950"
        >
          ↑ K
        </button>
        <span className="px-1 text-[10px] text-slate-400">
          {currentQueueIdx + 1}/{ticketQueue.length}
        </span>
        <button
          type="button"
          onClick={() => stepReviewTicket(1)}
          title="Next ticket (J)"
          className="rounded px-1.5 py-0.5 hover:bg-white hover:text-slate-950"
        >
          ↓ J
        </button>
      </div>
    ) : null;

  const paletteItems = [
    { label: "Go to Dashboard", hint: "Overview & metrics", action: () => router.push("/dashboard") },
    { label: "Go to Feedback Inbox", hint: `${openCount} open`, action: () => router.push("/feedback") },
    { label: "Go to Projects", hint: `${projects.length} projects`, action: () => router.push("/projects") },
    { label: "Create New Ticket", hint: "Shortcut: C", action: () => openNewFeedback() },
    { label: "Create New Project", hint: "Add repo & tracker", action: () => openNewProject() },
    {
      label: `Toggle Dark / Light Theme`,
      hint: `Current: ${settings.themeMode}`,
      action: () =>
        void updateSettings({ themeMode: settings.themeMode === "dark" ? "light" : "dark" }),
    },
    { label: "Workspace Settings", hint: "Themes, width, views, modals", action: () => router.push("/settings") },
    { label: "Wiki & Guideline", hint: "Workflow, MCP, Chrome ext", action: () => router.push("/guide") },
    { label: "Start Workspace Tour", hint: "Interactive guide", action: () => startTour("workspace") },
    ...projects.map((p) => ({
      label: `Project: ${p.name}`,
      hint: `${p.keyPrefix} · ${p.openCount} open`,
      action: () => router.push(`/projects/${p.id}/feedback`),
    })),
  ].filter(
    (item) =>
      !paletteQuery.trim() ||
      item.label.toLowerCase().includes(paletteQuery.toLowerCase()) ||
      item.hint.toLowerCase().includes(paletteQuery.toLowerCase()),
  );

  return (
    <WorkspaceContext.Provider
      value={{
        settings,
        projects,
        labels,
        savedViews,
        openCount,
        updateSettings,
        refreshLabels: setLabels,
        refreshSavedViews: setSavedViews,
        registerTicketQueue: setTicketQueue,
        openNewProject,
        openNewFeedback,
        openTicket,
        openCommandPalette,
        startTour,
      }}
    >
      {children}

      {/* Surface: New Project (Modal / Drawer) */}
      {surface.kind === "new_project" &&
        (surface.mode === "modal" ? (
          <ModalShell
            open
            title="New Project"
            subtitle="Configure repository, live domain, and issue tracking platform."
            fullPageHref="/projects/new"
            onClose={closeSurface}
            size="md"
          >
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <ProjectForm
                mode="create"
                onCancel={closeSurface}
                onSuccess={(created) => {
                  closeSurface();
                  router.push(`/projects/${created.id}/dashboard`);
                  router.refresh();
                }}
              />
            </div>
          </ModalShell>
        ) : (
          <DrawerShell
            open
            title="New Project"
            subtitle="Configure repository, live domain, and issue tracking platform."
            fullPageHref="/projects/new"
            onClose={closeSurface}
            size="md"
          >
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <ProjectForm
                mode="create"
                onCancel={closeSurface}
                onSuccess={(created) => {
                  closeSurface();
                  router.push(`/projects/${created.id}/dashboard`);
                  router.refresh();
                }}
              />
            </div>
          </DrawerShell>
        ))}

      {/* Surface: New Feedback (Modal / Drawer) */}
      {surface.kind === "new_feedback" &&
        (surface.mode === "modal" ? (
          <ModalShell
            open
            title="New Ticket"
            subtitle="Capture a bug, feature request, improvement, or question."
            fullPageHref={
              surface.projectId || projects[0]?.id
                ? `/projects/${surface.projectId || projects[0]?.id}/feedback/new`
                : undefined
            }
            onClose={closeSurface}
            size="xl"
          >
            <FeedbackCreateForm
              projects={projects}
              defaultProjectId={surface.projectId}
              onCancel={closeSurface}
              onSuccess={() => {
                closeSurface();
                router.refresh();
              }}
            />
          </ModalShell>
        ) : (
          <DrawerShell
            open
            title="New Ticket"
            subtitle="Capture a bug, feature request, improvement, or question."
            fullPageHref={
              surface.projectId || projects[0]?.id
                ? `/projects/${surface.projectId || projects[0]?.id}/feedback/new`
                : undefined
            }
            onClose={closeSurface}
            size="lg"
          >
            <FeedbackCreateForm
              projects={projects}
              defaultProjectId={surface.projectId}
              compactLayout
              onCancel={closeSurface}
              onSuccess={() => {
                closeSurface();
                router.refresh();
              }}
            />
          </DrawerShell>
        ))}

      {/* Surface: Review Ticket (Drawer default / Modal) with URL sync + J/K stepper */}
      {surface.kind === "review_ticket" &&
        (surface.mode === "drawer" ? (
          <DrawerShell
            open
            title="Ticket Review"
            subtitle="Use J / K keys to step through tickets rapidly."
            fullPageHref={`/feedback/${surface.ticketId}`}
            headerActions={stepperActions}
            onClose={closeSurface}
            size="xl"
          >
            <TicketDetailWorkspace
              key={surface.ticketId}
              feedbackId={surface.ticketId}
              surfaceMode="drawer"
              onOpenTicket={(nextId) => {
                syncTicketUrlParam(nextId);
                setSurface({ kind: "review_ticket", mode: "drawer", ticketId: nextId });
              }}
              onDeleted={() => {
                closeSurface();
                router.refresh();
              }}
            />
          </DrawerShell>
        ) : (
          <ModalShell
            open
            title="Ticket Review"
            subtitle="Use J / K keys to step through tickets rapidly."
            fullPageHref={`/feedback/${surface.ticketId}`}
            headerActions={stepperActions}
            onClose={closeSurface}
            size="xl"
          >
            <TicketDetailWorkspace
              key={surface.ticketId}
              feedbackId={surface.ticketId}
              surfaceMode="modal"
              onOpenTicket={(nextId) => {
                syncTicketUrlParam(nextId);
                setSurface({ kind: "review_ticket", mode: "modal", ticketId: nextId });
              }}
              onDeleted={() => {
                closeSurface();
                router.refresh();
              }}
            />
          </ModalShell>
        ))}

      {/* Command Palette (Cmd/Ctrl + K) */}
      <ModalShell
        open={paletteOpen}
        title="Command Palette"
        subtitle="Jump anywhere or trigger quick workspace actions."
        onClose={() => setPaletteOpen(false)}
        size="md"
      >
        <div className="space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={paletteQuery}
              onChange={(e) => setPaletteQuery(e.target.value)}
              placeholder="Type a command or project name…"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm text-slate-950 outline-none focus:border-slate-950"
            />
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {paletteItems.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-500">No matching commands.</li>
            ) : (
              paletteItems.map((item, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => {
                      setPaletteOpen(false);
                      item.action();
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-900">{item.label}</span>
                    <span className="font-mono text-xs text-slate-400">{item.hint}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </ModalShell>
    </WorkspaceContext.Provider>
  );
}
