import { NextRequest, NextResponse } from 'next/server';
import { login, loginSchema } from '@/server/auth';
import { verifyOrigin } from '@/server/auth/csrf';

export async function POST(request: NextRequest) {
  if (!(await verifyOrigin())) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ (CSRF)' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
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

    const result = await login(parsed.data, clientIp);
    if (!result.success) {
      // 429 if rate limited, else 401
      const isRateLimit = result.error?.includes('quá 5 lần');
      return NextResponse.json(
        { error: result.error },
        { status: isRateLimit ? 429 : 401 }
      );
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 200 });
  } catch (err) {
    console.error('Login route error:', err);
    return NextResponse.json({ error: 'Đã xảy ra lỗi máy chủ nội bộ' }, { status: 500 });
  }
}
