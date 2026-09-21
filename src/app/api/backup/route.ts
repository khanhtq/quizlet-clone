import { NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getUserFullBackup } from '@/server/queries/backup';

export async function GET() {
  try {
    const user = await requireAuth();
    const backupData = await getUserFullBackup(user.userId);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `quizlet_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
