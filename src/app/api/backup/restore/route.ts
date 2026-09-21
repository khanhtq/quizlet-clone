import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { restoreUserBackup } from '@/server/queries/backup';
import { z } from 'zod';

const restoreSchema = z.object({
  mode: z.enum(['merge', 'replace']).default('merge'),
  backup: z.object({
    version: z.number().optional(),
    userSettings: z.any().optional(),
    folders: z.array(z.any()).optional(),
    sets: z.array(z.any()).optional(),
    cards: z.array(z.any()).optional(),
    cardProgress: z.array(z.any()).optional(),
    reviewLogs: z.array(z.any()).optional(),
    matchScores: z.array(z.any()).optional(),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = restoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Tệp sao lưu không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await restoreUserBackup(
      user.userId,
      parsed.data.backup,
      parsed.data.mode
    );

    return NextResponse.json({ success: true, restored: result });
  } catch {
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc lỗi khôi phục dữ liệu' },
      { status: 401 }
    );
  }
}
