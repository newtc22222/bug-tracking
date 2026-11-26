import type {
  LayoutWidth,
  PresentationMode,
  ThemeAccent,
  ThemeMode,
  TicketViewMode,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WorkspaceSettingsData = {
  layoutWidth: LayoutWidth;
  defaultTicketView: TicketViewMode;
  newProjectMode: PresentationMode;
  newFeedbackMode: PresentationMode;
  ticketReviewMode: PresentationMode;
  sidebarCollapsed: boolean;
  themeMode: ThemeMode;
  themeAccent: ThemeAccent;
  completedTours: string[];
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettingsData = {
  layoutWidth: "full",
  defaultTicketView: "list_full",
  newProjectMode: "page",
  newFeedbackMode: "modal",
  ticketReviewMode: "drawer",
  sidebarCollapsed: false,
  themeMode: "system",
  themeAccent: "slate",
  completedTours: [],
};

export const LAYOUT_WIDTH_COOKIE = "bt_layout_width";
export const THEME_MODE_COOKIE = "bt_theme_mode";
export const THEME_ACCENT_COOKIE = "bt_theme_accent";

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsData> {
  if (typeof prisma.workspaceSettings?.findUnique !== "function") {
    return DEFAULT_WORKSPACE_SETTINGS;
  }

  try {
    const row = await prisma.workspaceSettings.findUnique({
      where: { id: "default" },
    });

    if (!row) {
      return DEFAULT_WORKSPACE_SETTINGS;
    }

    return {
      layoutWidth: row.layoutWidth,
      defaultTicketView: row.defaultTicketView,
      newProjectMode: row.newProjectMode,
      newFeedbackMode: row.newFeedbackMode,
      ticketReviewMode: row.ticketReviewMode,
      sidebarCollapsed: row.sidebarCollapsed,
      themeMode: row.themeMode ?? "system",
      themeAccent: row.themeAccent ?? "slate",
      completedTours: row.completedTours ?? [],
    };
  } catch {
    return DEFAULT_WORKSPACE_SETTINGS;
  }
}
