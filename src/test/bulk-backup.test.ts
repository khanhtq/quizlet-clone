import { describe, it, expect, beforeEach } from 'vitest';
import { db, users } from '@/server/db';
import { nanoid } from 'nanoid';
import { createSet, getSetById, getUserSets } from '@/server/queries/sets';
import { createCard, getCardsBySetId, createCardsBulk } from '@/server/queries/cards';
import { rateCardSRS } from '@/server/queries/review';
import { getUserFullBackup, restoreUserBackup } from '@/server/queries/backup';
import { exportToCSV, parseCSV } from '@/lib/parsers';

describe('Bulk Add, CSV & JSON Backup/Restore Integration', () => {
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
      title: 'Bulk Study Set',
      description: 'Test bulk operations',
    });
    setA = createdSet.id;
  });

  describe('createCardsBulk', () => {
    it('bulk inserts cards with correct sequential positions and user scoping', async () => {
      // Add 1 initial card
      await createCard(userA, setA, { term: 'initial', definition: 'ban đầu', position: 0 });

      // Bulk add 3 more cards
      const bulkItems = [
        { term: 'sun', definition: 'mặt trời' },
        { term: 'moon', definition: 'mặt trăng', phonetic: '/muːn/', partOfSpeech: 'noun' },
        { term: 'star', definition: 'ngôi sao', example: 'A bright star' },
      ];

      const inserted = await createCardsBulk(userA, setA, bulkItems);
      expect(inserted).toHaveLength(3);

      const allCards = await getCardsBySetId(userA, setA);
      expect(allCards).toHaveLength(4);

      expect(allCards[0].term).toBe('initial');
      expect(allCards[1].term).toBe('sun');
      expect(allCards[1].position).toBe(1);
      expect(allCards[2].term).toBe('moon');
      expect(allCards[2].phonetic).toBe('/muːn/');
      expect(allCards[3].term).toBe('star');
      expect(allCards[3].position).toBe(3);
    });

    it('prevents User B from bulk adding cards into User A set', async () => {
      await expect(
        createCardsBulk(userB, setA, [{ term: 'hacked', definition: 'bị hack' }])
      ).rejects.toThrow('NOT_FOUND_OR_UNAUTHORIZED');
    });
  });

  describe('Full JSON Backup & Restore', () => {
    it('creates comprehensive backup containing sets, cards, progress, and logs', async () => {
      const card = await createCard(userA, setA, { term: 'ocean', definition: 'đại dương' });
      await rateCardSRS(userA, {
        cardId: card.id,
        rating: 'good',
        elapsedMs: 1200,
      });

      const backup = await getUserFullBackup(userA);

      expect(backup.version).toBe(1);
      expect(backup.userSettings).toBeDefined();
      expect(backup.sets.some((s) => s.id === setA)).toBe(true);
      expect(backup.cards.some((c) => c.id === card.id)).toBe(true);
      expect(backup.cardProgress.some((p) => p.cardId === card.id)).toBe(true);
      expect(backup.reviewLogs.some((l) => l.cardId === card.id)).toBe(true);
    });

    it('restores backup cleanly and preserves multi-tenant isolation', async () => {
      // 1. User A creates a set with 2 cards
      await createCard(userA, setA, { term: 'tree', definition: 'cây' });
      await createCard(userA, setA, { term: 'flower', definition: 'hoa' });

      // Export User A backup
      const backupA = await getUserFullBackup(userA);

      // 2. User B restores User A backup into User B account
      // All restored records MUST belong to User B (not User A)
      const restoreRes = await restoreUserBackup(userB, backupA, 'replace');
      expect(restoreRes.setsCount).toBe(1);
      expect(restoreRes.cardsCount).toBe(2);

      // Check User B's sets and cards
      const setsB = await getUserSets(userB);
      expect(setsB).toHaveLength(1);
      expect(setsB[0].title).toBe('Bulk Study Set');
      expect(setsB[0].userId).toBe(userB);

      const cardsB = await getCardsBySetId(userB, setsB[0].id);
      expect(cardsB).toHaveLength(2);
      expect(cardsB.every((c) => c.userId === userB)).toBe(true);

      // User A data is untouched and separate
      const setACheck = await getSetById(userA, setA);
      expect(setACheck?.userId).toBe(userA);
    });
  });

  describe('CSV Export', () => {
    it('exports cards for set with UTF-8 BOM and correct headers', async () => {
      await createCard(userA, setA, {
        term: 'river',
        definition: 'dòng sông',
        phonetic: '/ˈrɪvər/',
        partOfSpeech: 'noun',
        example: 'The Red River',
      });

      const cardsList = await getCardsBySetId(userA, setA);
      const csv = exportToCSV(cardsList);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const parsed = parseCSV(csv);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].term).toBe('river');
      expect(parsed[0].definition).toBe('dòng sông');
      expect(parsed[0].phonetic).toBe('/ˈrɪvər/');
    });
  });
});
