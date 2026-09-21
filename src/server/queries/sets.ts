import { db, sets, cards } from '@/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateSetInput {
  title: string;
  description?: string;
  folderId?: string | null;
  isPublic?: boolean;
}

export interface UpdateSetInput {
  title?: string;
  description?: string;
  folderId?: string | null;
  isPublic?: boolean;
  lastStudiedAt?: number;
}

export async function getUserSets(userId: string) {
  return db
    .select()
    .from(sets)
    .where(eq(sets.userId, userId))
    .orderBy(desc(sets.lastStudiedAt), desc(sets.updatedAt));
}

export async function getSetById(userId: string, setId: string) {
  return db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();
}

export async function createSet(userId: string, data: CreateSetInput) {
  const id = nanoid();
  const now = Date.now();

  const newSet = {
    id,
    userId,
    title: data.title.trim(),
    description: data.description?.trim() || null,
    folderId: data.folderId || null,
    isPublic: data.isPublic ?? false,
    shareSlug: nanoid(10),
    createdAt: now,
    updatedAt: now,
    lastStudiedAt: null,
  };

  await db.insert(sets).values(newSet);
  return newSet;
}

export async function updateSet(userId: string, setId: string, data: UpdateSetInput) {
  const now = Date.now();
  const existing = await getSetById(userId, setId);
  if (!existing) {
    return null;
  }

  await db
    .update(sets)
    .set({
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.folderId !== undefined && { folderId: data.folderId }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.lastStudiedAt !== undefined && { lastStudiedAt: data.lastStudiedAt }),
      updatedAt: now,
    })
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)));

  return getSetById(userId, setId);
}

export async function deleteSet(userId: string, setId: string): Promise<boolean> {
  const existing = await getSetById(userId, setId);
  if (!existing) {
    return false;
  }

  await db.delete(sets).where(and(eq(sets.id, setId), eq(sets.userId, userId)));
  return true;
}

export async function duplicateSet(userId: string, setId: string, newTitle?: string) {
  const existing = await getSetById(userId, setId);
  if (!existing) {
    return null;
  }

  const existingCards = await db
    .select()
    .from(cards)
    .where(and(eq(cards.setId, setId), eq(cards.userId, userId)))
    .orderBy(cards.position);

  const title = newTitle || `${existing.title} (Bản sao)`;
  const created = await createSet(userId, {
    title,
    description: existing.description || undefined,
    folderId: existing.folderId,
    isPublic: false,
  });

  const now = Date.now();
  for (const card of existingCards) {
    await db.insert(cards).values({
      id: nanoid(),
      setId: created.id,
      userId,
      term: card.term,
      definition: card.definition,
      phonetic: card.phonetic,
      partOfSpeech: card.partOfSpeech,
      example: card.example,
      audioUrl: card.audioUrl,
      position: card.position,
      starred: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return created;
}
