"use client";

import type { DriveStep } from "driver.js";

export type TourId = "workspace" | "triage";

export async function runProductTour(tourId: TourId, onComplete?: (id: TourId) => void) {
  const { driver } = await import("driver.js");

  const stepsMap: Record<TourId, DriveStep[]> = {
    workspace: [
      {
        element: '[data-tour="sidebar-nav"]',
        popover: {
          title: "Collapsible Workbench Sidebar",
          description:
            "Jump between Global Dashboard, Inbox, Projects, Guidelines, and Settings. Collapse the sidebar anytime for maximum screen space.",
          side: "right",
        },
      },
      {
        element: '[data-tour="quick-create"]',
        popover: {
          title: "Quick Bug Capture (Press C)",
          description:
            "Create a new ticket from anywhere in a Modal, Drawer, or Full Page depending on your Settings.",
          side: "right",
        },
      },
      {
        element: '[data-tour="command-palette-btn"]',
        popover: {
          title: "Command Palette (Ctrl/Cmd + K)",
          description:
            "Search projects, jump to views, switch layout width, or launch quick actions from the keyboard.",
          side: "right",
        },
      },
      {
        element: '[data-tour="view-switcher"]',
        popover: {
          title: "Flexible Ticket Views",
          description:
            "Switch seamlessly between Full Scroll List, Fixed-Height List, Card Grid, and a strict-workflow Kanban board.",
          side: "bottom",
        },
      },
    ],
    triage: [
      {
        element: '[data-tour="triage-properties"]',
        popover: {
          title: "Strict Triage Order: Type → Priority → Status",
          description:
            "Classify the issue type, set priority (including Urgent), and move tickets strictly along the workflow graph.",
          side: "left",
        },
      },
    ],
  };

  const candidates = stepsMap[tourId] || [];
  const visibleSteps = candidates.filter((step) => {
    if (!step.element || typeof step.element !== "string") return true;
    return Boolean(document.querySelector(step.element));
  });

  if (visibleSteps.length === 0) return;

  const instance = driver({
    showProgress: true,
    animate: true,
    overlayOpacity: 0.45,
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Got it",
    steps: visibleSteps,
    onDestroyed: () => {
      onComplete?.(tourId);
    },
  });

  instance.drive();
}
