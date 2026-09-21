import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { createCard } from '@/server/queries/cards';
import { z } from 'zod';

const createCardSchema = z.object({
  term: z.string().trim().min(1, 'Thuật ngữ không được để trống'),
  definition: z.string().trim().min(1, 'Định nghĩa không được để trống'),
  phonetic: z.string().trim().optional(),
  partOfSpeech: z.string().trim().optional(),
  example: z.string().trim().optional(),
  audioUrl: z.string().trim().optional(),
  position: z.number().int().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: setId } = await params;
    const body = await request.json();
    const parsed = createCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const card = await createCard(user.userId, setId, parsed.data);
    return NextResponse.json({ card }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Không tìm thấy học phần hoặc không có quyền' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
