import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import {
  getFolderById,
  updateFolder,
  deleteFolder,
} from '@/server/queries/folders';
import { z } from 'zod';

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Tên thư mục không được để trống'),
});

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const folderId = params.id;

    const data = await getFolderById(user.userId, folderId);
    if (!data) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const folderId = params.id;
    const body = await request.json();

    const parsed = updateFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    const success = await updateFolder(user.userId, folderId, {
      name: parsed.data.name,
    });
    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const params = await props.params;
    const folderId = params.id;

    const success = await deleteFolder(user.userId, folderId);
    if (!success) {
      return NextResponse.json({ error: 'Không tìm thấy thư mục' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
