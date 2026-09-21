import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { getSetById } from '@/server/queries/sets';
import { getCardsBySetId } from '@/server/queries/cards';
import { exportToCSV } from '@/lib/parsers';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const setId = params.id;

    const set = await getSetById(user.userId, setId);
    if (!set) {
      return NextResponse.json({ error: 'Không tìm thấy học phần' }, { status: 404 });
    }

    const cards = await getCardsBySetId(user.userId, setId);
    const csvContent = exportToCSV(cards);

    const safeTitle = (set.title || 'set')
      .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
      .slice(0, 30);
    const filename = `${safeTitle}_cards.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
