import { prisma } from "@/lib/prisma";

export function normalizeKeyPrefix(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

export function deriveKeyPrefix(name: string, slug?: string): string {
  const words = name
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    const acronym = words
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
    if (acronym.length >= 2) {
      return acronym;
    }
  }

  const clean = normalizeKeyPrefix(slug || name);
  if (clean.length >= 3) {
    return clean.slice(0, 4);
  }
  if (clean.length >= 2) {
    return clean;
  }
  return "PRJ";
}

export async function generateUniqueKeyPrefix(
  preferred: string | null | undefined,
  name: string,
  slug?: string,
  excludeProjectId?: string,
): Promise<string> {
  const base = normalizeKeyPrefix(preferred || "") || deriveKeyPrefix(name, slug);
  if (typeof prisma.project?.findUnique !== "function") {
    return base;
  }

  let candidate = base;
  let suffix = 1;
  while (suffix <= 99) {
    const existing = await prisma.project.findUnique({
      where: { keyPrefix: candidate },
      select: { id: true },
    });
    if (!existing || (excludeProjectId && existing.id === excludeProjectId)) {
      return candidate;
    }
    candidate = `${base.slice(0, 6)}${suffix}`;
    suffix += 1;
  }
  return `${base.slice(0, 4)}${Date.now().toString().slice(-4)}`;
}

export async function allocateNextTicketKey(projectId: string): Promise<{
  sequenceNumber: number;
  ticketKey: string | null;
}> {
  if (typeof prisma.project?.update !== "function") {
    return { sequenceNumber: 0, ticketKey: null };
  }

  try {
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { nextSequence: { increment: 1 } },
      select: { keyPrefix: true, nextSequence: true },
    });

    if (!updated || typeof updated.nextSequence !== "number" || !updated.keyPrefix) {
      return { sequenceNumber: 0, ticketKey: null };
    }

    const sequenceNumber = Math.max(1, updated.nextSequence - 1);
    return {
      sequenceNumber,
      ticketKey: `${updated.keyPrefix}-${sequenceNumber}`,
    };
  } catch {
    return { sequenceNumber: 0, ticketKey: null };
  }
}
