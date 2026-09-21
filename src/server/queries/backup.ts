import {
  db,
  userSettings,
  folders,
  sets,
  cards,
  cardProgress,
  reviewLogs,
  matchScores,
} from '@/server/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getUserSettings, updateUserSettings } from './settings';

export interface BackupData {
  version: number;
  exportedAt: number;
  userSettings?: typeof userSettings.$inferSelect | null;
  folders: (typeof folders.$inferSelect)[];
  sets: (typeof sets.$inferSelect)[];
  cards: (typeof cards.$inferSelect)[];
  cardProgress: (typeof cardProgress.$inferSelect)[];
  reviewLogs: (typeof reviewLogs.$inferSelect)[];
  matchScores: (typeof matchScores.$inferSelect)[];
}

export async function getUserFullBackup(userId: string): Promise<BackupData> {
  const [
    settings,
    userFolders,
    userSets,
    userCards,
    userProgress,
    userLogs,
    userMatchScores,
  ] = await Promise.all([
    getUserSettings(userId),
    db.select().from(folders).where(eq(folders.userId, userId)),
    db.select().from(sets).where(eq(sets.userId, userId)),
    db.select().from(cards).where(eq(cards.userId, userId)),
    db.select().from(cardProgress).where(eq(cardProgress.userId, userId)),
    db.select().from(reviewLogs).where(eq(reviewLogs.userId, userId)),
    db.select().from(matchScores).where(eq(matchScores.userId, userId)),
  ]);

  return {
    version: 1,
    exportedAt: Date.now(),
    userSettings: settings as typeof userSettings.$inferSelect,
    folders: userFolders,
    sets: userSets,
    cards: userCards,
    cardProgress: userProgress,
    reviewLogs: userLogs,
    matchScores: userMatchScores,
  };
}

export async function restoreUserBackup(
  userId: string,
  backup: Partial<BackupData>,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{
  foldersCount: number;
  setsCount: number;
  cardsCount: number;
  progressCount: number;
  logsCount: number;
}> {
  // If replace, clear existing user data first
  if (mode === 'replace') {
    await db.delete(matchScores).where(eq(matchScores.userId, userId));
    await db.delete(reviewLogs).where(eq(reviewLogs.userId, userId));
    await db.delete(cardProgress).where(eq(cardProgress.userId, userId));
    await db.delete(cards).where(eq(cards.userId, userId));
    await db.delete(sets).where(eq(sets.userId, userId));
    await db.delete(folders).where(eq(folders.userId, userId));
  }

  // Maps to handle ID re-keying if collisions occur across different users
  const folderIdMap = new Map<string, string>();
  const setIdMap = new Map<string, string>();
  const cardIdMap = new Map<string, string>();

  // 1. Restore User Settings if present
  if (backup.userSettings) {
    await updateUserSettings(userId, {
      theme: backup.userSettings.theme as 'system' | 'light' | 'dark',
      meaningLanguage: backup.userSettings.meaningLanguage as 'vi' | 'en' | 'both',
      newCardsPerDay: backup.userSettings.newCardsPerDay,
      timezone: backup.userSettings.timezone,
      ttsAutoplay: Boolean(backup.userSettings.ttsAutoplay),
      defaultDirection: backup.userSettings.defaultDirection as 'term' | 'definition' | 'mixed',
    });
  }

  // 2. Restore Folders
  let foldersCount = 0;
  if (backup.folders && backup.folders.length > 0) {
    for (const f of backup.folders) {
      if (!f.id || !f.name) continue;
      const existing = await db
        .select()
        .from(folders)
        .where(eq(folders.id, f.id))
        .get();

      let targetFolderId = f.id;
      if (existing && existing.userId !== userId) {
        targetFolderId = nanoid();
      }
      folderIdMap.set(f.id, targetFolderId);

      if (!existing || existing.userId !== userId) {
        await db.insert(folders).values({
          id: targetFolderId,
          userId,
          name: f.name,
          createdAt: f.createdAt || Date.now(),
        });
        foldersCount++;
      }
    }
  }

  // 3. Restore Sets
  let setsCount = 0;
  if (backup.sets && backup.sets.length > 0) {
    for (const s of backup.sets) {
      if (!s.id || !s.title) continue;
      const existing = await db
        .select()
        .from(sets)
        .where(eq(sets.id, s.id))
        .get();

      let targetSetId = s.id;
      if (existing && existing.userId !== userId) {
        targetSetId = nanoid();
      }
      setIdMap.set(s.id, targetSetId);

      const mappedFolderId = s.folderId ? folderIdMap.get(s.folderId) || null : null;

      if (!existing || existing.userId !== userId) {
        await db.insert(sets).values({
          id: targetSetId,
          userId,
          folderId: mappedFolderId,
          title: s.title,
          description: s.description || null,
          isPublic: Boolean(s.isPublic),
          shareSlug: existing && existing.userId !== userId ? null : s.shareSlug || null,
          createdAt: s.createdAt || Date.now(),
          updatedAt: s.updatedAt || Date.now(),
          lastStudiedAt: s.lastStudiedAt || null,
        });
        setsCount++;
      }
    }
  }

  // 4. Restore Cards
  let cardsCount = 0;
  if (backup.cards && backup.cards.length > 0) {
    for (const c of backup.cards) {
      if (!c.id || !c.term || !c.definition || !c.setId) continue;
      const existing = await db
        .select()
        .from(cards)
        .where(eq(cards.id, c.id))
        .get();

      let targetCardId = c.id;
      if (existing && existing.userId !== userId) {
        targetCardId = nanoid();
      }
      cardIdMap.set(c.id, targetCardId);

      const targetSetId = setIdMap.get(c.setId) || c.setId;

      if (!existing || existing.userId !== userId) {
        await db.insert(cards).values({
          id: targetCardId,
          setId: targetSetId,
          userId,
          term: c.term,
          definition: c.definition,
          phonetic: c.phonetic || null,
          partOfSpeech: c.partOfSpeech || null,
          example: c.example || null,
          audioUrl: c.audioUrl || null,
          position: c.position || 0,
          starred: Boolean(c.starred),
          createdAt: c.createdAt || Date.now(),
          updatedAt: c.updatedAt || Date.now(),
        });
        cardsCount++;
      }
    }
  }

  // 5. Restore Card Progress
  let progressCount = 0;
  if (backup.cardProgress && backup.cardProgress.length > 0) {
    for (const p of backup.cardProgress) {
      if (!p.cardId) continue;
      const targetCardId = cardIdMap.get(p.cardId) || p.cardId;

      const card = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, targetCardId), eq(cards.userId, userId)))
        .get();

      if (card) {
        const existing = await db
          .select()
          .from(cardProgress)
          .where(eq(cardProgress.cardId, targetCardId))
          .get();

        if (!existing) {
          await db.insert(cardProgress).values({
            cardId: targetCardId,
            userId,
            repetitions: p.repetitions || 0,
            easeFactor: p.easeFactor || 250,
            intervalDays: p.intervalDays || 0,
            dueAt: p.dueAt || Date.now(),
            lastReviewedAt: p.lastReviewedAt || null,
            lapses: p.lapses || 0,
          });
          progressCount++;
        }
      }
    }
  }

  // 6. Restore Review Logs
  let logsCount = 0;
  if (backup.reviewLogs && backup.reviewLogs.length > 0) {
    for (const l of backup.reviewLogs) {
      if (!l.id || !l.cardId || !l.rating || !l.mode) continue;
      const targetCardId = cardIdMap.get(l.cardId) || l.cardId;

      const card = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, targetCardId), eq(cards.userId, userId)))
        .get();

      if (card) {
        const existing = await db
          .select()
          .from(reviewLogs)
          .where(eq(reviewLogs.id, l.id))
          .get();

        const targetLogId = existing ? nanoid() : l.id;
        await db.insert(reviewLogs).values({
          id: targetLogId,
          userId,
          cardId: targetCardId,
          rating: l.rating as 'again' | 'hard' | 'good' | 'easy',
          mode: l.mode as 'flashcards' | 'review' | 'learn' | 'test' | 'match',
          elapsedMs: l.elapsedMs || 0,
          reviewedAt: l.reviewedAt || Date.now(),
        });
        logsCount++;
      }
    }
  }

  return {
    foldersCount,
    setsCount,
    cardsCount,
    progressCount,
    logsCount,
  };
}
