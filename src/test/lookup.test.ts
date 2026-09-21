import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, users, dictionaryCache } from '@/server/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { lookupWord, lookupInputSchema } from '@/server/lookup';
import { MeaningProvider } from '@/server/lookup/types';

describe('Suggestions & Lookup Unit/Integration Tests (M4)', () => {
  let userId: string;

  beforeEach(async () => {
    userId = `user_lookup_${nanoid(6)}`;
    await db.insert(users).values({
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: 'dummy_hash',
      createdAt: Date.now(),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('api.dictionaryapi.dev')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [
              {
                word: 'serendipity',
                phonetic: '/ˌser.ənˈdɪp.ə.ti/',
                phonetics: [{ audio: 'https://example.com/audio.mp3' }],
                meanings: [
                  {
                    partOfSpeech: 'noun',
                    definitions: [
                      {
                        definition: 'The occurrence of events by chance in a happy way.',
                      },
                    ],
                  },
                ],
              },
            ],
          });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      })
    );
  });

  describe('Input Validation', () => {
    it('should accept valid words and phrases', () => {
      expect(lookupInputSchema.safeParse('hello').success).toBe(true);
      expect(lookupInputSchema.safeParse('well-known').success).toBe(true);
      expect(lookupInputSchema.safeParse("don't").success).toBe(true);
      expect(lookupInputSchema.safeParse('come up with').success).toBe(true);
    });

    it('should reject inputs with numbers, special symbols, or >4 words', () => {
      expect(lookupInputSchema.safeParse('word123').success).toBe(false);
      expect(lookupInputSchema.safeParse('hello!').success).toBe(false);
      expect(lookupInputSchema.safeParse('one two three four five').success).toBe(false);
      expect(lookupInputSchema.safeParse('a'.repeat(61)).success).toBe(false);
    });
  });

  describe('Cache and Provider Integration', () => {
    const testWord = `serendipity-${nanoid(6).replace(/[^a-zA-Z]/g, 'x')}`;

    it('should save to dictionary_cache and return cached result on subsequent calls', async () => {
      const mockProvider: MeaningProvider = {
        getMeanings: vi.fn().mockResolvedValue([
          {
            pos: 'noun',
            vi: 'sự tình cờ may mắn',
            exampleEn: 'A fortunate discovery',
          },
        ]),
      };

      // First call (cache miss)
      const res1 = await lookupWord(testWord, userId, false, mockProvider);
      expect(res1.word).toBe(testWord.toLowerCase());
      expect(res1.source).toBe('api');
      expect(res1.meanings.some((m) => m.vi === 'sự tình cờ may mắn')).toBe(true);
      expect(mockProvider.getMeanings).toHaveBeenCalledTimes(1);

      // Verify row exists in dictionary_cache
      const cachedRow = await db
        .select()
        .from(dictionaryCache)
        .where(eq(dictionaryCache.word, testWord.toLowerCase()))
        .get();
      expect(cachedRow).toBeDefined();

      // Second call (cache hit)
      const res2 = await lookupWord(testWord, userId, false, mockProvider);
      expect(res2.source).toBe('cache');
      expect(res2.meanings.some((m) => m.vi === 'sự tình cờ may mắn')).toBe(true);
      // Provider should NOT be called again
      expect(mockProvider.getMeanings).toHaveBeenCalledTimes(1);

      // Third call with forceRefresh = true
      const res3 = await lookupWord(testWord, userId, true, mockProvider);
      expect(res3.source).toBe('api');
      expect(mockProvider.getMeanings).toHaveBeenCalledTimes(2);
    });

    it('should degrade gracefully when provider returns empty array', async () => {
      const emptyWord = `empty-${nanoid(6).replace(/[^a-zA-Z]/g, 'x')}`;
      const mockEmptyProvider: MeaningProvider = {
        getMeanings: vi.fn().mockResolvedValue([]),
      };

      const res = await lookupWord(emptyWord, userId, false, mockEmptyProvider);
      expect(res.word).toBe(emptyWord.toLowerCase());
      expect(res.meanings).toBeDefined();
    });
  });
});
