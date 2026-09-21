export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export interface SRSState {
  repetitions: number;
  easeFactor: number; // e.g. 2.5
  intervalDays: number;
  lapses: number;
  dueAt?: number;
}

export interface SRSResult {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  lapses: number;
  dueAt: number;
}

export interface ScheduledIntervals {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

/**
 * Format interval into human-readable label: '10m', '1d', '3d', '15d', etc.
 */
export function formatInterval(intervalDays: number): string {
  if (intervalDays <= 0) {
    return '10m';
  }
  return `${intervalDays}d`;
}

/**
 * Get the parts of a timestamp formatted in a given timezone.
 */
function getZonedDateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = parseInt(p.value, 10);
    }
  }
  return {
    year: map.year ?? date.getUTCFullYear(),
    month: (map.month ?? (date.getUTCMonth() + 1)) - 1, // 0-indexed
    day: map.day ?? date.getUTCDate(),
    hour: map.hour ?? date.getUTCHours(),
    minute: map.minute ?? date.getUTCMinutes(),
    second: map.second ?? date.getUTCSeconds(),
    millisecond: date.getUTCMilliseconds(),
  };
}

/**
 * Calculate timezone offset in milliseconds at a given timestamp.
 */
function getTimezoneOffsetMs(timestamp: number, timeZone: string): number {
  const d = new Date(timestamp);
  const parts = getZonedDateTimeParts(d, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );
  return asUtc - timestamp;
}

/**
 * Set due_at to the same clock time on the target day in the user's timezone.
 */
export function calculateTargetDueDate(
  nowMs: number,
  intervalDays: number,
  timeZone: string = 'UTC'
): number {
  if (intervalDays <= 0) {
    return nowMs + 10 * 60 * 1000;
  }

  try {
    const d = new Date(nowMs);
    const parts = getZonedDateTimeParts(d, timeZone);

    // Target day in timezone
    const targetLocalUtc = Date.UTC(
      parts.year,
      parts.month,
      parts.day + intervalDays,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond
    );

    // Initial offset estimate
    const initialOffset = getTimezoneOffsetMs(targetLocalUtc, timeZone);
    const targetEpochGuess = targetLocalUtc - initialOffset;

    // Refined offset at the actual target epoch
    const exactOffset = getTimezoneOffsetMs(targetEpochGuess, timeZone);
    return targetLocalUtc - exactOffset;
  } catch {
    // Fallback if timezone is invalid
    return nowMs + intervalDays * 24 * 60 * 60 * 1000;
  }
}

/**
 * Pure Spaced Repetition scheduling function (no I/O).
 *
 * Algorithm per spec 6.2:
 * - Again: repetitions = 0, lapses + 1, ease = max(1.3, ease - 0.2), due = now + 10m (intervalDays = 0).
 * - Hard: ease = max(1.3, ease - 0.15). Interval = 1 day if repetitions is 0, otherwise max(1, round(prevInterval * 1.2)). repetitions + 1.
 * - Good: interval = 1 day if repetitions is 0, 3 days if repetitions is 1, otherwise round(prevInterval * ease). repetitions + 1.
 * - Easy: ease + 0.15. Interval = the Good interval * 1.3, rounded, and at least Good + 1. repetitions + 1.
 * - Intervals >= 1 day set due_at to the same clock time on the target day in the user's timezone.
 */
export function schedule(
  state: SRSState,
  rating: SRSRating,
  now: number | Date = Date.now(),
  timeZone: string = 'UTC'
): SRSResult {
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const currentEase = typeof state.easeFactor === 'number' && !isNaN(state.easeFactor)
    ? state.easeFactor
    : 2.5;
  const currentReps = state.repetitions || 0;
  const currentInterval = state.intervalDays || 0;
  const currentLapses = state.lapses || 0;

  switch (rating) {
    case 'again': {
      const newEase = Math.max(1.3, Math.round((currentEase - 0.2) * 100) / 100);
      return {
        repetitions: 0,
        easeFactor: newEase,
        intervalDays: 0,
        lapses: currentLapses + 1,
        dueAt: nowMs + 10 * 60 * 1000,
      };
    }

    case 'hard': {
      const newEase = Math.max(1.3, Math.round((currentEase - 0.15) * 100) / 100);
      const intervalDays =
        currentReps === 0 ? 1 : Math.max(1, Math.round(currentInterval * 1.2));
      const dueAt = calculateTargetDueDate(nowMs, intervalDays, timeZone);
      return {
        repetitions: currentReps + 1,
        easeFactor: newEase,
        intervalDays,
        lapses: currentLapses,
        dueAt,
      };
    }

    case 'good': {
      let intervalDays: number;
      if (currentReps === 0) {
        intervalDays = 1;
      } else if (currentReps === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.max(
          currentInterval,
          Math.round(currentInterval * currentEase)
        );
      }
      const dueAt = calculateTargetDueDate(nowMs, intervalDays, timeZone);
      return {
        repetitions: currentReps + 1,
        easeFactor: currentEase,
        intervalDays,
        lapses: currentLapses,
        dueAt,
      };
    }

    case 'easy': {
      const newEase = Math.round((currentEase + 0.15) * 100) / 100;
      let goodInterval: number;
      if (currentReps === 0) {
        goodInterval = 1;
      } else if (currentReps === 1) {
        goodInterval = 3;
      } else {
        goodInterval = Math.max(
          currentInterval,
          Math.round(currentInterval * currentEase)
        );
      }
      const intervalDays = Math.max(
        goodInterval + 1,
        Math.round(goodInterval * 1.3)
      );
      const dueAt = calculateTargetDueDate(nowMs, intervalDays, timeZone);
      return {
        repetitions: currentReps + 1,
        easeFactor: newEase,
        intervalDays,
        lapses: currentLapses,
        dueAt,
      };
    }
  }
}

/**
 * Get preview interval labels for all 4 ratings for a given SRS state.
 */
export function getPreviewIntervals(
  state: SRSState,
  now: number | Date = Date.now(),
  timeZone: string = 'UTC'
): ScheduledIntervals {
  const againRes = schedule(state, 'again', now, timeZone);
  const hardRes = schedule(state, 'hard', now, timeZone);
  const goodRes = schedule(state, 'good', now, timeZone);
  const easyRes = schedule(state, 'easy', now, timeZone);

  return {
    again: formatInterval(againRes.intervalDays),
    hard: formatInterval(hardRes.intervalDays),
    good: formatInterval(goodRes.intervalDays),
    easy: formatInterval(easyRes.intervalDays),
  };
}
