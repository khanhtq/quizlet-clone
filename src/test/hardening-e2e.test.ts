import { describe, it, expect, beforeEach } from 'vitest';
import { db, users, sets, cards, cardProgress, reviewLogs } from '@/server/db';
import { hashPassword, verifyPassword } from '@/server/auth/session';
import { seedDatabase } from '@/server/db/seed';
import { getReviewQueue, rateCardSRS } from '@/server/queries/review';
import { schedule } from '@/lib/srs';
import nextConfig from '../../next.config';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

describe('Hardening & End-to-End Flow (M13)', () => {
  beforeEach(async () => {
    // Clean tables for tests
    await db.delete(reviewLogs);
    await db.delete(cardProgress);
    await db.delete(cards);
    await db.delete(sets);
    await db.delete(users);
  });

  it('verifies nextConfig security headers are properly declared', async () => {
    expect(nextConfig.headers).toBeDefined();
    if (nextConfig.headers) {
      const headerConfigs = await nextConfig.headers();
      expect(headerConfigs.length).toBeGreaterThan(0);
      const rootHeaders = headerConfigs[0];
      expect(rootHeaders.source).toBe('/(.*)');

      const headerMap = new Map(rootHeaders.headers.map((h) => [h.key, h.value]));
      expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
      expect(headerMap.get('X-Frame-Options')).toBe('DENY');
      expect(headerMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(headerMap.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(headerMap.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
      expect(headerMap.get('Permissions-Policy')).toContain('camera=()');
    }
  });

  it('runs seedDatabase and verifies demo user and 20 rich sample cards', async () => {
    await seedDatabase();

    const demoUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'demo@quizlet.local'))
      .limit(1);

    expect(demoUser.length).toBe(1);
    expect(await verifyPassword('Demo123456', demoUser[0].passwordHash)).toBe(true);

    const demoSets = await db
      .select()
      .from(sets)
      .where(eq(sets.userId, demoUser[0].id));

    expect(demoSets.length).toBe(1);
    expect(demoSets[0].title).toContain('20 Từ vựng');

    const demoCards = await db
      .select()
      .from(cards)
      .where(eq(cards.setId, demoSets[0].id));

    expect(demoCards.length).toBe(20);
    expect(demoCards.some((c) => c.starred)).toBe(true);
    expect(demoCards.every((c) => c.term && c.definition && c.phonetic)).toBe(true);
  });

  it('completes the entire study lifecycle: register -> create set -> add cards -> flip & rate -> review today', async () => {
    // 1. Register user
    const userId = nanoid();
    const email = 'study-e2e@quizlet.local';
    const passwordHash = await hashPassword('SecurePassword123');

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash,
      createdAt: Date.now(),
    });

    // 2. Create study set
    const setId = nanoid();
    await db.insert(sets).values({
      id: setId,
      userId,
      title: 'E2E Vocabulary Set',
      description: 'End to end testing set',
      isPublic: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Add 3 cards
    const cardIds = [nanoid(), nanoid(), nanoid()];
    const cardData = [
      {
        id: cardIds[0],
        setId,
        userId,
        term: 'ephemeral',
        definition: 'phù du, ngắn ngủi',
        phonetic: '/ɪˈfem.ər.əl/',
        partOfSpeech: 'adj',
        example: 'Fame is ephemeral.',
        position: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: cardIds[1],
        setId,
        userId,
        term: 'serendipity',
        definition: 'duyên may tình cờ',
        phonetic: '/ˌser.ənˈdɪp.ə.ti/',
        partOfSpeech: 'noun',
        example: 'Pure serendipity.',
        position: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: cardIds[2],
        setId,
        userId,
        term: 'resilience',
        definition: 'sự kiên cường',
        phonetic: '/rɪˈzɪl.jəns/',
        partOfSpeech: 'noun',
        example: 'Resilience is key.',
        position: 2,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    await db.insert(cards).values(cardData);

    // 4. Check initial SRS queue: all 3 cards should be queued as new cards
    const initialDue = await getReviewQueue(userId);
    expect(initialDue.cards.length).toBe(3);
    expect(initialDue.newCount).toBe(3);

    // 5. Flip & rate card 0 as "good"
    const now = Date.now();
    const srsGood = schedule({ repetitions: 0, easeFactor: 2.5, intervalDays: 0, lapses: 0 }, 'good', now);
    expect(srsGood.intervalDays).toBe(1);

    await rateCardSRS(userId, {
      cardId: cardIds[0],
      rating: 'good',
      elapsedMs: 2500,
      mode: 'flashcards',
    });

    // Verify cardProgress updated
    const prog0 = await db.select().from(cardProgress).where(eq(cardProgress.cardId, cardIds[0]));
    expect(prog0.length).toBe(1);
    expect(prog0[0].repetitions).toBe(1);
    expect(prog0[0].intervalDays).toBe(1);

    // 6. Flip & rate card 1 as "again"
    const srsAgain = schedule({ repetitions: 0, easeFactor: 2.5, intervalDays: 0, lapses: 0 }, 'again', now);
    expect(srsAgain.intervalDays).toBe(0);
    expect(srsAgain.lapses).toBe(1);

    await rateCardSRS(userId, {
      cardId: cardIds[1],
      rating: 'again',
      elapsedMs: 3200,
      mode: 'flashcards',
    });

    const prog1 = await db.select().from(cardProgress).where(eq(cardProgress.cardId, cardIds[1]));
    expect(prog1.length).toBe(1);
    expect(prog1[0].repetitions).toBe(0);
    expect(prog1[0].lapses).toBe(1);

    // 7. Verify reviewLogs logged
    const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.userId, userId));
    expect(logs.length).toBe(2);
    expect(logs.some((l) => l.rating === 'good')).toBe(true);
    expect(logs.some((l) => l.rating === 'again')).toBe(true);

    // 8. Due check after reviews: card 1 (again) is due in 10 minutes, card 2 is still unstudied new card
    // At now, card 2 is new
    const queueNow = await getReviewQueue(userId, { now });
    expect(queueNow.cards.some((c) => c.id === cardIds[2])).toBe(true);

    // At now + 15m, card 1 (rated again) is now also due
    const queueLater = await getReviewQueue(userId, { now: now + 15 * 60 * 1000 });
    expect(queueLater.cards.some((c) => c.id === cardIds[1])).toBe(true);
  });
});
