import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/server/auth';
import { db, cards } from '@/server/db';
import { eq, like, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const query = request.nextUrl.searchParams.get('q') || request.nextUrl.searchParams.get('prefix');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const cleanQuery = query.trim().toLowerCase();

    // 1. Suggestions from user's own cards
    const userCards = await db
      .select({ term: cards.term })
      .from(cards)
      .where(and(eq(cards.userId, user.userId), like(cards.term, `${cleanQuery}%`)))
      .limit(5);

    const userTerms = Array.from(
      new Set(userCards.map((c) => c.term.trim()))
    );

    // 2. Suggestions from Datamuse API (timeout 2s)
    let datamuseWords: string[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const datamuseRes = await fetch(
        `https://api.datamuse.com/sug?s=${encodeURIComponent(cleanQuery)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (datamuseRes.ok) {
        const data = await datamuseRes.json();
        if (Array.isArray(data)) {
          datamuseWords = data.map((item: { word: string }) => item.word);
        }
      }
    } catch {
      // Ignore external datamuse timeout
    }

    // Merge: user terms first, then Datamuse, deduplicate, max 8 items
    const merged = Array.from(new Set([...userTerms, ...datamuseWords])).slice(0, 8);

    return NextResponse.json({ suggestions: merged });
  } catch {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
}
