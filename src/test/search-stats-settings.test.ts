import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, sets, cards, cardProgress, reviewLogs } from '@/server/db';
import { searchSetsAndCards } from '@/server/queries/search';
import { getUserStats } from '@/server/queries/stats';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('Search, Stats, and Settings (M10)', () => {
  const userAId = 'user-m10-a';
  const userBId = 'user-m10-b';
  const setAId = 'set-m10-a';
  const setBId = 'set-m10-b';
  const card1Id = 'card-m10-1';
  const card2Id = 'card-m10-2';
  const cardBId = 'card-m10-b';

  beforeEach(async () => {
    // Clear tables
    await db.delete(reviewLogs);
    await db.delete(cardProgress);
    await db.delete(cards);
    await db.delete(sets);
    await db.delete(users);

    const now = Date.now();
    const hash = await bcrypt.hash('secret123', 10);

    // Create users
    await db.insert(users).values([
      {
        id: userAId,
        email: 'usera@example.com',
        passwordHash: hash,
        createdAt: now,
      },
      {
        id: userBId,
        email: 'userb@example.com',
        passwordHash: hash,
        createdAt: now,
      },
    ]);

    // Create Sets
    await db.insert(sets).values([
      {
        id: setAId,
        userId: userAId,
        title: 'Oxford 3000 Words',
        description: 'Common vocabulary',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: setBId,
        userId: userBId,
        title: 'Private Secret Set',
        description: 'Oxford test',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // Create Cards
    await db.insert(cards).values([
      {
        id: card1Id,
        setId: setAId,
        userId: userAId,
        term: 'ephemeral',
        definition: 'phù du, ngắn ngủi',
        position: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: card2Id,
        setId: setAId,
        userId: userAId,
        term: 'resilience',
        definition: 'sự kiên cường, khả năng phục hồi',
        position: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: cardBId,
        setId: setBId,
        userId: userBId,
        term: 'ephemeral B',
        definition: 'ngắn ngủi B',
        position: 0,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  describe('Search Functionality', () => {
    it('returns empty result for empty or whitespace query', async () => {
      const res = await searchSetsAndCards(userAId, '   ');
      expect(res.sets).toHaveLength(0);
      expect(res.cards).toHaveLength(0);
    });

    it('searches sets by title and description', async () => {
      const res = await searchSetsAndCards(userAId, 'Oxford');
      expect(res.sets).toHaveLength(1);
      expect(res.sets[0].title).toBe('Oxford 3000 Words');
    });

    it('searches cards by term and definition', async () => {
      const res1 = await searchSetsAndCards(userAId, 'ephem');
      expect(res1.cards).toHaveLength(1);
      expect(res1.cards[0].term).toBe('ephemeral');

      const res2 = await searchSetsAndCards(userAId, 'kiên cường');
      expect(res2.cards).toHaveLength(1);
      expect(res2.cards[0].term).toBe('resilience');
    });

    it('strictly isolates search results between tenants', async () => {
      // User A searches for 'ephemeral' -> should only see card1, NOT cardB
      const resA = await searchSetsAndCards(userAId, 'ephemeral');
      expect(resA.cards).toHaveLength(1);
      expect(resA.cards[0].id).toBe(card1Id);

      // User A searches for 'Secret' (in user B set) -> returns empty
      const resSecret = await searchSetsAndCards(userAId, 'Secret');
      expect(resSecret.sets).toHaveLength(0);
    });
  });

  describe('Stats Functionality', () => {
    it('computes streak, due today, accuracy, and 30-day reviews correctly', async () => {
      const now = Date.now();

      // Set card1 as due
      await db.insert(cardProgress).values({
        cardId: card1Id,
        userId: userAId,
        repetitions: 1,
        easeFactor: 250,
        intervalDays: 1,
        lapses: 0,
        dueAt: now - 3600000, // 1 hour ago (due)
      });


      // Insert review logs for user A: 2 good, 1 again
      await db.insert(reviewLogs).values([
        {
          id: 'log-1',
          userId: userAId,
          cardId: card1Id,
          rating: 'good',
          mode: 'review',
          elapsedMs: 2000,
          reviewedAt: now,
        },
        {
          id: 'log-2',
          userId: userAId,
          cardId: card2Id,
          rating: 'easy',
          mode: 'flashcards',
          elapsedMs: 1500,
          reviewedAt: now,
        },
        {
          id: 'log-3',
          userId: userAId,
          cardId: card1Id,
          rating: 'again',
          mode: 'learn',
          elapsedMs: 4000,
          reviewedAt: now,
        },
      ]);

      const stats = await getUserStats(userAId);
      expect(stats.totalSets).toBe(1);
      expect(stats.totalCards).toBe(2);
      expect(stats.dueToday).toBe(1);
      expect(stats.totalReviewed).toBe(3);
      // Accuracy: 2 out of 3 = 67%
      expect(stats.accuracy).toBe(67);
      expect(stats.streak).toBeGreaterThanOrEqual(1);
      expect(stats.last30Days).toHaveLength(30);

      // Today's review count in the chart should be 3
      const todayEntry = stats.last30Days[stats.last30Days.length - 1];
      expect(todayEntry.count).toBe(3);
    });
  });

  describe('Password Verification', () => {
    it('verifies valid password and rejects invalid password', async () => {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, userAId))
        .get();
      expect(user).toBeDefined();

      const isMatchValid = await bcrypt.compare('secret123', user!.passwordHash);
      expect(isMatchValid).toBe(true);

      const isMatchInvalid = await bcrypt.compare('wrongPassword', user!.passwordHash);
      expect(isMatchInvalid).toBe(false);
    });
  });
});
