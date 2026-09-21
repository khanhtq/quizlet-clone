import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, sets, cards, matchScores, reviewLogs } from '@/server/db';
import { getBestMatchScore, recordMatchScore } from '@/server/queries/match';
import { createReviewLog } from '@/server/queries/logs';
import { eq } from 'drizzle-orm';

describe('Study Modes - Learn, Test, Match (M7, M8, M9)', () => {
  const userAId = 'user-match-a';
  const userBId = 'user-match-b';
  const setAId = 'set-match-a';
  const card1Id = 'card-match-1';
  const card2Id = 'card-match-2';

  beforeEach(async () => {
    // Clear relevant tables
    await db.delete(reviewLogs);
    await db.delete(matchScores);
    await db.delete(cards);
    await db.delete(sets);
    await db.delete(users);

    const now = Date.now();
    // Create user A & B
    await db.insert(users).values([
      {
        id: userAId,
        email: 'userA@example.com',
        passwordHash: 'hash',
        createdAt: now,
      },
      {
        id: userBId,
        email: 'userB@example.com',
        passwordHash: 'hash',
        createdAt: now,
      },
    ]);

    // Create Set for User A
    await db.insert(sets).values({
      id: setAId,
      userId: userAId,
      title: 'Vocabulary Set A',
      createdAt: now,
      updatedAt: now,
    });

    // Create Cards for Set A
    await db.insert(cards).values([
      {
        id: card1Id,
        setId: setAId,
        userId: userAId,
        term: 'apple',
        definition: 'quả táo',
        position: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: card2Id,
        setId: setAId,
        userId: userAId,
        term: 'banana',
        definition: 'quả chuối',
        position: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);

  });

  describe('Match Best Score & Recording', () => {
    it('returns null if no score recorded yet', async () => {
      const best = await getBestMatchScore(userAId, setAId);
      expect(best).toBeNull();
    });

    it('records initial score as new best', async () => {
      const res = await recordMatchScore(userAId, setAId, 15400);
      expect(res.isNewBest).toBe(true);
      expect(res.bestMs).toBe(15400);

      const saved = await getBestMatchScore(userAId, setAId);
      expect(saved).toBe(15400);
    });

    it('updates best score when faster time is recorded', async () => {
      await recordMatchScore(userAId, setAId, 15400);

      // Faster run (12000 ms)
      const res = await recordMatchScore(userAId, setAId, 12000);
      expect(res.isNewBest).toBe(true);
      expect(res.bestMs).toBe(12000);

      const saved = await getBestMatchScore(userAId, setAId);
      expect(saved).toBe(12000);
    });

    it('does not update best score when slower time is recorded', async () => {
      await recordMatchScore(userAId, setAId, 12000);

      // Slower run (18000 ms)
      const res = await recordMatchScore(userAId, setAId, 18000);
      expect(res.isNewBest).toBe(false);
      expect(res.bestMs).toBe(12000);

      const saved = await getBestMatchScore(userAId, setAId);
      expect(saved).toBe(12000);
    });

    it('isolates match scores between users', async () => {
      await recordMatchScore(userAId, setAId, 10000);

      // User B checking set A score
      const userBBest = await getBestMatchScore(userBId, setAId);
      expect(userBBest).toBeNull();
    });

    it('prevents recording score for sets not owned by user', async () => {
      await expect(
        recordMatchScore(userBId, setAId, 9000)
      ).rejects.toThrow('SET_NOT_FOUND_OR_UNAUTHORIZED');
    });
  });

  describe('Review Logs for Study Modes (Learn, Test, Match)', () => {
    it('creates review logs for learn mode', async () => {
      const log = await createReviewLog(userAId, {
        cardId: card1Id,
        rating: 'good',
        mode: 'learn',
        elapsedMs: 3500,
      });

      expect(log.id).toBeDefined();
      expect(log.mode).toBe('learn');
      expect(log.rating).toBe('good');
      expect(log.elapsedMs).toBe(3500);

      const allLogs = await db
        .select()
        .from(reviewLogs)
        .where(eq(reviewLogs.cardId, card1Id));
      expect(allLogs).toHaveLength(1);
      expect(allLogs[0].mode).toBe('learn');
    });

    it('creates review logs for test mode', async () => {
      const log = await createReviewLog(userAId, {
        cardId: card2Id,
        rating: 'again',
        mode: 'test',
        elapsedMs: 5000,
      });

      expect(log.mode).toBe('test');
      expect(log.rating).toBe('again');
    });

    it('creates review logs for match mode', async () => {
      const log = await createReviewLog(userAId, {
        cardId: card1Id,
        rating: 'good',
        mode: 'match',
        elapsedMs: 2500,
      });

      expect(log.mode).toBe('match');
    });
  });
});
