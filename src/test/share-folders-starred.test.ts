import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, sets, cards, folders } from '@/server/db';
import {
  toggleSetShare,
  getPublicSetBySlug,
  copyPublicSetToUser,
} from '@/server/queries/share';
import {
  createFolder,
  getUserFolders,
  getFolderById,
  updateFolder,
  deleteFolder,
  setFolderForSet,
} from '@/server/queries/folders';
import { toggleCardStar } from '@/server/queries/cards';
import { eq } from 'drizzle-orm';

describe('Share Links, Folders, and Starred Cards (M12)', () => {
  const userAId = 'user-m12-a';
  const userBId = 'user-m12-b';
  const setAId = 'set-m12-a';
  const card1Id = 'card-m12-1';
  const card2Id = 'card-m12-2';

  beforeEach(async () => {
    // Clean tables
    await db.delete(cards);
    await db.delete(sets);
    await db.delete(folders);
    await db.delete(users);

    const now = Date.now();

    // Create users
    await db.insert(users).values([
      {
        id: userAId,
        email: 'userA_m12@example.com',
        passwordHash: 'hash',
        createdAt: now,
      },
      {
        id: userBId,
        email: 'userB_m12@example.com',
        passwordHash: 'hash',
        createdAt: now,
      },
    ]);

    // Create Set for User A
    await db.insert(sets).values({
      id: setAId,
      userId: userAId,
      title: 'Advanced SAT Vocabulary',
      description: 'Top 500 SAT words',
      isPublic: false,
      shareSlug: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create Cards
    await db.insert(cards).values([
      {
        id: card1Id,
        setId: setAId,
        userId: userAId,
        term: 'ubiquitous',
        definition: 'phổ biến, có mặt ở khắp nơi',
        position: 0,
        starred: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: card2Id,
        setId: setAId,
        userId: userAId,
        term: 'ephemeral',
        definition: 'phù du, ngắn ngủi',
        position: 1,
        starred: false,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  describe('Public Share Link (/s/[slug])', () => {
    it('enables public sharing and generates an unguessable slug', async () => {
      const res = await toggleSetShare(userAId, setAId, true);
      expect(res.isPublic).toBe(true);
      expect(res.shareSlug).toBeDefined();
      expect(res.shareSlug!.length).toBeGreaterThanOrEqual(10);

      // Verify public access
      const publicData = await getPublicSetBySlug(res.shareSlug!);
      expect(publicData).toBeDefined();
      expect(publicData!.set.title).toBe('Advanced SAT Vocabulary');
      expect(publicData!.cards).toHaveLength(2);
    });

    it('disables public sharing and prevents unauthenticated access', async () => {
      const res = await toggleSetShare(userAId, setAId, true);
      const slug = res.shareSlug!;

      // Disable sharing
      const disabledRes = await toggleSetShare(userAId, setAId, false);
      expect(disabledRes.isPublic).toBe(false);

      // Attempt public lookup
      const publicData = await getPublicSetBySlug(slug);
      expect(publicData).toBeNull();
    });

    it('allows a logged-in user to clone a public set', async () => {
      const res = await toggleSetShare(userAId, setAId, true);
      const slug = res.shareSlug!;

      const copyResult = await copyPublicSetToUser(userBId, slug);
      expect(copyResult.setId).toBeDefined();
      expect(copyResult.setId).not.toBe(setAId);

      // Verify new set belongs to User B
      const userBSets = await db
        .select()
        .from(sets)
        .where(eq(sets.userId, userBId));
      expect(userBSets).toHaveLength(1);
      expect(userBSets[0].title).toBe('Advanced SAT Vocabulary');

      // Verify cards belong to User B
      const userBCards = await db
        .select()
        .from(cards)
        .where(eq(cards.userId, userBId));
      expect(userBCards).toHaveLength(2);
    });
  });

  describe('Folders Management', () => {
    it('creates folders, assigns sets, and counts sets correctly', async () => {
      const folder = await createFolder(userAId, 'IELTS Prep');
      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('IELTS Prep');

      // Assign set to folder
      const assigned = await setFolderForSet(userAId, setAId, folder.id);
      expect(assigned).toBe(true);

      // Check folders list with counts
      const foldersList = await getUserFolders(userAId);
      expect(foldersList).toHaveLength(1);
      expect(foldersList[0].name).toBe('IELTS Prep');
      expect(foldersList[0].setsCount).toBe(1);

      // Check folder details with sets
      const details = await getFolderById(userAId, folder.id);
      expect(details).toBeDefined();
      expect(details!.sets).toHaveLength(1);
      expect(details!.sets[0].id).toBe(setAId);
    });

    it('updates folder name and deletes folder with set unlinking', async () => {
      const folder = await createFolder(userAId, 'Drafts');
      await setFolderForSet(userAId, setAId, folder.id);

      // Update name
      const updated = await updateFolder(userAId, folder.id, { name: 'Important' });
      expect(updated).toBe(true);

      // Delete folder
      const deleted = await deleteFolder(userAId, folder.id);
      expect(deleted).toBe(true);

      // Set should still exist with folderId set to null
      const set = await db
        .select()
        .from(sets)
        .where(eq(sets.id, setAId))
        .get();
      expect(set).toBeDefined();
      expect(set!.folderId).toBeNull();
    });
  });

  describe('Starred Cards', () => {
    it('toggles card starred state back and forth', async () => {
      const starred1 = await toggleCardStar(userAId, card1Id);
      expect(starred1).toBe(true);

      const cardAfter = await db
        .select()
        .from(cards)
        .where(eq(cards.id, card1Id))
        .get();
      expect(cardAfter!.starred).toBe(true);

      const starred2 = await toggleCardStar(userAId, card1Id);
      expect(starred2).toBe(false);
    });

    it('prevents user from starring cards belonging to other users', async () => {
      await expect(
        toggleCardStar(userBId, card1Id)
      ).rejects.toThrow('CARD_NOT_FOUND_OR_UNAUTHORIZED');
    });
  });
});
