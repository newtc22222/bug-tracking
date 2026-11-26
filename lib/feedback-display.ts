import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
  GitPlatform,
  LayoutWidth,
  PresentationMode,
  ThemeAccent,
  ThemeMode,
  TicketViewMode,
  TrackerPlatform,
} from "@prisma/client";

export const statusOptions = [
  "open",
  "todo",
  "in_progress",
  "blocked",
  "resolved",
  "closed",
] as const satisfies readonly FeedbackStatus[];

export const typeOptions = [
  "bug",
  "improvement",
  "feature",
  "question",
] as const satisfies readonly FeedbackType[];

export const priorityOptions = [
  "low",
  "medium",
  "high",
  "urgent",
] as const satisfies readonly FeedbackPriority[];

export const priorityDisplayOrder = [
  "urgent",
  "high",
  "medium",
  "low",
] as const satisfies readonly FeedbackPriority[];

export const sourceOptions = [
  "manual",
  "public_form",
  "extension",
  "api",
] as const satisfies readonly FeedbackSource[];

export const gitPlatformOptions = [
  "none",
  "github",
  "gitlab",
  "bitbucket",
  "azure_devops",
  "gitea",
  "custom",
] as const satisfies readonly GitPlatform[];

export const trackerPlatformOptions = [
  "none",
  "github_issues",
  "gitlab_issues",
  "linear",
  "jira",
  "bitbucket_issues",
] as const satisfies readonly TrackerPlatform[];

export const layoutWidthOptions = [
  "full",
  "wide",
  "narrow",
] as const satisfies readonly LayoutWidth[];

export const presentationModeOptions = [
  "page",
  "modal",
  "drawer",
] as const satisfies readonly PresentationMode[];

export const ticketViewModeOptions = [
  "list_full",
  "list_fixed",
  "grid",
  "kanban",
] as const satisfies readonly TicketViewMode[];

export const themeModeOptions = [
  "system",
  "light",
  "dark",
] as const satisfies readonly ThemeMode[];

export const themeAccentOptions = [
  "slate",
  "indigo",
  "emerald",
  "amber",
  "rose",
] as const satisfies readonly ThemeAccent[];

export const themeModeLabels: Record<ThemeMode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export const themeAccentLabels: Record<ThemeAccent, string> = {
  slate: "Slate (Linear)",
  indigo: "Indigo",
  emerald: "Emerald",
  amber: "Amber",
  rose: "Rose",
};

export const labelColorOptions = [
  "slate",
  "red",
  "orange",
  "amber",
  "emerald",
  "cyan",
  "blue",
  "indigo",
  "purple",
  "rose",
] as const;

export type LabelColor = (typeof labelColorOptions)[number];

export function labelBadgeClass(color: string): string {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-500/20",
    red: "bg-red-50 text-red-700 ring-red-600/20",
    orange: "bg-orange-50 text-orange-700 ring-orange-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    cyan: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
    rose: "bg-rose-50 text-rose-700 ring-rose-600/20",
  };
  return `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${map[color] || map.slate}`;
}

export function labelDotClass(color: string): string {
  const map: Record<string, string> = {
    slate: "bg-slate-500",
    red: "bg-red-500",
    orange: "bg-orange-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    cyan: "bg-cyan-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
    rose: "bg-rose-500",
  };
  return map[color] || map.slate;
}

export const statusLabels: Record<FeedbackStatus, string> = {
  open: "Open",
  todo: "To Do",
  in_progress: "In Progress",
  blocked: "Blocked",
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
  urgent: "Urgent",
};

export const sourceLabels: Record<FeedbackSource, string> = {
  manual: "Manual",
  public_form: "Public form",
  extension: "Extension",
  api: "API",
};

export const gitPlatformLabels: Record<GitPlatform, string> = {
  none: "None",
  github: "GitHub",
  gitlab: "GitLab",
  bitbucket: "Bitbucket",
  azure_devops: "Azure DevOps",
  gitea: "Gitea",
  custom: "Custom Git",
};

export const trackerPlatformLabels: Record<TrackerPlatform, string> = {
  none: "None (Built-in only)",
  github_issues: "GitHub Issues",
  gitlab_issues: "GitLab Issues",
  linear: "Linear",
  jira: "Jira",
  bitbucket_issues: "Bitbucket Issues",
};

export const layoutWidthLabels: Record<LayoutWidth, string> = {
  full: "Full (100%)",
  wide: "Wide (1280px)",
  narrow: "Narrow (1024px)",
};

export const presentationModeLabels: Record<PresentationMode, string> = {
  page: "Full Page",
  modal: "Modal",
  drawer: "Drawer",
};

export const ticketViewModeLabels: Record<TicketViewMode, string> = {
  list_full: "Full Scroll List",
  list_fixed: "Fixed Height List",
  grid: "Card Grid",
  kanban: "Kanban Board",
};

export function layoutWidthClass(width: LayoutWidth): string {
  switch (width) {
    case "narrow":
      return "mx-auto w-full max-w-5xl";
    case "wide":
      return "mx-auto w-full max-w-7xl";
    case "full":
    default:
      return "w-full max-w-none";
  }
}

export function statusBadgeClass(status: FeedbackStatus): string {
  const classes: Record<FeedbackStatus, string> = {
    open: "inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/15",
    todo: "inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20",
    in_progress:
      "inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20",
    blocked:
      "inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/25",
    resolved:
      "inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    closed:
      "inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/15",
  };

  return classes[status];
}

export function statusColumnAccentClass(status: FeedbackStatus): string {
  const classes: Record<FeedbackStatus, string> = {
    open: "bg-blue-500",
    todo: "bg-indigo-500",
    in_progress: "bg-amber-500",
    blocked: "bg-rose-500",
    resolved: "bg-emerald-500",
    closed: "bg-slate-400",
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
    high: "inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20",
    urgent:
      "inline-flex items-center rounded-md bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white shadow-2xs",
  };

  return classes[priority];
}

export function priorityDotClass(priority: FeedbackPriority | null): string {
  if (!priority) {
    return "bg-slate-200";
  }

  const classes: Record<FeedbackPriority, string> = {
    urgent: "bg-rose-600 ring-2 ring-rose-200",
    high: "bg-orange-500",
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
