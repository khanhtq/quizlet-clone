import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getSetById, updateSet, deleteSet } from '@/server/queries/sets';
import { getCardsBySetId } from '@/server/queries/cards';
import { db, cardProgress } from '@/server/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSetSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').optional(),
  description: z.string().trim().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const set = await getSetById(user.userId, id);

    if (!set) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    const setCards = await getCardsBySetId(user.userId, id);
    const now = Date.now();

    let dueCount = 0;
    const cardsWithProgress = await Promise.all(
      setCards.map(async (c) => {
        const progress = await db
          .select()
          .from(cardProgress)
          .where(and(eq(cardProgress.cardId, c.id), eq(cardProgress.userId, user.userId)))
          .get();

        const isDue = !progress || progress.dueAt <= now;
        if (isDue) {
          dueCount++;
        }

        return {
          ...c,
          progress: progress || null,
          isDue,
        };
      })
    );

    return NextResponse.json({
      set: {
        ...set,
        cardCount: setCards.length,
        dueCount,
      },
      cards: cardsWithProgress,
    });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const updated = await updateSet(user.userId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    return NextResponse.json({ set: updated });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const success = await deleteSet(user.userId, id);

    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
