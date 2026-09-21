import { db, matchScores, sets } from '@/server/db';
import { eq, and } from 'drizzle-orm';

export async function getBestMatchScore(
  userId: string,
  setId: string
): Promise<number | null> {
  const existing = await db
    .select({ bestMs: matchScores.bestMs })
    .from(matchScores)
    .where(and(eq(matchScores.userId, userId), eq(matchScores.setId, setId)))
    .get();

  return existing?.bestMs ?? null;
}

export async function recordMatchScore(
  userId: string,
  setId: string,
  elapsedMs: number
): Promise<{ isNewBest: boolean; bestMs: number }> {
  // Verify set ownership or access
  const set = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();

  if (!set) {
    throw new Error('SET_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const existing = await db
    .select()
    .from(matchScores)
    .where(and(eq(matchScores.userId, userId), eq(matchScores.setId, setId)))
    .get();

  if (!existing) {
    await db.insert(matchScores).values({
      userId,
      setId,
      bestMs: elapsedMs,
    });
    return { isNewBest: true, bestMs: elapsedMs };
  }

  if (elapsedMs < existing.bestMs) {
    await db
      .update(matchScores)
      .set({ bestMs: elapsedMs })
      .where(and(eq(matchScores.userId, userId), eq(matchScores.setId, setId)));
    return { isNewBest: true, bestMs: elapsedMs };
  }

  return { isNewBest: false, bestMs: existing.bestMs };
}
