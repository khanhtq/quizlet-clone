import { describe, it, expect } from 'vitest';
import { schedule, getPreviewIntervals, formatInterval, SRSState } from '../lib/srs';

describe('Spaced Repetition (SRS) - Pure Function', () => {
  const baseNow = new Date('2026-09-21T10:00:00.000Z').getTime();

  it('ease never drops below 1.3', () => {
    let state: SRSState = {
      repetitions: 3,
      easeFactor: 1.4,
      intervalDays: 5,
      lapses: 0,
    };

    // Rating 'again' subtracts 0.2: 1.4 - 0.2 = 1.2 -> should clamp to 1.3
    const againRes = schedule(state, 'again', baseNow);
    expect(againRes.easeFactor).toBe(1.3);

    // Rating 'again' repeatedly should never go below 1.3
    let currentState = againRes;
    for (let i = 0; i < 5; i++) {
      currentState = schedule(currentState, 'again', baseNow);
      expect(currentState.easeFactor).toBe(1.3);
    }

    // Rating 'hard' on 1.35 subtracts 0.15: 1.35 - 0.15 = 1.20 -> clamps to 1.3
    state = { repetitions: 2, easeFactor: 1.35, intervalDays: 3, lapses: 0 };
    const hardRes = schedule(state, 'hard', baseNow);
    expect(hardRes.easeFactor).toBe(1.3);
  });

  it('Again resets repetitions, increments lapses, sets interval to 0 and due to 10 minutes', () => {
    const state: SRSState = {
      repetitions: 5,
      easeFactor: 2.5,
      intervalDays: 21,
      lapses: 2,
    };

    const result = schedule(state, 'again', baseNow);

    expect(result.repetitions).toBe(0);
    expect(result.lapses).toBe(3);
    expect(result.intervalDays).toBe(0);
    expect(result.dueAt).toBe(baseNow + 10 * 60 * 1000);
    expect(result.easeFactor).toBe(2.3);
  });

  it('consecutive Good ratings never shrink the interval', () => {
    let state: SRSState = {
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      lapses: 0,
    };

    let prevInterval = 0;
    for (let i = 0; i < 8; i++) {
      const result = schedule(state, 'good', baseNow);
      expect(result.intervalDays).toBeGreaterThanOrEqual(prevInterval);
      expect(result.repetitions).toBe(state.repetitions + 1);
      prevInterval = result.intervalDays;
      state = result;
    }

    // Even with minimum ease factor (1.3), intervals never shrink
    let minEaseState: SRSState = {
      repetitions: 0,
      easeFactor: 1.3,
      intervalDays: 0,
      lapses: 0,
    };
    prevInterval = 0;
    for (let i = 0; i < 6; i++) {
      const result = schedule(minEaseState, 'good', baseNow);
      expect(result.intervalDays).toBeGreaterThanOrEqual(prevInterval);
      prevInterval = result.intervalDays;
      minEaseState = result;
    }
  });

  it('Easy interval > Good interval > Hard interval for state with repetitions >= 1', () => {
    const testStates: SRSState[] = [
      { repetitions: 1, easeFactor: 2.5, intervalDays: 1, lapses: 0 },
      { repetitions: 2, easeFactor: 2.5, intervalDays: 3, lapses: 0 },
      { repetitions: 3, easeFactor: 2.3, intervalDays: 8, lapses: 1 },
      { repetitions: 4, easeFactor: 1.8, intervalDays: 15, lapses: 2 },
    ];

    for (const state of testStates) {
      const hardRes = schedule(state, 'hard', baseNow);
      const goodRes = schedule(state, 'good', baseNow);
      const easyRes = schedule(state, 'easy', baseNow);

      expect(goodRes.intervalDays).toBeGreaterThan(hardRes.intervalDays);
      expect(easyRes.intervalDays).toBeGreaterThan(goodRes.intervalDays);
    }
  });

  it('Handles initial state (repetitions = 0) with Easy > Good >= Hard', () => {
    const initialState: SRSState = {
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      lapses: 0,
    };

    const hardRes = schedule(initialState, 'hard', baseNow);
    const goodRes = schedule(initialState, 'good', baseNow);
    const easyRes = schedule(initialState, 'easy', baseNow);

    expect(hardRes.intervalDays).toBe(1);
    expect(goodRes.intervalDays).toBe(1);
    expect(easyRes.intervalDays).toBe(2);
    expect(easyRes.intervalDays).toBeGreaterThan(goodRes.intervalDays);
    expect(goodRes.intervalDays).toBeGreaterThanOrEqual(hardRes.intervalDays);
  });

  it('generates accurate preview labels for every rating', () => {
    const initialState: SRSState = {
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      lapses: 0,
    };

    const initialPreviews = getPreviewIntervals(initialState, baseNow);
    expect(initialPreviews).toEqual({
      again: '10m',
      hard: '1d',
      good: '1d',
      easy: '2d',
    });

    const reps1State: SRSState = {
      repetitions: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      lapses: 0,
    };

    const reps1Previews = getPreviewIntervals(reps1State, baseNow);
    expect(reps1Previews).toEqual({
      again: '10m',
      hard: '1d',
      good: '3d',
      easy: '4d',
    });

    const matureState: SRSState = {
      repetitions: 3,
      easeFactor: 2.5,
      intervalDays: 10,
      lapses: 0,
    };

    const maturePreviews = getPreviewIntervals(matureState, baseNow);
    expect(maturePreviews.again).toBe('10m');
    expect(maturePreviews.hard).toBe('12d'); // round(10 * 1.2) = 12
    expect(maturePreviews.good).toBe('25d'); // round(10 * 2.5) = 25
    expect(maturePreviews.easy).toBe('33d'); // max(26, round(25 * 1.3)) = 33
  });

  it('sets due_at to the same clock time on target day in user timezone', () => {
    const tz = 'Asia/Ho_Chi_Minh';
    // 2026-09-21 14:30:00 in Asia/Ho_Chi_Minh (+07:00) -> 2026-09-21 07:30:00 UTC
    const dateInVietnam = new Date('2026-09-21T07:30:00.000Z');
    const nowMs = dateInVietnam.getTime();

    const state: SRSState = {
      repetitions: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      lapses: 0,
    };

    // Good gives interval 3 days
    const result = schedule(state, 'good', nowMs, tz);
    expect(result.intervalDays).toBe(3);

    // Verify clock time in Vietnam
    const dueFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });

    const nowFormatted = dueFormatter.format(dateInVietnam);
    const dueFormatted = dueFormatter.format(new Date(result.dueAt));

    expect(dueFormatted).toBe(nowFormatted);
  });

  it('formatInterval formats days and minutes properly', () => {
    expect(formatInterval(0)).toBe('10m');
    expect(formatInterval(-1)).toBe('10m');
    expect(formatInterval(1)).toBe('1d');
    expect(formatInterval(7)).toBe('7d');
    expect(formatInterval(30)).toBe('30d');
  });
});
