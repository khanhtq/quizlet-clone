'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Clock,
  Target,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface DailyReviewCount {
  date: string;
  dayLabel: string;
  count: number;
}

interface UserStats {
  dueToday: number;
  streak: number;
  accuracy: number;
  totalReviewed: number;
  totalCards: number;
  totalSets: number;
  last30Days: DailyReviewCount[];
}

export default function StatsOverview() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<DailyReviewCount | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.stats) {
            setStats(data.stats);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 dark:bg-gray-800/60 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Calculate maximum reviews in a day for chart scaling
  const maxDayCount = Math.max(1, ...stats.last30Days.map((d) => d.count));

  return (
    <div className="space-y-4 my-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Streak */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 shrink-0">
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
              {stats.streak} <span className="text-xs font-semibold text-gray-500">ngày</span>
            </div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Chuỗi ngày học
            </div>
          </div>
        </div>

        {/* Due Today */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
              {stats.dueToday} <span className="text-xs font-semibold text-gray-500">từ</span>
            </div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Cần ôn hôm nay
            </div>
          </div>
        </div>

        {/* Accuracy */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
              {stats.accuracy}%
            </div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Độ chính xác
            </div>
          </div>
        </div>

        {/* Total Reviewed */}
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100">
              {stats.totalReviewed}
            </div>
            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              Tổng lượt ôn tập
            </div>
          </div>
        </div>
      </div>

      {/* 30-Day SVG / CSS Bar Chart */}
      <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Lịch sử ôn tập 30 ngày qua
            </h3>
          </div>

          {hoveredDay ? (
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
              {hoveredDay.dayLabel}: {hoveredDay.count} lượt ôn
            </span>
          ) : (
            <span className="text-xs text-gray-400">Rê chuột hoặc chạm vào cột để xem</span>
          )}
        </div>

        {/* Bar Chart Container */}
        <div className="pt-2">
          <div className="h-28 flex items-end gap-1 sm:gap-1.5 pt-2 border-b border-gray-100 dark:border-gray-800">
            {stats.last30Days.map((day) => {
              const heightPercent =
                day.count > 0 ? Math.max(12, Math.round((day.count / maxDayCount) * 100)) : 4;
              const isHovered = hoveredDay?.date === day.date;

              return (
                <div
                  key={day.date}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => setHoveredDay(day)}
                  className="flex-1 h-full flex items-end justify-center cursor-pointer group"
                >
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      day.count > 0
                        ? isHovered
                          ? 'bg-blue-600 scale-y-105 shadow'
                          : 'bg-blue-500/80 hover:bg-blue-600'
                        : isHovered
                          ? 'bg-gray-300 dark:bg-gray-600'
                          : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1.5">
            <span>{stats.last30Days[0]?.dayLabel}</span>
            <span>{stats.last30Days[14]?.dayLabel}</span>
            <span>Hôm nay ({stats.last30Days[29]?.dayLabel})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
