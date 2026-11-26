import type { FeedbackLinkType, FeedbackPriority, FeedbackStatus, FeedbackType } from "@prisma/client";

export type LinkDirection =
  | "blocks"
  | "is_blocked_by"
  | "causes"
  | "is_caused_by"
  | "duplicates"
  | "is_duplicated_by"
  | "relates_to"
  | "parent_of"
  | "subtask_of";

export const linkDirectionOptions: readonly LinkDirection[] = [
  "is_blocked_by",
  "blocks",
  "relates_to",
  "is_caused_by",
  "causes",
  "duplicates",
  "is_duplicated_by",
  "parent_of",
  "subtask_of",
];

export const linkDirectionLabels: Record<LinkDirection, string> = {
  blocks: "Blocks",
  is_blocked_by: "Is blocked by",
  causes: "Caused",
  is_caused_by: "Is caused by",
  duplicates: "Duplicates",
  is_duplicated_by: "Is duplicated by",
  relates_to: "Relates to",
  parent_of: "Parent of",
  subtask_of: "Subtask of",
};

export function linkDirectionBadgeClass(direction: LinkDirection): string {
  switch (direction) {
    case "is_blocked_by":
    case "blocks":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    case "causes":
    case "is_caused_by":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "duplicates":
    case "is_duplicated_by":
      return "bg-purple-50 text-purple-700 ring-purple-600/20";
    case "parent_of":
    case "subtask_of":
      return "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
    case "relates_to":
    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }
}

export function resolveCanonicalLink(
  currentId: string,
  otherId: string,
  direction: LinkDirection,
): { sourceId: string; targetId: string; relationType: FeedbackLinkType } {
  switch (direction) {
    case "blocks":
      return { sourceId: currentId, targetId: otherId, relationType: "blocks" };
    case "is_blocked_by":
      return { sourceId: otherId, targetId: currentId, relationType: "blocks" };
    case "causes":
      return { sourceId: currentId, targetId: otherId, relationType: "causes" };
    case "is_caused_by":
      return { sourceId: otherId, targetId: currentId, relationType: "causes" };
    case "duplicates":
      return { sourceId: currentId, targetId: otherId, relationType: "duplicates" };
    case "is_duplicated_by":
      return { sourceId: otherId, targetId: currentId, relationType: "duplicates" };
    case "parent_of":
      return { sourceId: currentId, targetId: otherId, relationType: "parent_of" };
    case "subtask_of":
      return { sourceId: otherId, targetId: currentId, relationType: "parent_of" };
    case "relates_to": {
      const [sourceId, targetId] = currentId < otherId ? [currentId, otherId] : [otherId, currentId];
      return { sourceId, targetId, relationType: "relates_to" };
    }
  }
}

export type LinkedTicketSummary = {
  id: string;
  ticketKey: string | null;
  title: string;
  status: FeedbackStatus;
  type: FeedbackType;
  priority: FeedbackPriority | null;
  project?: {
    id: string;
    name: string;
    slug: string;
  };
};

export type ResolvedTicketLink = {
  id: string;
  direction: LinkDirection;
  label: string;
  relationType: FeedbackLinkType;
  createdByEmail: string;
  createdAt: string;
  related: LinkedTicketSummary;
};

export function resolveDirectionForItem(
  relationType: FeedbackLinkType,
  isOutgoing: boolean,
): LinkDirection {
  if (relationType === "relates_to") return "relates_to";
  if (isOutgoing) {
    return relationType;
  }
  switch (relationType) {
    case "blocks":
      return "is_blocked_by";
    case "causes":
      return "is_caused_by";
    case "duplicates":
      return "is_duplicated_by";
    case "parent_of":
      return "subtask_of";
  }
}
