import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { duplicateSet } from '@/server/queries/sets';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const duplicated = await duplicateSet(user.userId, id);

    if (!duplicated) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    return NextResponse.json({ set: duplicated }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
