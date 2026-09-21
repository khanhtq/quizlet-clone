import { db, sets, cards } from '@/server/db';
import { eq, and, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function toggleSetShare(
  userId: string,
  setId: string,
  isPublic: boolean
): Promise<{ isPublic: boolean; shareSlug: string | null }> {
  const existing = await db
    .select()
    .from(sets)
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)))
    .get();

  if (!existing) {
    throw new Error('SET_NOT_FOUND_OR_UNAUTHORIZED');
  }

  let slug = existing.shareSlug;
  if (isPublic && !slug) {
    slug = nanoid(16);
  }

  await db
    .update(sets)
    .set({
      isPublic,
      shareSlug: slug,
      updatedAt: Date.now(),
    })
    .where(and(eq(sets.id, setId), eq(sets.userId, userId)));

  return { isPublic, shareSlug: slug };
}

export async function getPublicSetBySlug(slug: string) {
  const set = await db
    .select({
      id: sets.id,
      title: sets.title,
      description: sets.description,
      isPublic: sets.isPublic,
      shareSlug: sets.shareSlug,
      createdAt: sets.createdAt,
    })
    .from(sets)
    .where(and(eq(sets.shareSlug, slug), eq(sets.isPublic, true)))
    .get();

  if (!set) {
    return null;
  }

  const setCards = await db
    .select({
      id: cards.id,
      term: cards.term,
      definition: cards.definition,
      phonetic: cards.phonetic,
      partOfSpeech: cards.partOfSpeech,
      example: cards.example,
      audioUrl: cards.audioUrl,
      position: cards.position,
    })
    .from(cards)
    .where(eq(cards.setId, set.id))
    .orderBy(asc(cards.position));

  return {
    set,
    cards: setCards,
  };
}

export async function copyPublicSetToUser(userId: string, slug: string) {
  const publicData = await getPublicSetBySlug(slug);
  if (!publicData) {
    throw new Error('PUBLIC_SET_NOT_FOUND');
  }

  const now = Date.now();
  const newSetId = `set_${nanoid(12)}`;

  // Create duplicate set for target user
  await db.insert(sets).values({
    id: newSetId,
    userId,
    title: publicData.set.title,
    description: publicData.set.description,
    isPublic: false,
    shareSlug: null,
    createdAt: now,
    updatedAt: now,
  });

  // Duplicate cards
  if (publicData.cards.length > 0) {
    const newCards = publicData.cards.map((c) => ({
      id: `card_${nanoid(12)}`,
      setId: newSetId,
      userId,
      term: c.term,
      definition: c.definition,
      phonetic: c.phonetic,
      partOfSpeech: c.partOfSpeech,
      example: c.example,
      audioUrl: c.audioUrl,
      position: c.position,
      starred: false,
      createdAt: now,
      updatedAt: now,
    }));

    await db.insert(cards).values(newCards);
  }

  return { setId: newSetId };
}
