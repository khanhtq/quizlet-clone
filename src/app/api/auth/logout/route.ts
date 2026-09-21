import { NextResponse } from 'next/server';
import { logout } from '@/server/auth';
import { verifyOrigin } from '@/server/auth/csrf';

export async function POST() {
  if (!(await verifyOrigin())) {
    return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ (CSRF)' }, { status: 403 });
  }

  await logout();
  return NextResponse.json({ success: true }, { status: 200 });
}
