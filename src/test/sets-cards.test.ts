import { describe, it, expect, beforeEach } from 'vitest';
import { db, users } from '@/server/db';
import { nanoid } from 'nanoid';
import {
  createSet,
  getSetById,
  updateSet,
  deleteSet,
  duplicateSet,
} from '@/server/queries/sets';
import {
  createCard,
  getCardsBySetId,
  updateCard,
  deleteCard,
  findDuplicateCard,
} from '@/server/queries/cards';

describe('Sets and Cards CRUD Unit & Integration Tests (M2)', () => {
  let userId: string;

  beforeEach(async () => {
    userId = `user_${nanoid(8)}`;
    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: 'dummy_hash',
      createdAt: Date.now(),
    });
  });

  describe('Sets CRUD', () => {
    it('should create and retrieve a set', async () => {
      const created = await createSet(userId, {
        title: 'IELTS Vocabulary',
        description: 'Band 7.0+ Words',
      });

      expect(created.id).toBeDefined();
      expect(created.title).toBe('IELTS Vocabulary');

      const retrieved = await getSetById(userId, created.id);
      expect(retrieved?.title).toBe('IELTS Vocabulary');
      expect(retrieved?.description).toBe('Band 7.0+ Words');
    });

    it('should update a set', async () => {
      const created = await createSet(userId, { title: 'Old Title' });
      const updated = await updateSet(userId, created.id, {
        title: 'New Title',
        description: 'Updated Description',
      });

      expect(updated?.title).toBe('New Title');
      expect(updated?.description).toBe('Updated Description');
    });

    it('should duplicate a set along with all its cards', async () => {
      const originalSet = await createSet(userId, { title: 'Original Set' });
      await createCard(userId, originalSet.id, {
        term: 'ephemeral',
        definition: 'ngắn ngủi, phù du',
        position: 0,
      });
      await createCard(userId, originalSet.id, {
        term: 'ubiquitous',
        definition: 'phổ biến, ở đâu cũng có',
        position: 1,
      });

      const duplicated = await duplicateSet(userId, originalSet.id);
      expect(duplicated).not.toBeNull();
      expect(duplicated?.id).not.toBe(originalSet.id);
      expect(duplicated?.title).toContain('Original Set (Bản sao)');

      const duplicatedCards = await getCardsBySetId(userId, duplicated!.id);
      expect(duplicatedCards).toHaveLength(2);
      expect(duplicatedCards[0].term).toBe('ephemeral');
      expect(duplicatedCards[1].term).toBe('ubiquitous');
    });

    it('should delete a set', async () => {
      const created = await createSet(userId, { title: 'To Delete' });
      const deleted = await deleteSet(userId, created.id);
      expect(deleted).toBe(true);

      const retrieved = await getSetById(userId, created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Cards CRUD and Duplicate Warning', () => {
    it('should add, update, and delete cards in a set', async () => {
      const set = await createSet(userId, { title: 'Daily English' });
      const card = await createCard(userId, set.id, {
        term: 'serendipity',
        definition: 'sự tình cờ may mắn',
        phonetic: '/ˌser.ənˈdɪp.ə.ti/',
        partOfSpeech: 'noun',
        position: 0,
      });

      expect(card.term).toBe('serendipity');
      expect(card.partOfSpeech).toBe('noun');

      const updated = await updateCard(userId, card.id, {
        definition: 'may mắn bất ngờ',
      });
      expect(updated?.definition).toBe('may mắn bất ngờ');

      const deleted = await deleteCard(userId, card.id);
      expect(deleted).toBe(true);

      const cardsAfterDelete = await getCardsBySetId(userId, set.id);
      expect(cardsAfterDelete).toHaveLength(0);
    });

    it('should detect duplicate terms case-insensitively', async () => {
      const set = await createSet(userId, { title: 'Duplicate Test Set' });
      await createCard(userId, set.id, {
        term: 'Benevolent',
        definition: 'nhân từ, tốt bụng',
      });

      const dupLower = await findDuplicateCard(userId, 'benevolent');
      expect(dupLower).not.toBeNull();
      expect(dupLower?.term).toBe('Benevolent');

      const dupUpper = await findDuplicateCard(userId, '  BENEVOLENT  ');
      expect(dupUpper).not.toBeNull();

      const nonDup = await findDuplicateCard(userId, 'malevolent');
      expect(nonDup).toBeNull();
    });
  });
});
