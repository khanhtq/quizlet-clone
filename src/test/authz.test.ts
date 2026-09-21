import { describe, it, expect, beforeEach } from 'vitest';
import { db, users } from '@/server/db';
import { nanoid } from 'nanoid';
import { createSet, getSetById, updateSet, deleteSet, getUserSets } from '@/server/queries/sets';
import { createCard, getCardById, getCardsBySetId, updateCard, deleteCard } from '@/server/queries/cards';
import { getCardProgress, upsertCardProgress } from '@/server/queries/progress';
import { createReviewLog, deleteLastReviewLog, getUserReviewLogs } from '@/server/queries/logs';

describe('Authorization & Multi-tenant Data Isolation Test Harness', () => {
  let userA: string;
  let userB: string;

  beforeEach(async () => {
    userA = `user_a_${nanoid(8)}`;
    userB = `user_b_${nanoid(8)}`;

    // Seed test users
    await db.insert(users).values([
      {
        id: userA,
        email: `${userA}@example.com`,
        passwordHash: 'dummy_hash',
        createdAt: Date.now(),
      },
      {
        id: userB,
        email: `${userB}@example.com`,
        passwordHash: 'dummy_hash',
        createdAt: Date.now(),
      },
    ]);
  });

  it("User B cannot read, modify, or delete User A's sets", async () => {
    // User A creates a set
    const setA = await createSet(userA, {
      title: 'Vocabulary Set A',
      description: 'Private set of User A',
      isPublic: false,
    });

    expect(setA).toBeDefined();

    // User A can read their set
    const readByA = await getSetById(userA, setA.id);
    expect(readByA?.title).toBe('Vocabulary Set A');

    // User B CANNOT read User A's set
    const readByB = await getSetById(userB, setA.id);
    expect(readByB).toBeUndefined();

    // User B's set list does not contain User A's set
    const listB = await getUserSets(userB);
    expect(listB.some((s) => s.id === setA.id)).toBe(false);

    // User B CANNOT update User A's set
    const updateResult = await updateSet(userB, setA.id, {
      title: 'Hacked by B',
    });
    expect(updateResult).toBeNull();

    // Verify title was not changed
    const unchanged = await getSetById(userA, setA.id);
    expect(unchanged?.title).toBe('Vocabulary Set A');

    // User B CANNOT delete User A's set
    const deleteResult = await deleteSet(userB, setA.id);
    expect(deleteResult).toBe(false);

    // Verify set still exists for User A
    const stillExists = await getSetById(userA, setA.id);
    expect(stillExists).toBeDefined();
  });

  it("User B cannot read, add, modify, or delete User A's cards", async () => {
    const setA = await createSet(userA, {
      title: 'Set A for Cards',
      isPublic: false,
    });

    const cardA = await createCard(userA, setA.id, {
      term: 'apple',
      definition: 'quả táo',
    });

    expect(cardA).toBeDefined();

    // User B CANNOT view cards in User A's set
    const cardsReadByB = await getCardsBySetId(userB, setA.id);
    expect(cardsReadByB).toHaveLength(0);

    // User B CANNOT view card by ID
    const cardReadByB = await getCardById(userB, cardA.id);
    expect(cardReadByB).toBeUndefined();

    // User B CANNOT add card to User A's set
    await expect(
      createCard(userB, setA.id, {
        term: 'banana',
        definition: 'quả chuối',
      })
    ).rejects.toThrow('NOT_FOUND_OR_UNAUTHORIZED');

    // User B CANNOT update User A's card
    const updateCardResult = await updateCard(userB, cardA.id, {
      definition: 'hacked definition',
    });
    expect(updateCardResult).toBeNull();

    // User B CANNOT delete User A's card
    const deleteCardResult = await deleteCard(userB, cardA.id);
    expect(deleteCardResult).toBe(false);

    // Verify card is still intact for User A
    const intactCard = await getCardById(userA, cardA.id);
    expect(intactCard?.definition).toBe('quả táo');
  });

  it("User B cannot read or mutate User A's progress and review logs", async () => {
    const setA = await createSet(userA, { title: 'Set A SRS' });
    const cardA = await createCard(userA, setA.id, {
      term: 'dog',
      definition: 'con chó',
    });

    // User A sets progress
    await upsertCardProgress(userA, cardA.id, {
      repetitions: 1,
      easeFactor: 250,
      intervalDays: 1,
      dueAt: Date.now() + 86400000,
      lapses: 0,
    });

    // User B cannot read User A's progress
    const progressB = await getCardProgress(userB, cardA.id);
    expect(progressB).toBeUndefined();

    // User B cannot update User A's progress
    await expect(
      upsertCardProgress(userB, cardA.id, {
        repetitions: 99,
        easeFactor: 130,
        intervalDays: 99,
        dueAt: 0,
        lapses: 99,
      })
    ).rejects.toThrow('CARD_NOT_FOUND_OR_UNAUTHORIZED');

    // User A creates review log
    await createReviewLog(userA, {
      cardId: cardA.id,
      rating: 'good',
      mode: 'flashcards',
      elapsedMs: 1500,
    });

    // User B cannot view User A's logs
    const logsB = await getUserReviewLogs(userB);
    expect(logsB).toHaveLength(0);

    // User B cannot delete User A's log
    const deletedLog = await deleteLastReviewLog(userB, cardA.id);
    expect(deletedLog).toBe(false);
  });
});
