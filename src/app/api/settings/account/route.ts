import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import {
  db,
  users,
  sets,
  cards,
  cardProgress,
  reviewLogs,
  matchScores,
  userSettings,
  folders,
} from '@/server/db';

import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';

const deleteAccountSchema = z.object({
  confirmText: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    // Must match either user's email or exact text 'XÓA TÀI KHOẢN'
    const confirm = parsed.data.confirmText.trim();
    if (confirm !== user.email && confirm !== 'XÓA TÀI KHOẢN') {
      return NextResponse.json(
        { error: 'Văn bản xác nhận không khớp' },
        { status: 400 }
      );
    }

    // Cascade delete user data
    await db.delete(reviewLogs).where(eq(reviewLogs.userId, session.userId));
    await db.delete(cardProgress).where(eq(cardProgress.userId, session.userId));
    await db.delete(matchScores).where(eq(matchScores.userId, session.userId));
    await db.delete(cards).where(eq(cards.userId, session.userId));
    await db.delete(sets).where(eq(sets.userId, session.userId));
    await db.delete(folders).where(eq(folders.userId, session.userId));
    await db.delete(userSettings).where(eq(userSettings.userId, session.userId));
    await db.delete(users).where(eq(users.id, session.userId));


    // Clear session cookie
    const cookieStore = await cookies();
    cookieStore.delete('auth_session');

    return NextResponse.json({ message: 'Tài khoản đã được xóa thành công' });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
