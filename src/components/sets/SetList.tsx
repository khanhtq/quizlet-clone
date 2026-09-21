'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, BookOpen, ArrowRight } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface SetItem {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  dueCount: number;
  lastStudiedAt: number | null;
  updatedAt: number;
}

export default function SetList() {
  const [sets, setSets] = useState<SetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch('/api/sets')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setSets(data.sets || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setError(vi.common.error);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  function handleRefresh() {
    setLoading(true);
    setError(null);
    fetch('/api/sets')
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setSets(data.sets || []);
        setLoading(false);
      })
      .catch(() => {
        setError(vi.common.error);
        setLoading(false);
      });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={handleRefresh}
          className="font-medium underline cursor-pointer"
        >
          {vi.common.refresh}
        </button>
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold mb-1">{vi.sets.emptySets}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          Tạo học phần đầu tiên để bắt đầu học và ghi nhớ từ vựng tiếng Anh theo phương pháp Spaced Repetition.
        </p>
        <Link
          href="/sets/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition min-h-[44px] cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{vi.sets.createNewSet}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {vi.nav.library} ({sets.length})
        </h2>
        <Link
          href="/sets/create"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition min-h-[44px] cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{vi.sets.createTitle}</span>
        </Link>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        {sets.map((set) => (
          <Link
            key={set.id}
            href={`/sets/${set.id}`}
            className="group block p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition shadow-sm hover:shadow active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                {set.title}
              </h3>
              {set.dueCount > 0 ? (
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  {vi.sets.dueCount(set.dueCount)}
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300">
                  {set.cardCount > 0 ? 'Đã thuộc' : 'Trống'}
                </span>
              )}
            </div>

            {set.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                {set.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/60">
              <span>{vi.sets.cardsCount(set.cardCount)}</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-blue-600 dark:text-blue-400 font-medium">
                <span>Xem chi tiết</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
