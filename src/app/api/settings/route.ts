import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getUserSettings, updateUserSettings } from '@/server/queries/settings';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  meaningLanguage: z.enum(['vi', 'en', 'both']).optional(),
  newCardsPerDay: z.number().int().min(1).max(200).optional(),
  timezone: z.string().min(1).max(100).optional(),
  ttsAutoplay: z.boolean().optional(),
  defaultDirection: z.enum(['term', 'definition', 'mixed']).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const settings = await getUserSettings(user.userId);
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc phiên đã hết hạn' },
      { status: 401 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu cài đặt không hợp lệ', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const settings = await updateUserSettings(user.userId, parsed.data);
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: 'Chưa đăng nhập hoặc lỗi hệ thống' },
      { status: 401 }
    );
  }
}
