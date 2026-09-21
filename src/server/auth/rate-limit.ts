import { db, rateLimits } from '@/server/db';
import { eq, lt } from 'drizzle-orm';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Database-backed rate limiter suitable for serverless deployment.
 * @param key Unique key for the rate limit (e.g. "login:127.0.0.1:user@example.com")
 * @param limit Maximum allowed attempts within window
 * @param windowMs Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();

  // Clean up any stale records occasionally
  try {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, now - 3600000));
  } catch {
    // Ignore cleanup errors
  }

  const existing = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .get();

  if (existing) {
    if (existing.resetAt > now) {
      if (existing.count >= limit) {
        return {
          success: false,
          remaining: 0,
          resetAt: existing.resetAt,
        };
      }

      const newCount = existing.count + 1;
      await db
        .update(rateLimits)
        .set({ count: newCount })
        .where(eq(rateLimits.key, key));

      return {
        success: true,
        remaining: Math.max(0, limit - newCount),
        resetAt: existing.resetAt,
      };
    } else {
      // Window expired, reset
      const resetAt = now + windowMs;
      await db
        .update(rateLimits)
        .set({ count: 1, resetAt })
        .where(eq(rateLimits.key, key));

      return {
        success: true,
        remaining: limit - 1,
        resetAt,
      };
    }
  }

  // First attempt
  const resetAt = now + windowMs;
  await db.insert(rateLimits).values({
    key,
    count: 1,
    resetAt,
  });

  return {
    success: true,
    remaining: limit - 1,
    resetAt,
  };
}

export async function resetRateLimit(key: string): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, key));
}
