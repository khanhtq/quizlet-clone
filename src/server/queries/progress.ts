import { db, cardProgress, cards } from '@/server/db';
import { eq, and } from 'drizzle-orm';

export interface UpdateProgressInput {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: number;
  lastReviewedAt?: number;
  lapses: number;
}

export async function getCardProgress(userId: string, cardId: string) {
  return db
    .select()
    .from(cardProgress)
    .where(and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)))
    .get();
}

export async function upsertCardProgress(
  userId: string,
  cardId: string,
  data: UpdateProgressInput
) {
  // Ensure the card belongs to user
  const card = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .get();

  if (!card) {
    throw new Error('CARD_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const existing = await getCardProgress(userId, cardId);
  const now = Date.now();

  if (existing) {
    await db
      .update(cardProgress)
      .set({
        repetitions: data.repetitions,
        easeFactor: Math.round(data.easeFactor),
        intervalDays: data.intervalDays,
        dueAt: data.dueAt,
        lastReviewedAt: data.lastReviewedAt ?? now,
        lapses: data.lapses,
      })
      .where(and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)));
  } else {
    await db.insert(cardProgress).values({
      cardId,
      userId,
      repetitions: data.repetitions,
      easeFactor: Math.round(data.easeFactor),
      intervalDays: data.intervalDays,
      dueAt: data.dueAt,
      lastReviewedAt: data.lastReviewedAt ?? now,
      lapses: data.lapses,
    });
  }

  return getCardProgress(userId, cardId);
}
