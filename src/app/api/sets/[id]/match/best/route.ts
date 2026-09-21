import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getBestMatchScore } from '@/server/queries/match';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const setId = params.id;

    const bestMs = await getBestMatchScore(user.userId, setId);
    return NextResponse.json({ bestMs });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
