import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getUserSets, createSet } from '@/server/queries/sets';
import { db, cards, cardProgress } from '@/server/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createSetSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống'),
  description: z.string().trim().optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const userSets = await getUserSets(user.userId);
    const now = Date.now();

    // Attach card counts and due counts for each set
    const setsWithCounts = await Promise.all(
      userSets.map(async (s) => {
        const setCards = await db
          .select({ id: cards.id })
          .from(cards)
          .where(and(eq(cards.setId, s.id), eq(cards.userId, user.userId)));

        let dueCount = 0;
        for (const c of setCards) {
          const progress = await db
            .select({ dueAt: cardProgress.dueAt })
            .from(cardProgress)
            .where(and(eq(cardProgress.cardId, c.id), eq(cardProgress.userId, user.userId)))
            .get();

          // Card is due if dueAt <= now or not yet reviewed
          if (!progress || progress.dueAt <= now) {
            dueCount++;
          }
        }

        return {
          ...s,
          cardCount: setCards.length,
          dueCount,
        };
      })
    );

    return NextResponse.json({ sets: setsWithCounts });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = createSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const created = await createSet(user.userId, parsed.data);
    return NextResponse.json({ set: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
