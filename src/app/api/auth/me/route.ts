import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/server/auth';
import { db, users, userSettings } from '@/server/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, sessionUser.userId))
    .get();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, user.id))
    .get();

  return NextResponse.json({
    user: {
      ...user,
      settings: settings || null,
    },
  });
}
