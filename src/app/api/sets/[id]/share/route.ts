import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { toggleSetShare } from '@/server/queries/share';
import { z } from 'zod';

const shareSchema = z.object({
  isPublic: z.boolean(),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const setId = params.id;
    const body = await request.json();

    const parsed = shareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const result = await toggleSetShare(user.userId, setId, parsed.data.isPublic);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    if (message === 'SET_NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
