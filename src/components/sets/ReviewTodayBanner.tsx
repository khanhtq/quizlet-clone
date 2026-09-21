'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

export default function ReviewTodayBanner() {
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/sets');
        if (res.ok) {
          const data = await res.json();
          const totalDue = (data.sets || []).reduce(
            (acc: number, s: { dueCount: number }) => acc + (s.dueCount || 0),
            0
          );
          setDueCount(totalDue);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse mb-6" />;
  }

  if (dueCount === null || dueCount === 0) {
    return (
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-semibold text-emerald-900 dark:text-emerald-200 text-base">
            {vi.sets.allCaughtUp}
          </h2>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
            Bạn đã hoàn thành tất cả các thẻ đến hạn. Hãy tiếp tục duy trì thói quen học tập mỗi ngày nhé!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Spaced Repetition</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Hôm nay có {dueCount} từ vựng cần ôn tập
        </h2>
        <p className="text-xs sm:text-sm text-blue-100 max-w-md">
          Ôn tập đúng thời điểm giúp củng cố trí nhớ dài hạn và tiết kiệm 80% thời gian học.
        </p>
      </div>

      <Link
        href="/review"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-semibold text-sm transition min-h-[44px] cursor-pointer shadow active:scale-95 shrink-0"
      >
        <span>{vi.sets.startReview}</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
