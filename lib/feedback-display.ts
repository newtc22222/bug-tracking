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
    open: "inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/15",
    in_progress:
      "inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20",
    resolved:
      "inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    closed:
      "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15",
  };

  return classes[status];
}

export function sourceBadgeClass(source: FeedbackSource): string {
  const classes: Record<FeedbackSource, string> = {
    manual:
      "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15",
    public_form:
      "inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/15",
    extension:
      "inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/15",
    api: "inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 ring-1 ring-inset ring-cyan-600/15",
  };

  return classes[source];
}

export function priorityBadgeClass(priority: FeedbackPriority | null): string {
  if (!priority) {
    return "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/15";
  }

  const classes: Record<FeedbackPriority, string> = {
    low: "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15",
    medium:
      "inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20",
    high: "inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20",
  };

  return classes[priority];
}

export function priorityDotClass(priority: FeedbackPriority | null): string {
  if (!priority) {
    return "bg-slate-200";
  }

  const classes: Record<FeedbackPriority, string> = {
    high: "bg-red-500",
    medium: "bg-amber-500",
    low: "bg-slate-400",
  };

  return classes[priority];
}

export function typeAccentClass(type: FeedbackType): string {
  const classes: Record<FeedbackType, string> = {
    bug: "text-red-600",
    improvement: "text-amber-600",
    feature: "text-indigo-600",
    question: "text-sky-600",
  };

  return classes[type];
}
