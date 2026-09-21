'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Layers,
  FileText,
  X,
  ArrowRight,
  Volume2,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface SetResult {
  id: string;
  title: string;
  description: string | null;
  createdAt: number;
}

interface CardResult {
  id: string;
  setId: string;
  setTitle: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sets, setSets] = useState<SetResult[]>([]);
  const [cards, setCards] = useState<CardResult[]>([]);

  // Debounce query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Fetch search results
  useEffect(() => {
    let ignore = false;
    async function doSearch() {
      if (!debouncedQuery) {
        setSets([]);
        setCards([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setSets(data.sets || []);
            setCards(data.cards || []);
          }
        }
      } catch {
        // Search error handling
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    doSearch();
    return () => {
      ignore = true;
    };
  }, [debouncedQuery]);

  const speak = (term: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const totalResults = sets.length + cards.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Header & Search Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {vi.nav.search}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Tìm kiếm học phần và từ vựng trong kho học liệu của bạn
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            <SearchIcon className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập tên học phần hoặc thuật ngữ cần tìm..."
            autoFocus
            className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty Query Initial State */}
      {!loading && !debouncedQuery && (
        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <SearchIcon className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            Bắt đầu tìm kiếm
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Gõ bất kỳ từ vựng tiếng Anh, nghĩa tiếng Việt hoặc tiêu đề học phần để tra cứu nhanh.
          </p>
        </div>
      )}

      {/* No Results Found */}
      {!loading && debouncedQuery && totalResults === 0 && (
        <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Không tìm thấy kết quả nào phù hợp với &ldquo;{debouncedQuery}&rdquo;
          </p>
          <p className="text-xs text-gray-400">
            Hãy thử tìm kiếm với từ khóa khác hoặc kiểm tra lại chính tả.
          </p>
        </div>
      )}

      {/* Results view */}
      {!loading && debouncedQuery && totalResults > 0 && (
        <div className="space-y-6">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Tìm thấy {totalResults} kết quả
          </div>

          {/* Sets Results */}
          {sets.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Học phần ({sets.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sets.map((set) => (
                  <Link
                    key={set.id}
                    href={`/sets/${set.id}`}
                    className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow transition flex flex-col justify-between min-h-[100px] cursor-pointer group"
                  >
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition">
                        {set.title}
                      </h3>
                      {set.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {set.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end text-blue-600 dark:text-blue-400 text-xs font-semibold gap-1">
                      <span>Xem học phần</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cards Results */}
          {cards.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Từ vựng & Định nghĩa ({cards.length})</span>
              </h2>

              <div className="space-y-2.5">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                          {card.term}
                        </span>
                        {card.phonetic && (
                          <span className="text-xs text-gray-400 font-mono">
                            {card.phonetic}
                          </span>
                        )}
                        {card.partOfSpeech && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium italic">
                            {card.partOfSpeech}
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-800 dark:text-gray-200">
                        {card.definition}
                      </div>

                      <div className="pt-1.5">
                        <Link
                          href={`/sets/${card.setId}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          <span>Thuộc học phần: {card.setTitle}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>

                    <button
                      onClick={() => speak(card.term)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                      title="Phát âm"
                      aria-label="Phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
