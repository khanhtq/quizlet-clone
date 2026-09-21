import { db, cards, cardProgress, reviewLogs, sets } from '@/server/db';
import { eq, and, lte, isNull, asc, desc, min } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { schedule, SRSRating, SRSState, SRSResult } from '@/lib/srs';
import { getUserSettings } from './settings';

export interface ReviewQueueCard {
  id: string;
  setId: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
  isNew: boolean;
  progress: SRSState;
}

export interface ReviewQueueResult {
  cards: ReviewQueueCard[];
  dueCount: number;
  newCount: number;
  totalDue: number;
  newRemainingToday: number;
}

/**
 * Calculate the start of today (00:00:00.000) in the user's timezone.
 */
export function getStartOfToday(nowMs: number, timeZone: string = 'UTC'): number {
  try {
    const d = new Date(nowMs);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(d);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = parseInt(p.value, 10);
      }
    }
    const hour = (map.hour ?? 0) % 24;
    const minute = map.minute ?? 0;
    const second = map.second ?? 0;
    const millisecond = d.getUTCMilliseconds();

    const elapsedMs = (hour * 3600 + minute * 60 + second) * 1000 + millisecond;
    return nowMs - elapsedMs;
  } catch {
    const d = new Date(nowMs);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
}

/**
 * Count how many new cards were first reviewed today.
 */
export async function countNewCardsReviewedToday(
  userId: string,
  startOfTodayMs: number
): Promise<number> {
  const cardMinLogs = await db
    .select({
      cardId: reviewLogs.cardId,
      firstReviewedAt: min(reviewLogs.reviewedAt),
    })
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
    .groupBy(reviewLogs.cardId);

  return cardMinLogs.filter(
    (c) => c.firstReviewedAt !== null && c.firstReviewedAt >= startOfTodayMs
  ).length;
}

/**
 * Build the review queue according to prompt spec 6.2:
 * 1. Due cards (due_at <= now, oldest first)
 * 2. New cards (no progress row) up to new_cards_per_day, counted from review_logs today.
 */
export async function getReviewQueue(
  userId: string,
  options?: { setId?: string; now?: number }
): Promise<ReviewQueueResult> {
  const now = options?.now ?? Date.now();
  const settings = await getUserSettings(userId);
  const startOfTodayMs = getStartOfToday(now, settings.timezone);

  // 1. Calculate remaining new cards allowance today
  const newCardsReviewedToday = await countNewCardsReviewedToday(userId, startOfTodayMs);
  const newRemainingToday = Math.max(0, settings.newCardsPerDay - newCardsReviewedToday);

  // 2. Query Due Cards (card_progress.due_at <= now)
  const dueConditions = [
    eq(cards.userId, userId),
    lte(cardProgress.dueAt, now),
  ];
  if (options?.setId) {
    dueConditions.push(eq(cards.setId, options.setId));
  }

  const dueRows = await db
    .select({
      card: cards,
      progress: cardProgress,
    })
    .from(cards)
    .innerJoin(cardProgress, eq(cards.id, cardProgress.cardId))
    .where(and(...dueConditions))
    .orderBy(asc(cardProgress.dueAt));

  const dueCards: ReviewQueueCard[] = dueRows.map((r) => ({
    id: r.card.id,
    setId: r.card.setId,
    term: r.card.term,
    definition: r.card.definition,
    phonetic: r.card.phonetic,
    partOfSpeech: r.card.partOfSpeech,
    example: r.card.example,
    audioUrl: r.card.audioUrl,
    isNew: false,
    progress: {
      repetitions: r.progress.repetitions,
      easeFactor: r.progress.easeFactor / 100, // stored * 100
      intervalDays: r.progress.intervalDays,
      lapses: r.progress.lapses,
      dueAt: r.progress.dueAt,
    },
  }));

  // 3. Query New Cards (no row in card_progress)
  let newCards: ReviewQueueCard[] = [];
  if (newRemainingToday > 0) {
    const newConditions = [
      eq(cards.userId, userId),
      isNull(cardProgress.cardId),
    ];
    if (options?.setId) {
      newConditions.push(eq(cards.setId, options.setId));
    }

    const newRows = await db
      .select({
        card: cards,
      })
      .from(cards)
      .leftJoin(cardProgress, eq(cards.id, cardProgress.cardId))
      .where(and(...newConditions))
      .orderBy(asc(cards.position), asc(cards.createdAt))
      .limit(newRemainingToday);

    newCards = newRows.map((r) => ({
      id: r.card.id,
      setId: r.card.setId,
      term: r.card.term,
      definition: r.card.definition,
      phonetic: r.card.phonetic,
      partOfSpeech: r.card.partOfSpeech,
      example: r.card.example,
      audioUrl: r.card.audioUrl,
      isNew: true,
      progress: {
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        lapses: 0,
      },
    }));
  }

  return {
    cards: [...dueCards, ...newCards],
    dueCount: dueCards.length,
    newCount: newCards.length,
    totalDue: dueCards.length,
    newRemainingToday,
  };
}

/**
 * Rate a card with Spaced Repetition scheduling, persist to card_progress,
 * write a review log, and update set lastStudiedAt.
 */
export async function rateCardSRS(
  userId: string,
  input: {
    cardId: string;
    rating: SRSRating;
    elapsedMs: number;
    mode?: 'flashcards' | 'review' | 'learn' | 'test' | 'match';
  }
): Promise<{ progress: SRSResult; logId: string }> {
  // Ensure card exists and belongs to user
  const card = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, input.cardId), eq(cards.userId, userId)))
    .get();

  if (!card) {
    throw new Error('CARD_NOT_FOUND_OR_UNAUTHORIZED');
  }

  const now = Date.now();
  const settings = await getUserSettings(userId);

  // Fetch current progress
  const currentProgress = await db
    .select()
    .from(cardProgress)
    .where(and(eq(cardProgress.cardId, input.cardId), eq(cardProgress.userId, userId)))
    .get();

  const currentState: SRSState = currentProgress
    ? {
        repetitions: currentProgress.repetitions,
        easeFactor: currentProgress.easeFactor / 100,
        intervalDays: currentProgress.intervalDays,
        lapses: currentProgress.lapses,
        dueAt: currentProgress.dueAt,
      }
    : {
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        lapses: 0,
      };

  // Run pure SRS schedule
  const newState = schedule(currentState, input.rating, now, settings.timezone);

  // Upsert card_progress
  if (currentProgress) {
    await db
      .update(cardProgress)
      .set({
        repetitions: newState.repetitions,
        easeFactor: Math.round(newState.easeFactor * 100),
        intervalDays: newState.intervalDays,
        dueAt: newState.dueAt,
        lastReviewedAt: now,
        lapses: newState.lapses,
      })
      .where(and(eq(cardProgress.cardId, input.cardId), eq(cardProgress.userId, userId)));
  } else {
    await db.insert(cardProgress).values({
      cardId: input.cardId,
      userId,
      repetitions: newState.repetitions,
      easeFactor: Math.round(newState.easeFactor * 100),
      intervalDays: newState.intervalDays,
      dueAt: newState.dueAt,
      lastReviewedAt: now,
      lapses: newState.lapses,
    });
  }

  // Create review log
  const logId = nanoid();
  await db.insert(reviewLogs).values({
    id: logId,
    userId,
    cardId: input.cardId,
    rating: input.rating,
    mode: input.mode ?? 'review',
    elapsedMs: input.elapsedMs,
    reviewedAt: now,
  });

  // Update set lastStudiedAt
  await db
    .update(sets)
    .set({ lastStudiedAt: now })
    .where(and(eq(sets.id, card.setId), eq(sets.userId, userId)));

  return { progress: newState, logId };
}

/**
 * Undo last review for card:
 * 1. Remove last review_log
 * 2. Restore previous card_progress (or delete if it was a new card)
 */
export async function undoCardSRS(
  userId: string,
  cardId: string
): Promise<{ success: boolean; restoredState: SRSState | null }> {
  // Find last log
  const lastLog = await db
    .select()
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.cardId, cardId)))
    .orderBy(desc(reviewLogs.reviewedAt))
    .limit(1)
    .get();

  if (!lastLog) {
    return { success: false, restoredState: null };
  }

  // Delete last log
  await db
    .delete(reviewLogs)
    .where(and(eq(reviewLogs.id, lastLog.id), eq(reviewLogs.userId, userId)));

  // Check remaining logs
  const remainingLogs = await db
    .select()
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), eq(reviewLogs.cardId, cardId)))
    .orderBy(asc(reviewLogs.reviewedAt));

  if (remainingLogs.length === 0) {
    // Card was new before this review
    await db
      .delete(cardProgress)
      .where(and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)));

    return { success: true, restoredState: null };
  }

  // Replay remaining logs to restore exact previous progress
  const settings = await getUserSettings(userId);
  let state: SRSState = {
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    lapses: 0,
  };
  let lastReviewedAt = remainingLogs[0].reviewedAt;

  for (const log of remainingLogs) {
    state = schedule(
      state,
      log.rating as SRSRating,
      log.reviewedAt,
      settings.timezone
    );
    lastReviewedAt = log.reviewedAt;
  }

  await db
    .update(cardProgress)
    .set({
      repetitions: state.repetitions,
      easeFactor: Math.round(state.easeFactor * 100),
      intervalDays: state.intervalDays,
      dueAt: state.dueAt!,
      lastReviewedAt,
      lapses: state.lapses,
    })
    .where(and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)));

  return { success: true, restoredState: state };
}
