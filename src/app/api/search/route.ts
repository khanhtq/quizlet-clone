import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { searchSetsAndCards } from '@/server/queries/search';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const results = await searchSetsAndCards(user.userId, query);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
