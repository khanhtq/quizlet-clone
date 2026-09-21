import { db, folders, sets } from '@/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface FolderItem {
  id: string;
  name: string;
  createdAt: number;
  setsCount: number;
}

export async function createFolder(
  userId: string,
  name: string
): Promise<{ id: string; name: string; createdAt: number }> {
  const id = `folder_${nanoid(12)}`;
  const now = Date.now();

  await db.insert(folders).values({
    id,
    userId,
    name: name.trim(),
    createdAt: now,
  });

  return { id, name: name.trim(), createdAt: now };
}

export async function getUserFolders(userId: string): Promise<FolderItem[]> {
  const allFolders = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId))
    .orderBy(desc(folders.createdAt));

  const userSets = await db
    .select({
      id: sets.id,
      folderId: sets.folderId,
    })
    .from(sets)
    .where(eq(sets.userId, userId));

  return allFolders.map((f) => ({
    id: f.id,
    name: f.name,
    createdAt: f.createdAt,
    setsCount: userSets.filter((s) => s.folderId === f.id).length,
  }));
}

export async function getFolderById(userId: string, folderId: string) {
  const folder = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .get();

  if (!folder) return null;

  const folderSets = await db
    .select({
      id: sets.id,
      title: sets.title,
      description: sets.description,
      createdAt: sets.createdAt,
      updatedAt: sets.updatedAt,
      lastStudiedAt: sets.lastStudiedAt,
    })
    .from(sets)
    .where(and(eq(sets.folderId, folderId), eq(sets.userId, userId)));

  return {
    folder,
    sets: folderSets,
  };
}

export async function updateFolder(
  userId: string,
  folderId: string,
  data: { name: string }
): Promise<boolean> {
  const existing = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .get();

  if (!existing) return false;

  await db
    .update(folders)
    .set({ name: data.name.trim() })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

  return true;
}

export async function deleteFolder(
  userId: string,
  folderId: string
): Promise<boolean> {
  const existing = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .get();

  if (!existing) return false;

  // Unlink sets from folder
  await db
    .update(sets)
    .set({ folderId: null })
    .where(and(eq(sets.folderId, folderId), eq(sets.userId, userId)));

  await db
    .delete(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));

  return true;
}

export async function setFolderForSet(
  userId: string,
  setId: string,
  folderId: string | null
): Promise<boolean> {
  const set = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();

  if (!set) return false;

  if (folderId) {
    const folder = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
      .get();
    if (!folder) return false;
  }

  await db
    .update(sets)
    .set({ folderId, updatedAt: Date.now() })
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)));

  return true;
}
