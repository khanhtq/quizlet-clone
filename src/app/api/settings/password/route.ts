import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { db, users } from '@/server/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .get();

    if (!user) {
      return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại không chính xác' },
        { status: 400 }
      );
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, session.userId));

    return NextResponse.json({ message: 'Đổi mật khẩu thành công' });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
