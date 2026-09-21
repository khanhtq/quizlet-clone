import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getUserStats } from '@/server/queries/stats';

export async function GET() {
  try {
    const user = await requireAuth();
    const stats = await getUserStats(user.userId);
    return NextResponse.json({ stats });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
