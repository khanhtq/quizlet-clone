import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { lookupWord } from '@/server/lookup';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const word = request.nextUrl.searchParams.get('word');
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    if (!word || !word.trim()) {
      return NextResponse.json({ error: 'Thiếu từ cần tra cứu' }, { status: 400 });
    }

    const result = await lookupWord(word.trim(), user.userId, refresh);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
    if (message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
