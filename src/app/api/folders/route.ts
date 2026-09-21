import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { createFolder, getUserFolders } from '@/server/queries/folders';
import { z } from 'zod';

const createFolderSchema = z.object({
  name: z.string().min(1, 'Tên thư mục không được để trống'),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const foldersList = await getUserFolders(user.userId);
    return NextResponse.json({ folders: foldersList });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const folder = await createFolder(user.userId, parsed.data.name);
    return NextResponse.json({ folder }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
