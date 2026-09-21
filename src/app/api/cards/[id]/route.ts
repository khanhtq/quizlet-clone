import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { updateCard, deleteCard, getCardById } from '@/server/queries/cards';
import { z } from 'zod';

const updateCardSchema = z.object({
  term: z.string().trim().min(1, 'Thuật ngữ không được để trống').optional(),
  definition: z.string().trim().min(1, 'Định nghĩa không được để trống').optional(),
  phonetic: z.string().trim().optional(),
  partOfSpeech: z.string().trim().optional(),
  example: z.string().trim().optional(),
  audioUrl: z.string().trim().optional(),
  position: z.number().int().optional(),
  starred: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const card = await getCardById(user.userId, id);

    if (!card) {
      return NextResponse.json({ error: 'Không tìm thấy thẻ' }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCardSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const updated = await updateCard(user.userId, id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: 'Không tìm thấy thẻ' }, { status: 404 });
    }

    return NextResponse.json({ card: updated });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const success = await deleteCard(user.userId, id);

    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy thẻ' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
