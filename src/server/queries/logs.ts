import { db, reviewLogs, cards } from '@/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateReviewLogInput {
  cardId: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
  mode: 'flashcards' | 'review' | 'learn' | 'test' | 'match';
  elapsedMs: number;
}

export async function getUserReviewLogs(userId: string, limit = 50) {
  return db
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
    .orderBy(desc(reviewLogs.reviewedAt))
    .limit(limit);
}

export async function createReviewLog(userId: string, data: CreateReviewLogInput) {
  // Ensure card belongs to user
  const card = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, data.cardId), eq(cards.userId, userId)))
    .get();

  if (!card) {
    throw new Error('CARD_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const id = nanoid();
  const now = Date.now();

  const newLog = {
    id,
    userId,
    cardId: data.cardId,
    rating: data.rating,
    mode: data.mode,
    elapsedMs: data.elapsedMs,
    reviewedAt: now,
  };

  await db.insert(reviewLogs).values(newLog);
  return newLog;
}

export async function deleteLastReviewLog(userId: string, cardId: string) {
  const lastLog = await db
    .select()
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.cardId, cardId)))
    .orderBy(desc(reviewLogs.reviewedAt))
    .limit(1)
    .get();

  if (!lastLog) {
    return false;
  }

  await db
    .delete(reviewLogs)
    .where(and(eq(reviewLogs.id, lastLog.id), eq(reviewLogs.userId, userId)));

  return true;
}
