import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { toggleCardStar } from '@/server/queries/cards';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const cardId = params.id;

    const starred = await toggleCardStar(user.userId, cardId);
    return NextResponse.json({ starred });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    if (message === 'CARD_NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Không tìm thấy thẻ' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
