import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { copyPublicSetToUser } from '@/server/queries/share';
import { z } from 'zod';

const cloneSchema = z.object({
  slug: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = cloneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const result = await copyPublicSetToUser(user.userId, parsed.data.slug);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    if (message === 'PUBLIC_SET_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Không tìm thấy học phần công khai' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
