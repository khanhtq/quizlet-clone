import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { findDuplicateCard } from '@/server/queries/cards';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const term = request.nextUrl.searchParams.get('term');

    if (!term || term.trim().length === 0) {
      return NextResponse.json({ duplicate: null });
    }

    const duplicate = await findDuplicateCard(user.userId, term);
    return NextResponse.json({ duplicate });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
