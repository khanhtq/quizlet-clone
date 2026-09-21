import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, cardProgress } from '@/server/db';
import { nanoid } from 'nanoid';
import { createSet } from '@/server/queries/sets';
import { createCard } from '@/server/queries/cards';
import {
  getReviewQueue,
  rateCardSRS,
  undoCardSRS,
  countNewCardsReviewedToday,
  getStartOfToday,
} from '@/server/queries/review';
import { getUserSettings, updateUserSettings } from '@/server/queries/settings';
import { eq, and } from 'drizzle-orm';

describe('Review Queue & Spaced Repetition Integration', () => {
  let userA: string;
  let userB: string;
  let setA: string;

  beforeEach(async () => {
    userA = `user_a_${nanoid(8)}`;
    userB = `user_b_${nanoid(8)}`;

    await db.insert(users).values([
      {
        id: userA,
        email: `${userA}@example.com`,
        passwordHash: 'dummy_hash',
        createdAt: Date.now(),
      },
      {
        id: userB,
        email: `${userB}@example.com`,
        passwordHash: 'dummy_hash',
        createdAt: Date.now(),
      },
    ]);

    const createdSet = await createSet(userA, {
      title: 'SRS Test Set',
      description: 'Testing review queue',
    });
    setA = createdSet.id;
  });

  it('builds review queue with new cards up to newCardsPerDay', async () => {
    // Add 5 cards to set A
    const cardIds: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const card = await createCard(userA, setA, {
        term: `word_${i}`,
        definition: `meaning_${i}`,
        position: i,
      });
      cardIds.push(card.id);
    }

    // Set user newCardsPerDay to 3
    await updateUserSettings(userA, { newCardsPerDay: 3 });

    const queue = await getReviewQueue(userA);

    expect(queue.dueCount).toBe(0);
    expect(queue.newCount).toBe(3);
    expect(queue.cards.length).toBe(3);
    expect(queue.cards[0].term).toBe('word_1');
    expect(queue.cards[1].term).toBe('word_2');
    expect(queue.cards[2].term).toBe('word_3');
  });

  it('orders due cards by due_at oldest first and includes new cards', async () => {
    const card1 = await createCard(userA, setA, { term: 'due_older', definition: '1' });
    const card2 = await createCard(userA, setA, { term: 'due_newer', definition: '2' });
    const card3 = await createCard(userA, setA, { term: 'not_due_yet', definition: '3' });
    const card4 = await createCard(userA, setA, { term: 'new_card', definition: '4' });

    const now = Date.now();

    // Insert progress for card1 (due 2 hours ago)
    await db.insert(cardProgress).values({
      cardId: card1.id,
      userId: userA,
      repetitions: 1,
      easeFactor: 250,
      intervalDays: 1,
      dueAt: now - 2 * 3600 * 1000,
      lapses: 0,
    });

    // Insert progress for card2 (due 1 hour ago)
    await db.insert(cardProgress).values({
      cardId: card2.id,
      userId: userA,
      repetitions: 1,
      easeFactor: 250,
      intervalDays: 1,
      dueAt: now - 1 * 3600 * 1000,
      lapses: 0,
    });

    // Insert progress for card3 (due tomorrow)
    await db.insert(cardProgress).values({
      cardId: card3.id,
      userId: userA,
      repetitions: 2,
      easeFactor: 250,
      intervalDays: 3,
      dueAt: now + 24 * 3600 * 1000,
      lapses: 0,
    });

    const queue = await getReviewQueue(userA, { now });

    expect(queue.dueCount).toBe(2);
    expect(queue.cards[0].id).toBe(card1.id);
    expect(queue.cards[1].id).toBe(card2.id);
    expect(queue.cards.some((c) => c.id === card3.id)).toBe(false); // future card not in queue
    expect(queue.cards.some((c) => c.id === card4.id)).toBe(true); // new card is in queue
  });

  it('rates card with SRS and updates progress and review_logs', async () => {
    const card = await createCard(userA, setA, { term: 'apple', definition: 'quả táo' });

    // Rate Good
    const rateResult = await rateCardSRS(userA, {
      cardId: card.id,
      rating: 'good',
      elapsedMs: 1500,
    });

    expect(rateResult.progress.repetitions).toBe(1);
    expect(rateResult.progress.intervalDays).toBe(1);

    // Verify DB cardProgress row
    const progressRow = await db
      .select()
      .from(cardProgress)
      .where(and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userA)))
      .get();

    expect(progressRow).toBeDefined();
    expect(progressRow?.repetitions).toBe(1);
    expect(progressRow?.intervalDays).toBe(1);
    expect(progressRow?.easeFactor).toBe(250);

    // Rate Good again -> reps 2, interval 3
    const rate2 = await rateCardSRS(userA, {
      cardId: card.id,
      rating: 'good',
      elapsedMs: 2000,
    });

    expect(rate2.progress.repetitions).toBe(2);
    expect(rate2.progress.intervalDays).toBe(3);
  });

  it('undo restores previous card_progress and deletes review log', async () => {
    const card = await createCard(userA, setA, { term: 'book', definition: 'sách' });

    // 1st rating: good
    await rateCardSRS(userA, {
      cardId: card.id,
      rating: 'good',
      elapsedMs: 1200,
    });

    // 2nd rating: good
    await rateCardSRS(userA, {
      cardId: card.id,
      rating: 'good',
      elapsedMs: 1500,
    });

    let currentProgress = await db
      .select()
      .from(cardProgress)
      .where(and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userA)))
      .get();
    expect(currentProgress?.repetitions).toBe(2);

    // Undo 2nd rating
    const undoRes = await undoCardSRS(userA, card.id);
    expect(undoRes.success).toBe(true);

    currentProgress = await db
      .select()
      .from(cardProgress)
      .where(and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userA)))
      .get();
    expect(currentProgress?.repetitions).toBe(1);
    expect(currentProgress?.intervalDays).toBe(1);

    // Undo 1st rating (card was originally new)
    const undoRes2 = await undoCardSRS(userA, card.id);
    expect(undoRes2.success).toBe(true);

    currentProgress = await db
      .select()
      .from(cardProgress)
      .where(and(eq(cardProgress.cardId, card.id), eq(cardProgress.userId, userA)))
      .get();
    expect(currentProgress).toBeUndefined(); // Deleted because it is new again!
  });

  it('User B cannot rate or undo User A cards', async () => {
    const card = await createCard(userA, setA, { term: 'secure', definition: 'an toàn' });

    await expect(
      rateCardSRS(userB, {
        cardId: card.id,
        rating: 'good',
        elapsedMs: 1000,
      })
    ).rejects.toThrow('CARD_NOT_FOUND_OR_UNAUTHORIZED');

    const undoResult = await undoCardSRS(userB, card.id);
    expect(undoResult.success).toBe(false);
  });

  it('manages user settings properly', async () => {
    // Default settings
    const initial = await getUserSettings(userA);
    expect(initial.theme).toBe('system');
    expect(initial.newCardsPerDay).toBe(20);
    expect(initial.timezone).toBe('UTC');

    // Update settings
    const updated = await updateUserSettings(userA, {
      theme: 'dark',
      newCardsPerDay: 25,
      timezone: 'Asia/Ho_Chi_Minh',
      ttsAutoplay: true,
      defaultDirection: 'definition',
    });

    expect(updated.theme).toBe('dark');
    expect(updated.newCardsPerDay).toBe(25);
    expect(updated.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(updated.ttsAutoplay).toBe(true);
    expect(updated.defaultDirection).toBe('definition');
  });

  it('calculates start of today and counts new cards reviewed today', async () => {
    const fixedNow = new Date('2026-09-21T14:30:00.000Z').getTime();
    const midnightUtc = getStartOfToday(fixedNow, 'UTC');

    const midnightDate = new Date(midnightUtc);
    expect(midnightDate.getUTCHours()).toBe(0);
    expect(midnightDate.getUTCMinutes()).toBe(0);
    expect(midnightDate.getUTCSeconds()).toBe(0);

    // Initial count of new cards reviewed today should be 0
    const countBefore = await countNewCardsReviewedToday(userA, midnightUtc);
    expect(countBefore).toBe(0);

    // Add and rate a new card
    const card = await createCard(userA, setA, { term: 'count_test', definition: 'test' });
    await rateCardSRS(userA, {
      cardId: card.id,
      rating: 'good',
      elapsedMs: 1000,
    });

    const countAfter = await countNewCardsReviewedToday(userA, midnightUtc);
    expect(countAfter).toBe(1);
  });
});
