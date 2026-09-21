'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import FlashcardPlayer, { FlashcardItem } from '@/components/flashcards/FlashcardPlayer';
import { vi } from '@/lib/i18n/vi';

export default function FlashcardsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const setId = params.id as string;
  const isStarredOnly = searchParams.get('starred') === 'true';

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [setTitle, setSetTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch(`/api/sets/${setId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!ignore) {
          setSetTitle(data.set?.title || '');
          let rawCards: FlashcardItem[] = data.cards || [];
          if (isStarredOnly) {
            rawCards = rawCards.filter((c) => c.starred);
          }
          setCards(rawCards);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError(vi.common.error);
          setLoading(false);
        }
      }
    }
    if (setId) loadData();
    return () => {
      ignore = true;
    };
  }, [setId, isStarredOnly]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 pt-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-96 w-full bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          {error || (isStarredOnly ? 'Học phần này chưa có thẻ nào được gắn sao.' : vi.sets.noCards)}
        </p>
        <button
          onClick={() => router.push(`/sets/${setId}`)}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium text-sm"
        >
          {vi.common.back}
        </button>
      </div>
    );
  }

  return (
    <FlashcardPlayer
      setId={setId}
      setTitle={isStarredOnly ? `${setTitle} (Thẻ gắn sao)` : setTitle}
      cards={cards}
      scheduled={false}
      onBack={() => router.push(`/sets/${setId}`)}
    />
  );
}
