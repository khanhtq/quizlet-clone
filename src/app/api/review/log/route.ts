import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { createReviewLog } from '@/server/queries/logs';
import { updateSet } from '@/server/queries/sets';
import { db, cards } from '@/server/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const logSchema = z.object({
  cardId: z.string(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  mode: z.enum(['flashcards', 'review', 'learn', 'test', 'match']),
  elapsedMs: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = logSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const log = await createReviewLog(user.userId, parsed.data);

    // Update set lastStudiedAt
    const card = await db
      .select({ setId: cards.setId })
      .from(cards)
      .where(and(eq(cards.id, parsed.data.cardId), eq(cards.userId, user.userId)))
      .get();

    if (card) {
      await updateSet(user.userId, card.setId, { lastStudiedAt: Date.now() });
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập hoặc không có quyền' }, { status: 401 });
  }
}
