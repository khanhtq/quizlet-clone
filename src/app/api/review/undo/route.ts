import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { deleteLastReviewLog } from '@/server/queries/logs';
import { z } from 'zod';

const undoSchema = z.object({
  cardId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = undoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const deleted = await deleteLastReviewLog(user.userId, parsed.data.cardId);
    return NextResponse.json({ success: deleted });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
