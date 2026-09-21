'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  GraduationCap,
  FileCheck2,
  Gamepad2,
  Edit,
  Copy,
  Trash2,
  Volume2,
  Plus,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
  starred: boolean;
}

interface SetDetails {
  id: string;
  title: string;
  description: string | null;
  cardCount: number;
  dueCount: number;
  lastStudiedAt: number | null;
  createdAt: number;
}

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id as string;

  const [set, setSet] = useState<SetDetails | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadSet() {
      try {
        const res = await fetch(`/api/sets/${setId}`);
        if (!res.ok) {
          throw new Error('Set not found');
        }
        const data = await res.json();
        if (!ignore) {
          setSet(data.set);
          setCards(data.cards || []);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError('Không thể tải thông tin học phần');
          setLoading(false);
        }
      }
    }

    if (setId) {
      loadSet();
    }
    return () => {
      ignore = true;
    };
  }, [setId]);

  function speak(term: string, audioUrl?: string | null) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/sets/${setId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        router.push(`/sets/${data.set.id}`);
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sets/${setId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-red-600 dark:text-red-400">{error || 'Không tìm thấy học phần'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    );
  }

  const studyModes = [
    {
      title: vi.study.flashcards,
      desc: 'Lật thẻ và ghi nhớ',
      href: `/sets/${setId}/flashcards`,
      icon: Layers,
      color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    },
    {
      title: vi.study.learn,
      desc: 'Trắc nghiệm và gõ từ',
      href: `/sets/${setId}/learn`,
      icon: GraduationCap,
      color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: vi.study.test,
      desc: 'Kiểm tra trình độ',
      href: `/sets/${setId}/test`,
      icon: FileCheck2,
      color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    },
    {
      title: vi.study.match,
      desc: 'Ghép cặp thuật ngữ',
      href: `/sets/${setId}/match`,
      icon: Gamepad2,
      color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back and Top Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            title={vi.sets.duplicate}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
          </button>
          <Link
            href={`/sets/${setId}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">{vi.common.edit}</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title={vi.common.delete}
            className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Header Info */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {set.title}
          </h1>
          {set.dueCount > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              {vi.sets.dueCount(set.dueCount)}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300">
              {cards.length > 0 ? 'Đã hoàn thành ôn' : 'Chưa có thẻ'}
            </span>
          )}
        </div>

        {set.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {set.description}
          </p>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-4">
          <span>{vi.sets.cardsCount(cards.length)}</span>
        </div>
      </div>

      {/* Study Modes Grid */}
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
          {vi.sets.studyModes}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {studyModes.map((mode) => {
            const Icon = mode.icon;
            const disabled = cards.length === 0;

            return (
              <Link
                key={mode.title}
                href={disabled ? '#' : mode.href}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between shadow-sm min-h-[110px] ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    : `${mode.color} hover:scale-[1.02] active:scale-[0.98] cursor-pointer`
                }`}
                onClick={(e) => {
                  if (disabled) {
                    e.preventDefault();
                    alert('Vui lòng thêm thẻ vào học phần trước khi bắt đầu học.');
                  }
                }}
              >
                <Icon className="w-6 h-6 mb-2" />
                <div>
                  <div className="font-semibold text-sm leading-snug">{mode.title}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{mode.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {vi.cards.termLabel} trong học phần ({cards.length})
          </h2>
          <Link
            href={`/sets/${setId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm hoặc sửa thẻ</span>
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {vi.sets.noCards}
            </p>
            <Link
              href={`/sets/${setId}/edit`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{vi.cards.addCard}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs text-gray-400 font-mono">#{idx + 1}</span>
                    <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                      {card.term}
                    </span>
                    {card.phonetic && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {card.phonetic}
                      </span>
                    )}
                    {card.partOfSpeech && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium italic">
                        {card.partOfSpeech}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                    {card.definition}
                  </div>
                  {card.example && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                      &ldquo;{card.example}&rdquo;
                    </div>
                  )}
                </div>

                <button
                  onClick={() => speak(card.term, card.audioUrl)}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Phát âm"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Xác nhận xóa học phần
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vi.sets.deleteConfirm}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px]"
              >
                {vi.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition min-h-[44px] disabled:opacity-50"
              >
                {isDeleting ? vi.common.loading : vi.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
