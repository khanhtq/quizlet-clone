import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { setFolderForSet } from '@/server/queries/folders';
import { z } from 'zod';

const assignFolderSchema = z.object({
  folderId: z.string().nullable(),
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

    const parsed = assignFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const success = await setFolderForSet(
      user.userId,
      setId,
      parsed.data.folderId
    );
    if (!success) {
      return NextResponse.json(
        { error: 'Không tìm thấy học phần hoặc thư mục' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
