import type { FeedbackStatus } from "@prisma/client";

export const WORKFLOW_TRANSITIONS: Record<FeedbackStatus, readonly FeedbackStatus[]> = {
  open: ["todo", "in_progress", "blocked", "closed"],
  todo: ["in_progress", "blocked", "open", "closed"],
  in_progress: ["resolved", "blocked", "todo"],
  blocked: ["in_progress", "todo", "closed"],
  resolved: ["closed", "in_progress"],
  closed: ["open"],
};

export type WorkflowNodeMeta = {
  status: FeedbackStatus;
  label: string;
  shortDescription: string;
  x: number;
  y: number;
  tone: "blue" | "indigo" | "amber" | "rose" | "emerald" | "slate";
};

export type WorkflowEdgeMeta = {
  from: FeedbackStatus;
  to: FeedbackStatus;
  label: string;
};

export const WORKFLOW_NODES: readonly WorkflowNodeMeta[] = [
  {
    status: "open",
    label: "Open",
    shortDescription: "New untriaged report awaiting review",
    x: 90,
    y: 120,
    tone: "blue",
  },
  {
    status: "todo",
    label: "To Do",
    shortDescription: "Triaged and queued for engineering",
    x: 270,
    y: 60,
    tone: "indigo",
  },
  {
    status: "in_progress",
    label: "In Progress",
    shortDescription: "Actively being investigated or fixed",
    x: 470,
    y: 120,
    tone: "amber",
  },
  {
    status: "blocked",
    label: "Blocked",
    shortDescription: "Waiting on a dependency or external fix",
    x: 470,
    y: 235,
    tone: "rose",
  },
  {
    status: "resolved",
    label: "Resolved",
    shortDescription: "Fix shipped and ready for verification",
    x: 670,
    y: 120,
    tone: "emerald",
  },
  {
    status: "closed",
    label: "Closed",
    shortDescription: "Verified complete, duplicate, or won't fix",
    x: 850,
    y: 120,
    tone: "slate",
  },
];

export const WORKFLOW_EDGES: readonly WorkflowEdgeMeta[] = [
  { from: "open", to: "todo", label: "Queue" },
  { from: "open", to: "in_progress", label: "Start now" },
  { from: "open", to: "blocked", label: "Block" },
  { from: "open", to: "closed", label: "Dismiss / Duplicate" },
  { from: "todo", to: "in_progress", label: "Start" },
  { from: "todo", to: "blocked", label: "Block" },
  { from: "todo", to: "open", label: "Back to triage" },
  { from: "todo", to: "closed", label: "Cancel" },
  { from: "in_progress", to: "resolved", label: "Resolve" },
  { from: "in_progress", to: "blocked", label: "Block" },
  { from: "in_progress", to: "todo", label: "Pause" },
  { from: "blocked", to: "in_progress", label: "Resume" },
  { from: "blocked", to: "todo", label: "Re-queue" },
  { from: "blocked", to: "closed", label: "Close" },
  { from: "resolved", to: "closed", label: "Verify & Close" },
  { from: "resolved", to: "in_progress", label: "Reopen fix" },
  { from: "closed", to: "open", label: "Reopen" },
];

export function canTransitionStatus(
  from: FeedbackStatus | undefined | null,
  to: FeedbackStatus,
): boolean {
  if (!from || from === to) {
    return true;
  }
  return WORKFLOW_TRANSITIONS[from].includes(to);
}

export function getAllowedNextStatuses(current: FeedbackStatus): FeedbackStatus[] {
  return [...WORKFLOW_TRANSITIONS[current]];
}

export function getSelectableStatuses(current: FeedbackStatus): FeedbackStatus[] {
  return [current, ...WORKFLOW_TRANSITIONS[current]];
}

export function getTransitionErrorMessage(from: FeedbackStatus, to: FeedbackStatus): string {
  const allowed = WORKFLOW_TRANSITIONS[from].join(", ");
  return `Cannot transition status from "${from}" to "${to}". Allowed next statuses: ${allowed}.`;
}
