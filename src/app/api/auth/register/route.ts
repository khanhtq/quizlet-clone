import { NextRequest, NextResponse } from 'next/server';
import { register, registerSchema } from '@/server/auth';
import { verifyOrigin } from '@/server/auth/csrf';

export async function POST(request: NextRequest) {
  if (!(await verifyOrigin())) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ (CSRF)' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const result = await register(parsed.data, clientIp);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (err) {
    console.error('Register route error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
