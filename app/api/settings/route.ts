import { NextRequest, NextResponse } from "next/server";
import type {
  LayoutWidth,
  PresentationMode,
  ThemeAccent,
  ThemeMode,
  TicketViewMode,
} from "@prisma/client";
import { requireAdminApiSession } from "@/lib/auth";
import {
  layoutWidthOptions,
  presentationModeOptions,
  themeAccentOptions,
  themeModeOptions,
  ticketViewModeOptions,
} from "@/lib/feedback-display";
import { prisma } from "@/lib/prisma";
import {
  getWorkspaceSettings,
  LAYOUT_WIDTH_COOKIE,
  THEME_ACCENT_COOKIE,
  THEME_MODE_COOKIE,
} from "@/lib/workspace-settings";

export async function GET() {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  const settings = await getWorkspaceSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const unauthorized = await requireAdminApiSession();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(payload, "layoutWidth")) {
    if (
      typeof payload.layoutWidth !== "string" ||
      !layoutWidthOptions.includes(payload.layoutWidth as LayoutWidth)
    ) {
      return NextResponse.json({ error: "Invalid layoutWidth" }, { status: 400 });
    }
    data.layoutWidth = payload.layoutWidth;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "defaultTicketView")) {
    if (
      typeof payload.defaultTicketView !== "string" ||
      !ticketViewModeOptions.includes(payload.defaultTicketView as TicketViewMode)
    ) {
      return NextResponse.json({ error: "Invalid defaultTicketView" }, { status: 400 });
    }
    data.defaultTicketView = payload.defaultTicketView;
  }

  for (const field of ["newProjectMode", "newFeedbackMode", "ticketReviewMode"] as const) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      if (
        typeof payload[field] !== "string" ||
        !presentationModeOptions.includes(payload[field] as PresentationMode)
      ) {
        return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
      }
      data[field] = payload[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "themeMode")) {
    if (
      typeof payload.themeMode !== "string" ||
      !themeModeOptions.includes(payload.themeMode as ThemeMode)
    ) {
      return NextResponse.json({ error: "Invalid themeMode" }, { status: 400 });
    }
    data.themeMode = payload.themeMode;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "themeAccent")) {
    if (
      typeof payload.themeAccent !== "string" ||
      !themeAccentOptions.includes(payload.themeAccent as ThemeAccent)
    ) {
      return NextResponse.json({ error: "Invalid themeAccent" }, { status: 400 });
    }
    data.themeAccent = payload.themeAccent;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "sidebarCollapsed")) {
    if (typeof payload.sidebarCollapsed !== "boolean") {
      return NextResponse.json({ error: "Invalid sidebarCollapsed" }, { status: 400 });
    }
    data.sidebarCollapsed = payload.sidebarCollapsed;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "completedTours")) {
    if (
      !Array.isArray(payload.completedTours) ||
      !payload.completedTours.every((t) => typeof t === "string")
    ) {
      return NextResponse.json({ error: "Invalid completedTours" }, { status: 400 });
    }
    data.completedTours = Array.from(new Set(payload.completedTours)).slice(0, 20);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "At least one setting is required" }, { status: 400 });
  }

  const updated = await prisma.workspaceSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  const response = NextResponse.json({
    layoutWidth: updated.layoutWidth,
    defaultTicketView: updated.defaultTicketView,
    newProjectMode: updated.newProjectMode,
    newFeedbackMode: updated.newFeedbackMode,
    ticketReviewMode: updated.ticketReviewMode,
    sidebarCollapsed: updated.sidebarCollapsed,
    themeMode: updated.themeMode,
    themeAccent: updated.themeAccent,
    completedTours: updated.completedTours,
  });

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };

  if (typeof data.layoutWidth === "string") {
    response.cookies.set(LAYOUT_WIDTH_COOKIE, data.layoutWidth, cookieOpts);
  }
  if (typeof data.themeMode === "string") {
    response.cookies.set(THEME_MODE_COOKIE, data.themeMode, cookieOpts);
  }
  if (typeof data.themeAccent === "string") {
    response.cookies.set(THEME_ACCENT_COOKIE, data.themeAccent, cookieOpts);
  }

  return response;
}
