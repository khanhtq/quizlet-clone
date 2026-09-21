import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { recordMatchScore } from '@/server/queries/match';
import { createReviewLog } from '@/server/queries/logs';
import { z } from 'zod';

const scoreSchema = z.object({
  elapsedMs: z.number().int().min(1),
  cardIds: z.array(z.string()).optional(),
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

    const parsed = scoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    const result = await recordMatchScore(user.userId, setId, parsed.data.elapsedMs);

    // Record review logs for played cards if provided
    if (parsed.data.cardIds && parsed.data.cardIds.length > 0) {
      const avgElapsed = Math.round(parsed.data.elapsedMs / parsed.data.cardIds.length);
      for (const cardId of parsed.data.cardIds) {
        try {
          await createReviewLog(user.userId, {
            cardId,
            rating: 'good',
            mode: 'match',
            elapsedMs: avgElapsed,
          });
        } catch {
          // Ignore individual log failures
        }
      }
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi hệ thống';
    if (message === 'SET_NOT_FOUND_OR_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
