import type {
  FeedbackPriority,
  FeedbackSource,
  FeedbackStatus,
  FeedbackType,
  Prisma,
} from "@prisma/client";
import {
  priorityOptions,
  sourceOptions,
  statusOptions,
  typeOptions,
} from "@/lib/feedback-display";

export const sortOptions = [
  "newest",
  "oldest",
  "updated",
  "priority_desc",
  "priority_asc",
] as const;

export type FeedbackSortOption = (typeof sortOptions)[number];

export const sortLabels: Record<FeedbackSortOption, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  updated: "Recently updated",
  priority_desc: "Priority (high to low)",
  priority_asc: "Priority (low to high)",
};

export type FeedbackQueryFilters = {
  q: string;
  projectId?: string;
  status?: FeedbackStatus;
  type?: FeedbackType;
  priority?: FeedbackPriority | "none";
  source?: FeedbackSource;
  sort: FeedbackSortOption;
};

export type ParseFeedbackQueryResult =
  | {
      ok: true;
      filters: FeedbackQueryFilters;
      where: Prisma.FeedbackItemWhereInput;
      orderBy:
        | Prisma.FeedbackItemOrderByWithRelationInput
        | Prisma.FeedbackItemOrderByWithRelationInput[];
      page: number;
      pageSize: number;
      skip: number;
      take: number;
    }
  | {
      ok: false;
      error: string;
    };

type QueryParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

type ParseOptions = {
  projectId?: string;
  defaultPageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parseFeedbackQueryParams(
  searchParams: QueryParamSource,
  options: ParseOptions = {},
): ParseFeedbackQueryResult {
  const q = readParam(searchParams, "q")?.trim() || "";
  const rawProjectId = options.projectId ?? readParam(searchParams, "projectId")?.trim();
  const projectId = rawProjectId ? rawProjectId : undefined;
  const rawStatus = readParam(searchParams, "status")?.trim() || "";
  const rawType = readParam(searchParams, "type")?.trim() || "";
  const rawPriority = readParam(searchParams, "priority")?.trim() || "";
  const rawSource = readParam(searchParams, "source")?.trim() || "";
  const rawSort = readParam(searchParams, "sort")?.trim() || "";
  const rawPage = readParam(searchParams, "page")?.trim() || "";
  const rawPageSize = readParam(searchParams, "pageSize")?.trim() || "";

  if (rawStatus && !statusOptions.includes(rawStatus as FeedbackStatus)) {
    return { ok: false, error: "Invalid status filter" };
  }

  if (rawType && !typeOptions.includes(rawType as FeedbackType)) {
    return { ok: false, error: "Invalid type filter" };
  }

  if (
    rawPriority &&
    rawPriority !== "none" &&
    !priorityOptions.includes(rawPriority as FeedbackPriority)
  ) {
    return { ok: false, error: "Invalid priority filter" };
  }

  if (rawSource && !sourceOptions.includes(rawSource as FeedbackSource)) {
    return { ok: false, error: "Invalid source filter" };
  }

  const sort: FeedbackSortOption = rawSort
    ? (rawSort as FeedbackSortOption)
    : "newest";
  if (!sortOptions.includes(sort)) {
    return { ok: false, error: "Invalid sort option" };
  }

  const page = rawPage ? parsePositiveInt(rawPage) : 1;
  if (page === null) {
    return { ok: false, error: "Invalid page parameter" };
  }

  const fallbackPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const parsedPageSize = rawPageSize ? parsePositiveInt(rawPageSize) : fallbackPageSize;
  if (parsedPageSize === null) {
    return { ok: false, error: "Invalid pageSize parameter" };
  }
  const pageSize = Math.min(parsedPageSize, MAX_PAGE_SIZE);

  const status = rawStatus ? (rawStatus as FeedbackStatus) : undefined;
  const type = rawType ? (rawType as FeedbackType) : undefined;
  const priority = rawPriority
    ? (rawPriority as FeedbackPriority | "none")
    : undefined;
  const source = rawSource ? (rawSource as FeedbackSource) : undefined;

  const where: Prisma.FeedbackItemWhereInput = {
    ...(projectId ? { projectId } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(priority === "none"
      ? { priority: null }
      : priority
        ? { priority }
        : {}),
    ...(source ? { source } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { reporterName: { contains: q, mode: "insensitive" } },
            { reporterEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  return {
    ok: true,
    filters: {
      q,
      projectId,
      status,
      type,
      priority,
      source,
      sort,
    },
    where,
    orderBy: buildOrderBy(sort),
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildFeedbackQueryString(
  filters: Partial<FeedbackQueryFilters> & { page?: number },
): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.source) params.set("source", filters.source);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildOrderBy(
  sort: FeedbackSortOption,
):
  | Prisma.FeedbackItemOrderByWithRelationInput
  | Prisma.FeedbackItemOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "updated":
      return { updatedAt: "desc" };
    case "priority_desc":
      return [{ priority: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
    case "priority_asc":
      return [{ priority: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

function readParam(source: QueryParamSource, key: string): string | undefined {
  if (source instanceof URLSearchParams) {
    return source.get(key) ?? undefined;
  }

  const value = source[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
}
