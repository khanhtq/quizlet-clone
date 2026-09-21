import { db, dictionaryCache } from '@/server/db';
import { eq } from 'drizzle-orm';
import { LookupResult, MeaningItem, lookupInputSchema, MeaningProvider } from './types';
import { fetchFreeDictionary } from './free-dictionary';
import { defaultMeaningProvider } from './llm-provider';

export async function lookupWord(
  rawWord: string,
  userId: string,
  forceRefresh = false,
  customMeaningProvider?: MeaningProvider
): Promise<LookupResult> {
  const parsed = lookupInputSchema.safeParse(rawWord);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Từ không hợp lệ');
  }

  const word = parsed.data.toLowerCase();
  const now = Date.now();

  // 1. Check dictionary_cache unless forceRefresh is true
  if (!forceRefresh) {
    const cached = await db
      .select()
      .from(dictionaryCache)
      .where(eq(dictionaryCache.word, word))
      .get();

    if (cached) {
      try {
        const payload = JSON.parse(cached.payloadJson) as LookupResult;
        return {
          ...payload,
          source: 'cache',
        };
      } catch {
        // Invalid cache, continue
      }
    }
  }

  // 2. Query Free Dictionary and LLM in parallel (5s timeout)
  const provider = customMeaningProvider || defaultMeaningProvider;

  const [freeDictResult, llmMeanings] = await Promise.all([
    fetchFreeDictionary(word),
    provider.getMeanings(word, userId),
  ]);

  // 3. Merge meanings
  const mergedMeanings: MeaningItem[] = [];

  // Add LLM Vietnamese meanings first (with matching or general POS)
  if (llmMeanings.length > 0) {
    for (const lm of llmMeanings) {
      mergedMeanings.push(lm);
    }
  }

  // Then add English meanings from Free Dictionary if available
  if (freeDictResult?.meanings) {
    for (const em of freeDictResult.meanings) {
      // Find if we already have a Vietnamese meaning for this pos
      const existing = mergedMeanings.find(
        (m) => m.pos.toLowerCase() === em.pos.toLowerCase()
      );
      if (existing) {
        if (!existing.en && em.en) existing.en = em.en;
        if (!existing.exampleEn && em.exampleEn) existing.exampleEn = em.exampleEn;
      } else {
        mergedMeanings.push(em);
      }
    }
  }

  const result: LookupResult = {
    word,
    phonetic: freeDictResult?.phonetic,
    audioUrl: freeDictResult?.audioUrl,
    meanings: mergedMeanings,
    source: 'api',
  };

  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    result.notice = 'Chưa thiết lập GEMINI_API_KEY hoặc ANTHROPIC_API_KEY (chỉ hiển thị định nghĩa tiếng Anh).';
  }

  // 4. Save to cache
  if (mergedMeanings.length > 0) {
    const payloadJson = JSON.stringify(result);
    const existingCache = await db
      .select()
      .from(dictionaryCache)
      .where(eq(dictionaryCache.word, word))
      .get();

    if (existingCache) {
      await db
        .update(dictionaryCache)
        .set({ payloadJson, source: 'merged', fetchedAt: now })
        .where(eq(dictionaryCache.word, word));
    } else {
      await db.insert(dictionaryCache).values({
        word,
        payloadJson,
        source: 'merged',
        fetchedAt: now,
      });
    }
  }

  return result;
}

export * from './types';
export * from './free-dictionary';
export * from './llm-provider';
