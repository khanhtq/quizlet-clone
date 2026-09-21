import { db, cards, sets, cardProgress } from '@/server/db';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateCardInput {
  term: string;
  definition: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
  audioUrl?: string;
  position?: number;
}

export interface UpdateCardInput {
  term?: string;
  definition?: string;
  phonetic?: string;
  partOfSpeech?: string;
  example?: string;
  audioUrl?: string;
  position?: number;
  starred?: boolean;
}

export async function getCardsBySetId(userId: string, setId: string) {
  // First ensure the set belongs to user or is public
  const set = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();

  if (!set) {
    return [];
  }

  return db
    .select()
    .from(cards)
    .where(and(eq(cards.setId, setId), eq(cards.userId, userId)))
    .orderBy(asc(cards.position), asc(cards.createdAt));
}

export async function getCardById(userId: string, cardId: string) {
  return db
    .select()
    .from(cards)
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .get();
}

export async function createCard(userId: string, setId: string, data: CreateCardInput) {
  // Verify set ownership
  const set = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();

  if (!set) {
    throw new Error('NOT_FOUND_OR_UNAUTHORIZED');
  }

  const id = nanoid();
  const now = Date.now();

  const newCard = {
    id,
    setId,
    userId,
    term: data.term.trim(),
    definition: data.definition.trim(),
    phonetic: data.phonetic?.trim() || null,
    partOfSpeech: data.partOfSpeech?.trim() || null,
    example: data.example?.trim() || null,
    audioUrl: data.audioUrl?.trim() || null,
    position: data.position ?? 0,
    starred: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(cards).values(newCard);

  // Update set updated_at
  await db.update(sets).set({ updatedAt: now }).where(eq(sets.id, setId));

  return newCard;
}

export async function updateCard(userId: string, cardId: string, data: UpdateCardInput) {
  const existing = await getCardById(userId, cardId);
  if (!existing) {
    return null;
  }

  const now = Date.now();
  await db
    .update(cards)
    .set({
      ...(data.term !== undefined && { term: data.term.trim() }),
      ...(data.definition !== undefined && { definition: data.definition.trim() }),
      ...(data.phonetic !== undefined && { phonetic: data.phonetic.trim() }),
      ...(data.partOfSpeech !== undefined && { partOfSpeech: data.partOfSpeech.trim() }),
      ...(data.example !== undefined && { example: data.example.trim() }),
      ...(data.audioUrl !== undefined && { audioUrl: data.audioUrl.trim() }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.starred !== undefined && { starred: data.starred }),
      updatedAt: now,
    })
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)));

  await db.update(sets).set({ updatedAt: now }).where(eq(sets.id, existing.setId));

  return getCardById(userId, cardId);
}

export async function deleteCard(userId: string, cardId: string): Promise<boolean> {
  const existing = await getCardById(userId, cardId);
  if (!existing) {
    return false;
  }

  await db.delete(cards).where(and(eq(cards.id, cardId), eq(cards.userId, userId)));
  await db.delete(cardProgress).where(and(eq(cardProgress.cardId, cardId), eq(cardProgress.userId, userId)));
  await db.update(sets).set({ updatedAt: Date.now() }).where(eq(sets.id, existing.setId));

  return true;
}

export async function findDuplicateCard(userId: string, term: string) {
  const normalized = term.trim().toLowerCase();
  const allUserCards = await db
    .select({
      id: cards.id,
      term: cards.term,
      definition: cards.definition,
      setId: cards.setId,
    })
    .from(cards)
    .where(eq(cards.userId, userId));

  return allUserCards.find((c) => c.term.trim().toLowerCase() === normalized) || null;
}
