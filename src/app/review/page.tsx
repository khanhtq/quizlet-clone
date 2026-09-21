'use client';

import React, { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import { getPreviewIntervals, ScheduledIntervals, SRSState } from '@/lib/srs';
import FlashcardPlayer, {
  FlashcardItem,
} from '@/components/flashcards/FlashcardPlayer';

interface ReviewQueueCardItem extends FlashcardItem {
  setId: string;
  isNew: boolean;
  progress: SRSState;
}

interface QueueResponse {
  cards: ReviewQueueCardItem[];
  dueCount: number;
  newCount: number;
  totalDue: number;
  newRemainingToday: number;
}

interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  meaningLanguage: 'vi' | 'en' | 'both';
  newCardsPerDay: number;
  timezone: string;
  ttsAutoplay: boolean;
  defaultDirection: 'term' | 'definition' | 'mixed';
}

function ReviewSession() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setId = searchParams.get('setId') || undefined;

  const [loading, setLoading] = useState(true);
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [cardsStateMap, setCardsStateMap] = useState<Record<string, SRSState>>({});
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    meaningLanguage: 'both',
    newCardsPerDay: 20,
    timezone: 'UTC',
    ttsAutoplay: false,
    defaultDirection: 'term',
  });
  const [sessionFinished, setSessionFinished] = useState(false);

  // Load review queue and settings
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        const [queueRes, settingsRes] = await Promise.all([
          fetch(`/api/review/queue${setId ? `?setId=${encodeURIComponent(setId)}` : ''}`),
          fetch('/api/settings'),
        ]);

        if (queueRes.ok && !ignore) {
          const data: QueueResponse = await queueRes.json();
          setQueueData(data);

          // Build map of card states
          const map: Record<string, SRSState> = {};
          for (const c of data.cards) {
            map[c.id] = c.progress;
          }
          setCardsStateMap(map);
        }

        if (settingsRes.ok && !ignore) {
          const sData = await settingsRes.json();
          if (sData.settings) {
            setSettings(sData.settings);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [setId]);

  // Provide interval previews for any card in the queue
  const getIntervalPreviews = useCallback(
    (cardId: string): ScheduledIntervals => {
      const state = cardsStateMap[cardId] || {
        repetitions: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        lapses: 0,
      };
      return getPreviewIntervals(state, Date.now(), settings.timezone);
    },
    [cardsStateMap, settings.timezone]
  );

  // SRS rate handler
  const handleRate = useCallback(
    async (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
      try {
        const res = await fetch('/api/review/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            rating,
            elapsedMs: 1000,
            mode: 'review',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.progress) {
            setCardsStateMap((prev) => ({
              ...prev,
              [cardId]: {
                repetitions: data.progress.repetitions,
                easeFactor: data.progress.easeFactor,
                intervalDays: data.progress.intervalDays,
                lapses: data.progress.lapses,
                dueAt: data.progress.dueAt,
              },
            }));
          }
        }
      } catch {
        // Non-blocking
      }
    },
    []
  );

  // SRS undo handler
  const handleUndoSRS = useCallback(async (cardId: string) => {
    try {
      const res = await fetch('/api/review/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.restoredState) {
          setCardsStateMap((prev) => ({
            ...prev,
            [cardId]: data.restoredState,
          }));
        } else {
          // Card is new again
          setCardsStateMap((prev) => ({
            ...prev,
            [cardId]: {
              repetitions: 0,
              easeFactor: 2.5,
              intervalDays: 0,
              lapses: 0,
            },
          }));
        }
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const flashcardItems: FlashcardItem[] = useMemo(() => {
    if (!queueData) return [];
    return queueData.cards.map((c) => ({
      id: c.id,
      term: c.term,
      definition: c.definition,
      phonetic: c.phonetic,
      partOfSpeech: c.partOfSpeech,
      example: c.example,
      audioUrl: c.audioUrl,
    }));
  }, [queueData]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4 py-8">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // If no cards are due or scheduled for review
  if (!queueData || queueData.cards.length === 0 || sessionFinished) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4 space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {sessionFinished ? vi.review.completedTitle : vi.review.noCardsDue}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sessionFinished
              ? vi.review.completedDesc
              : vi.review.allCaughtUpDesc}
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{vi.review.returnHome}</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium transition min-h-[44px]"
          >
            <BookOpen className="w-4 h-4" />
            <span>{vi.review.exploreSets}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Header Status */}
      <div className="max-w-xl mx-auto flex items-center justify-between px-2 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-gray-200">
            {setId ? 'Ôn tập học phần' : vi.review.title}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {queueData.dueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium text-[11px]">
              {vi.review.dueCount(queueData.dueCount)}
            </span>
          )}
          {queueData.newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 font-medium text-[11px]">
              {vi.review.newCount(queueData.newCount)}
            </span>
          )}
        </div>
      </div>

      <FlashcardPlayer
        setId={setId || 'global_review'}
        setTitle={setId ? undefined : vi.review.title}
        cards={flashcardItems}
        scheduled={true}
        ttsAutoplay={settings.ttsAutoplay}
        getIntervalPreviews={getIntervalPreviews}
        onRate={handleRate}
        onUndoSRS={handleUndoSRS}
        onFinish={() => setSessionFinished(true)}
        onBack={() => router.push(setId ? `/sets/${setId}` : '/')}
      />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-xl mx-auto space-y-4 py-8">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-3xl animate-pulse" />
        </div>
      }
    >
      <ReviewSession />
    </Suspense>
  );
}
