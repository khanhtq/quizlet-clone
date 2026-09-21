import { db, sets, cards, cardProgress, reviewLogs } from '@/server/db';
import { eq, and, lte, count } from 'drizzle-orm';
import { getUserSettings } from './settings';

export interface DailyReviewCount {
  date: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "21/09"
  count: number;
}

export interface UserStats {
  dueToday: number;
  streak: number;
  accuracy: number; // percentage 0-100
  totalReviewed: number;
  totalCards: number;
  totalSets: number;
  last30Days: DailyReviewCount[];
}

function getLocalDateString(timestamp: number, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().split('T')[0];
  }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const settings = await getUserSettings(userId);
  const tz = settings.timezone || 'Asia/Ho_Chi_Minh';
  const now = Date.now();

  // 1. Total sets count
  const setsCountResult = await db
    .select({ count: count() })
    .from(sets)
    .where(eq(sets.userId, userId))
    .get();
  const totalSets = setsCountResult?.count ?? 0;

  // 2. Total cards count
  const cardsCountResult = await db
    .select({ count: count() })
    .from(cards)
    .where(eq(cards.userId, userId))
    .get();
  const totalCards = cardsCountResult?.count ?? 0;

  // 3. Due cards count
  const dueResult = await db
    .select({ count: count() })
    .from(cardProgress)
    .where(and(eq(cardProgress.userId, userId), lte(cardProgress.dueAt, now)))
    .get();
  const dueToday = dueResult?.count ?? 0;

  // 4. Review logs
  const logs = await db
    .select({
      id: reviewLogs.id,
      rating: reviewLogs.rating,
      reviewedAt: reviewLogs.reviewedAt,
    })
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId));

  const totalReviewed = logs.length;

  // 5. Accuracy: (good + easy) / total
  let correctCount = 0;
  for (const log of logs) {
    if (log.rating === 'good' || log.rating === 'easy') {
      correctCount++;
    }
  }
  const accuracy = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;

  // 6. 30 Days chart & Streak calculation
  // Group reviews by local date
  const countsByDate = new Map<string, number>();
  for (const log of logs) {
    const dStr = getLocalDateString(log.reviewedAt, tz);
    countsByDate.set(dStr, (countsByDate.get(dStr) || 0) + 1);
  }

  // Generate the last 30 days list ending today
  const last30Days: DailyReviewCount[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;

  for (let i = 29; i >= 0; i--) {
    const targetDateMs = now - i * oneDayMs;
    const dateStr = getLocalDateString(targetDateMs, tz);
    const parts = dateStr.split('-');
    const dayLabel = `${parts[2]}/${parts[1]}`;
    const dayCount = countsByDate.get(dateStr) || 0;

    last30Days.push({
      date: dateStr,
      dayLabel,
      count: dayCount,
    });
  }

  // Streak: calculate consecutive days with >= 1 review
  const todayStr = getLocalDateString(now, tz);
  const yesterdayStr = getLocalDateString(now - oneDayMs, tz);

  let streak = 0;
  let checkMs = now;

  if (countsByDate.has(todayStr)) {
    // Reviewed today: streak includes today
    while (true) {
      const dStr = getLocalDateString(checkMs, tz);
      if (countsByDate.has(dStr)) {
        streak++;
        checkMs -= oneDayMs;
      } else {
        break;
      }
    }
  } else if (countsByDate.has(yesterdayStr)) {
    // Reviewed yesterday: streak is alive
    checkMs = now - oneDayMs;
    while (true) {
      const dStr = getLocalDateString(checkMs, tz);
      if (countsByDate.has(dStr)) {
        streak++;
        checkMs -= oneDayMs;
      } else {
        break;
      }
    }
  } else {
    streak = 0;
  }

  return {
    dueToday,
    streak,
    accuracy,
    totalReviewed,
    totalCards,
    totalSets,
    last30Days,
  };
}
