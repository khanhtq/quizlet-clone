import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { db, cards, sets } from '@/server/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const reorderSchema = z.object({
  cardIds: z.array(z.string()),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: setId } = await params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    // Verify set ownership
    const set = await db
      .select()
      .from(sets)
      .where(and(eq(sets.id, setId), eq(sets.userId, user.userId)))
      .get();

    if (!set) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    // Update positions
    const now = Date.now();
    for (let i = 0; i < parsed.data.cardIds.length; i++) {
      const cardId = parsed.data.cardIds[i];
      await db
        .update(cards)
        .set({ position: i, updatedAt: now })
        .where(and(eq(cards.id, cardId), eq(cards.setId, setId), eq(cards.userId, user.userId)));
    }

    await db.update(sets).set({ updatedAt: now }).where(eq(sets.id, setId));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
