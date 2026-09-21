import { describe, it, expect, beforeEach } from 'vitest';
import { db, users } from '@/server/db';
import { nanoid } from 'nanoid';
import { createSet } from '@/server/queries/sets';
import { createCard } from '@/server/queries/cards';
import {
  createReviewLog,
  deleteLastReviewLog,
  getUserReviewLogs,
} from '@/server/queries/logs';

describe('Flashcards Free Mode Unit & Integration Tests (M3)', () => {
  let userId: string;
  let testSetId: string;
  let testCardId: string;

  beforeEach(async () => {
    userId = `user_fc_${nanoid(6)}`;
    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: 'dummy_hash',
      createdAt: Date.now(),
    });

    const set = await createSet(userId, { title: 'Flashcards Test Set' });
    testSetId = set.id;

    const card = await createCard(userId, testSetId, {
      term: 'meticulous',
      definition: 'tỉ mỉ, cẩn thận',
      phonetic: '/məˈtɪk.jə.ləs/',
      partOfSpeech: 'adjective',
    });
    testCardId = card.id;
  });

  describe('Review Logging & Undo in Free Mode', () => {
    it('should create a flashcards review log entry on rating', async () => {
      const log = await createReviewLog(userId, {
        cardId: testCardId,
        rating: 'good',
        mode: 'flashcards',
        elapsedMs: 2500,
      });

      expect(log.id).toBeDefined();
      expect(log.rating).toBe('good');
      expect(log.mode).toBe('flashcards');

      const logs = await getUserReviewLogs(userId);
      expect(logs).toHaveLength(1);
      expect(logs[0].cardId).toBe(testCardId);
      expect(logs[0].rating).toBe('good');
    });

    it('should undo the last review log for a card', async () => {
      // First review
      await createReviewLog(userId, {
        cardId: testCardId,
        rating: 'again',
        mode: 'flashcards',
        elapsedMs: 1200,
      });

      const logsBeforeUndo = await getUserReviewLogs(userId);
      expect(logsBeforeUndo).toHaveLength(1);

      // Perform undo
      const undoSuccess = await deleteLastReviewLog(userId, testCardId);
      expect(undoSuccess).toBe(true);

      const logsAfterUndo = await getUserReviewLogs(userId);
      expect(logsAfterUndo).toHaveLength(0);
    });
  });

  describe('Deck Transformations and Direction Logic', () => {
    const cardList = [
      { id: '1', term: 'cat', definition: 'con mèo' },
      { id: '2', term: 'dog', definition: 'con chó' },
      { id: '3', term: 'bird', definition: 'con chim' },
    ];

    it('should handle term-to-definition and definition-to-term direction', () => {
      // Direction: term
      const frontTerm = (card: (typeof cardList)[0], dir: string) =>
        dir === 'term' ? card.term : card.definition;
      const backTerm = (card: (typeof cardList)[0], dir: string) =>
        dir === 'term' ? card.definition : card.term;

      expect(frontTerm(cardList[0], 'term')).toBe('cat');
      expect(backTerm(cardList[0], 'term')).toBe('con mèo');

      expect(frontTerm(cardList[0], 'definition')).toBe('con mèo');
      expect(backTerm(cardList[0], 'definition')).toBe('cat');
    });

    it('should filter missed cards for re-study session', () => {
      const sessionRatings = [
        { card: cardList[0], rating: 'again' },
        { card: cardList[1], rating: 'good' },
        { card: cardList[2], rating: 'again' },
      ];

      const missed = sessionRatings
        .filter((r) => r.rating === 'again')
        .map((r) => r.card);

      expect(missed).toHaveLength(2);
      expect(missed.map((c) => c.term)).toEqual(['cat', 'bird']);
    });
  });
});
