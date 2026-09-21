import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { undoCardSRS } from '@/server/queries/review';
import { z } from 'zod';

const undoSchema = z.object({
  cardId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = undoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const result = await undoCardSRS(user.userId, parsed.data.cardId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
