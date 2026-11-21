import { prisma } from "@/lib/prisma";

const inMemoryAttempts = new Map<string, number[]>();

export async function allowRateLimitedAction(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<boolean> {
  const hasDbRateLimiter =
    typeof prisma.rateLimitBucket?.findUnique === "function" &&
    typeof prisma.rateLimitBucket?.upsert === "function" &&
    typeof prisma.rateLimitBucket?.update === "function";

  if (!hasDbRateLimiter) {
    return allowInMemory(key, maxAttempts, windowMs);
  }

  const now = new Date();
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      update: { count: 1, windowStart: now },
      create: { key, count: 1, windowStart: now },
    });
    return true;
  }

  if (existing.count >= maxAttempts) {
    return false;
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return true;
}

function allowInMemory(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const recentAttempts = (inMemoryAttempts.get(key) || []).filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recentAttempts.length >= maxAttempts) {
    inMemoryAttempts.set(key, recentAttempts);
    return false;
  }

  recentAttempts.push(now);
  inMemoryAttempts.set(key, recentAttempts);
  return true;
}
