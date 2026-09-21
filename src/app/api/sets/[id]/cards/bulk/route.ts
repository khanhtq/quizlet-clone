import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { createCardsBulk } from '@/server/queries/cards';
import { z } from 'zod';

const bulkSchema = z.object({
  cards: z.array(
    z.object({
      term: z.string().min(1),
      definition: z.string(),
      phonetic: z.string().optional(),
      partOfSpeech: z.string().optional(),
      example: z.string().optional(),
      audioUrl: z.string().optional(),
    })
  ).min(1).max(500),
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

    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const created = await createCardsBulk(user.userId, setId, parsed.data.cards);
    return NextResponse.json({ success: true, count: created.length, cards: created }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    if (message === 'NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
