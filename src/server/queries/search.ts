import { db, sets, cards } from '@/server/db';
import { eq, and, or, like } from 'drizzle-orm';

export interface SearchResult {
  sets: {
    id: string;
    title: string;
    description: string | null;
    createdAt: number;
  }[];
  cards: {
    id: string;
    setId: string;
    setTitle: string;
    term: string;
    definition: string;
    phonetic: string | null;
    partOfSpeech: string | null;
  }[];
}

export async function searchSetsAndCards(
  userId: string,
  query: string
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { sets: [], cards: [] };
  }

  const pattern = `%${trimmed}%`;

  // Search sets
  const matchingSets = await db
    .select({
      id: sets.id,
      title: sets.title,
      description: sets.description,
      createdAt: sets.createdAt,
    })
    .from(sets)
    .where(
      and(
        eq(sets.userId, userId),
        or(like(sets.title, pattern), like(sets.description, pattern))
      )
    )
    .limit(20);

  // Search cards
  const matchingCards = await db
    .select({
      id: cards.id,
      setId: cards.setId,
      setTitle: sets.title,
      term: cards.term,
      definition: cards.definition,
      phonetic: cards.phonetic,
      partOfSpeech: cards.partOfSpeech,
    })
    .from(cards)
    .innerJoin(sets, eq(cards.setId, sets.id))
    .where(
      and(
        eq(cards.userId, userId),
        or(like(cards.term, pattern), like(cards.definition, pattern))
      )
    )
    .limit(50);

  return {
    sets: matchingSets,
    cards: matchingCards,
  };
}
