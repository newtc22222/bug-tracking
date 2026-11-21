import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
} from "@prisma/client";

export const statusOptions = ["open", "in_progress", "resolved", "closed"] as const;
export const typeOptions = ["bug", "improvement", "feature", "question"] as const;
export const priorityOptions = ["low", "medium", "high"] as const;
export const sourceOptions = ["manual", "public_form", "extension", "api"] as const;

export const statusLabels: Record<FeedbackStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const typeLabels: Record<FeedbackType, string> = {
  bug: "Bug",
  improvement: "Improvement",
  feature: "Feature",
  question: "Question",
};

export const priorityLabels: Record<FeedbackPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const sourceLabels: Record<FeedbackSource, string> = {
  manual: "Manual",
  public_form: "Public form",
  extension: "Extension",
  api: "API",
};

export function statusBadgeClass(status: FeedbackStatus): string {
  const classes: Record<FeedbackStatus, string> = {
    open: "rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700",
    in_progress: "rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700",
    resolved: "rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700",
    closed: "rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600",
  };

  return classes[status];
}

export function sourceBadgeClass(source: FeedbackSource): string {
  const classes: Record<FeedbackSource, string> = {
    manual: "rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600",
    public_form: "rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700",
    extension: "rounded-full bg-purple-50 px-2.5 py-1 font-medium text-purple-700",
    api: "rounded-full bg-cyan-50 px-2.5 py-1 font-medium text-cyan-700",
  };

  return classes[source];
}

export function priorityBadgeClass(priority: FeedbackPriority | null): string {
  if (!priority) {
    return "rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-500";
  }

  const classes: Record<FeedbackPriority, string> = {
    low: "rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600",
    medium: "rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700",
    high: "rounded-full bg-red-50 px-2.5 py-1 font-medium text-red-700",
  };

  return classes[priority];
}
