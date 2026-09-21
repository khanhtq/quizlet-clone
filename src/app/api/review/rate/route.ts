import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { rateCardSRS } from '@/server/queries/review';
import { z } from 'zod';

const rateSchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  elapsedMs: z.number().int().min(0),
  mode: z.enum(['flashcards', 'review', 'learn', 'test', 'match']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = rateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu đánh giá không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await rateCardSRS(user.userId, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi máy chủ';
    if (message === 'CARD_NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json(
        { error: 'Thẻ không tồn tại hoặc không có quyền truy cập' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc không có quyền' },
      { status: 401 }
    );
  }
}
