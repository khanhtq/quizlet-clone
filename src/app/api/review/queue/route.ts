import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getReviewQueue } from '@/server/queries/review';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId') || undefined;

    const result = await getReviewQueue(user.userId, { setId });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc không có quyền truy cập' },
      { status: 401 }
    );
  }
}
