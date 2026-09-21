'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Shuffle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Undo2,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

export interface FlashcardItem {
  id: string;
  term: string;
  definition: string;
  phonetic?: string | null;
  partOfSpeech?: string | null;
  example?: string | null;
  audioUrl?: string | null;
  starred?: boolean;
}


export interface ScheduledIntervals {
  again: string;
  hard: string;
  good: string;
  easy: string;
}

interface FlashcardPlayerProps {
  setId: string;
  setTitle?: string;
  cards: FlashcardItem[];
  scheduled?: boolean;
  ttsAutoplay?: boolean;
  getIntervalPreviews?: (cardId: string) => ScheduledIntervals;
  onRate?: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => Promise<void>;
  onUndoSRS?: (cardId: string) => Promise<void>;
  onFinish?: () => void;
  onBack?: () => void;
}

interface SessionHistoryItem {
  index: number;
  cardId: string;
  rating: 'again' | 'hard' | 'good' | 'easy';
}

export default function FlashcardPlayer({
  setId,
  setTitle,
  cards: initialCards,
  scheduled = false,
  ttsAutoplay = false,
  getIntervalPreviews,
  onRate,
  onUndoSRS,
  onFinish,
  onBack,
}: FlashcardPlayerProps) {
  // Ordered or shuffled deck
  const [deck, setDeck] = useState<FlashcardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [direction, setDirection] = useState<'term' | 'definition' | 'mixed'>(() => {
    if (typeof window !== 'undefined' && setId) {
      const saved = localStorage.getItem(`quizlet_direction_${setId}`);
      if (saved === 'term' || saved === 'definition' || saved === 'mixed') {
        return saved;
      }
    }
    return 'term';
  });
  const [sessionStartTime] = useState<number>(() => Date.now());
  const [cardStartTime, setCardStartTime] = useState<number>(() => Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(1);

  // Session stats
  const [ratingsCount, setRatingsCount] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [missedCards, setMissedCards] = useState<FlashcardItem[]>([]);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // In-session Again re-queueing for scheduled mode
  const [againQueue, setAgainQueue] = useState<{ card: FlashcardItem; reQueueAt: number }[]>([]);

  // Adjust state during render when initialCards prop changes (React recommended pattern)
  const [prevCards, setPrevCards] = useState<FlashcardItem[]>(initialCards);
  if (prevCards !== initialCards) {
    setPrevCards(initialCards);
    setDeck(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setAgainQueue([]);
  }

  // Swipe gesture state
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Update direction and persist
  function changeDirection(newDir: 'term' | 'definition' | 'mixed') {
    setDirection(newDir);
    if (typeof window !== 'undefined' && setId) {
      localStorage.setItem(`quizlet_direction_${setId}`, newDir);
    }
  }

  // Shuffle toggle
  function toggleShuffle() {
    if (isShuffled) {
      setDeck(initialCards);
      setIsShuffled(false);
    } else {
      const shuffled = [...deck].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
      setIsShuffled(true);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  // Text to Speech
  const speakTerm = useCallback((text: string, fallbackAudio?: string | null) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else if (fallbackAudio) {
      const audio = new Audio(fallbackAudio);
      audio.play().catch(() => {});
    }
  }, []);

  const currentCard = deck[currentIndex];

  // Auto-play TTS if enabled in settings
  useEffect(() => {
    if (!ttsAutoplay || !currentCard || sessionComplete) return;
    const isEnglishShowing =
      (direction === 'term' && !isFlipped) ||
      (direction === 'definition' && isFlipped) ||
      (direction === 'mixed');
    if (isEnglishShowing) {
      speakTerm(currentCard.term, currentCard.audioUrl);
    }
  }, [currentIndex, isFlipped, ttsAutoplay, currentCard, direction, speakTerm, sessionComplete]);

  // Rate card handler
  const handleRate = useCallback(
    async (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!currentCard) return;

      const elapsedMs = Date.now() - cardStartTime;
      const cardId = currentCard.id;

      // Optimistic rating state update
      setRatingsCount((prev) => ({
        ...prev,
        [rating]: prev[rating] + 1,
      }));

      if (rating === 'again' || rating === 'hard') {
        setMissedCards((prev) =>
          prev.some((c) => c.id === cardId) ? prev : [...prev, currentCard]
        );
      }

      setHistory((prev) => [...prev, { index: currentIndex, cardId, rating }]);

      // Persist review log / SRS update via API
      try {
        if (onRate) {
          await onRate(cardId, rating);
        } else {
          void fetch('/api/review/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cardId,
              rating,
              mode: scheduled ? 'review' : 'flashcards',
              elapsedMs,
            }),
          });
        }
      } catch {
        setToast('Không thể đồng bộ kết quả, vui lòng kiểm tra kết nối.');
      }

      // In scheduled mode: queue 'again' cards to be reviewed again in the session
      let currentAgainQueue = againQueue;
      if (scheduled && rating === 'again') {
        currentAgainQueue = [
          ...againQueue,
          {
            card: currentCard,
            reQueueAt: Date.now() + 10 * 60 * 1000,
          },
        ];
      }

      // Check if any again cards should be re-inserted into deck
      let nextDeck = deck;
      if (scheduled && currentAgainQueue.length > 0) {
        const now = Date.now();
        const isQueueAboutToEmpty = currentIndex + 1 >= deck.length;

        if (isQueueAboutToEmpty) {
          // Re-queue immediately if the queue would otherwise empty
          const cardsToRequeue = currentAgainQueue.map((item) => item.card);
          currentAgainQueue = [];
          nextDeck = [...deck, ...cardsToRequeue];
          setDeck(nextDeck);
        } else {
          // Re-queue cards that have waited ~10 minutes
          const readyCards: FlashcardItem[] = [];
          const pendingAgain: { card: FlashcardItem; reQueueAt: number }[] = [];
          for (const item of currentAgainQueue) {
            if (now >= item.reQueueAt) {
              readyCards.push(item.card);
            } else {
              pendingAgain.push(item);
            }
          }
          if (readyCards.length > 0) {
            currentAgainQueue = pendingAgain;
            nextDeck = [...deck, ...readyCards];
            setDeck(nextDeck);
          }
        }
      }
      setAgainQueue(currentAgainQueue);

      // Transition to next card or complete
      if (currentIndex + 1 < nextDeck.length) {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
        setCardStartTime(Date.now());
      } else {
        setElapsedMinutes(
          Math.max(1, Math.round((Date.now() - sessionStartTime) / 60000))
        );
        setSessionComplete(true);
        if (onFinish) onFinish();
      }
    },
    [
      currentCard,
      cardStartTime,
      currentIndex,
      deck,
      againQueue,
      scheduled,
      onRate,
      onFinish,
      sessionStartTime,
    ]
  );

  // Undo last rating
  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;
    const lastItem = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));

    // Revert count
    setRatingsCount((prev) => ({
      ...prev,
      [lastItem.rating]: Math.max(0, prev[lastItem.rating] - 1),
    }));

    if (lastItem.rating === 'again' || lastItem.rating === 'hard') {
      setMissedCards((prev) => prev.filter((c) => c.id !== lastItem.cardId));
    }

    // Revert againQueue if it was scheduled and again
    if (scheduled && lastItem.rating === 'again') {
      setAgainQueue((prev) => prev.filter((item) => item.card.id !== lastItem.cardId));
    }

    // Call undo API
    try {
      if (onUndoSRS) {
        await onUndoSRS(lastItem.cardId);
      } else {
        void fetch('/api/review/undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: lastItem.cardId }),
        });
      }
    } catch {
      // Non-blocking
    }

    // Move back
    setCurrentIndex(lastItem.index);
    setIsFlipped(true);
    setSessionComplete(false);
  }, [history, onUndoSRS, scheduled]);

  // Flip card
  const toggleFlip = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (sessionComplete) return;
      // Do not capture if typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        toggleFlip();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (currentCard) {
          speakTerm(currentCard.term, currentCard.audioUrl);
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndo();
      } else if (isFlipped) {
        if (!scheduled) {
          if (e.key === '1') {
            e.preventDefault();
            handleRate('again');
          } else if (e.key === '2') {
            e.preventDefault();
            handleRate('good');
          }
        } else {
          if (e.key === '1') {
            e.preventDefault();
            handleRate('again');
          } else if (e.key === '2') {
            e.preventDefault();
            handleRate('hard');
          } else if (e.key === '3') {
            e.preventDefault();
            handleRate('good');
          } else if (e.key === '4') {
            e.preventDefault();
            handleRate('easy');
          }
        }
      } else {
        // Free mode navigation
        if (!scheduled) {
          if (e.key === 'ArrowLeft' && currentIndex > 0) {
            e.preventDefault();
            setCurrentIndex((i) => i - 1);
            setIsFlipped(false);
          } else if (e.key === 'ArrowRight' && currentIndex < deck.length - 1) {
            e.preventDefault();
            setCurrentIndex((i) => i + 1);
            setIsFlipped(false);
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    sessionComplete,
    isFlipped,
    scheduled,
    currentCard,
    currentIndex,
    deck.length,
    toggleFlip,
    speakTerm,
    handleRate,
    handleUndo,
  ]);

  // Pointer / Touch Swipe Events
  function handlePointerDown(e: React.PointerEvent) {
    touchStartXRef.current = e.clientX;
    setIsSwiping(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isSwiping) return;
    const delta = e.clientX - touchStartXRef.current;
    setTouchDeltaX(delta);
  }

  function handlePointerUp() {
    if (!isSwiping) return;
    setIsSwiping(false);

    const threshold = (window.innerWidth || 390) * 0.3;
    if (touchDeltaX > threshold) {
      // Swipe Right -> Good (Đã nhớ)
      if (isFlipped) {
        handleRate('good');
      } else {
        setIsFlipped(true);
      }
    } else if (touchDeltaX < -threshold) {
      // Swipe Left -> Again (Chưa nhớ)
      if (isFlipped) {
        handleRate('again');
      } else {
        setIsFlipped(true);
      }
    }

    setTouchDeltaX(0);
  }

  function handlePointerCancel() {
    setIsSwiping(false);
    setTouchDeltaX(0);
  }

  // Restart session with all cards
  function restartAll() {
    setDeck(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setRatingsCount({ again: 0, hard: 0, good: 0, easy: 0 });
    setMissedCards([]);
    setHistory([]);
  }

  // Restart with missed cards only
  function restartMissed() {
    if (missedCards.length === 0) return;
    setDeck(missedCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionComplete(false);
    setRatingsCount({ again: 0, hard: 0, good: 0, easy: 0 });
    setMissedCards([]);
    setHistory([]);
  }

  if (deck.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 max-w-md mx-auto">
        <p className="text-gray-500 mb-4">{vi.sets.noCards}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium"
          >
            Quay lại
          </button>
        )}
      </div>
    );
  }

  // Session Summary Screen
  if (sessionComplete) {
    const totalRated = ratingsCount.good + ratingsCount.again + ratingsCount.hard + ratingsCount.easy;
    const accuracy = totalRated > 0
      ? Math.round(((ratingsCount.good + ratingsCount.easy) / totalRated) * 100)
      : 100;

    return (
      <div className="max-w-lg mx-auto p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {vi.study.congratulations}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Thời gian học: {elapsedMinutes} phút • Độ chính xác: {accuracy}%
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200/60 dark:border-green-900/40 text-center">
            <div className="text-2xl font-black text-green-600 dark:text-green-400">
              {ratingsCount.good + ratingsCount.easy}
            </div>
            <div className="text-xs font-semibold text-green-800 dark:text-green-300 mt-0.5">
              Đã thuộc
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-center">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {ratingsCount.again + ratingsCount.hard}
            </div>
            <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
              Cần ôn lại
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          {missedCards.length > 0 && (
            <button
              onClick={restartMissed}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition min-h-[44px] cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{vi.study.studyAgain} ({missedCards.length})</span>
            </button>
          )}

          <button
            onClick={restartAll}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition min-h-[44px] cursor-pointer shadow-sm active:scale-98"
          >
            Học lại từ đầu ({deck.length})
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition min-h-[44px]"
            >
              Quay về học phần
            </button>
          )}
        </div>
      </div>
    );
  }

  // Calculate face content based on direction
  const isTermFront =
    direction === 'term' ||
    (direction === 'mixed' && currentIndex % 2 === 0);

  const frontText = isTermFront ? currentCard.term : currentCard.definition;
  const backText = isTermFront ? currentCard.definition : currentCard.term;

  // Swipe tilt angle and color feedback
  const tiltAngle = touchDeltaX * 0.04;
  const swipeColorBg =
    touchDeltaX > 50
      ? 'rgba(34, 197, 94, 0.08)' // Green tint
      : touchDeltaX < -50
      ? 'rgba(239, 68, 68, 0.08)' // Red tint
      : 'transparent';

  const previewIntervals = scheduled && getIntervalPreviews
    ? getIntervalPreviews(currentCard.id)
    : { again: '10p', hard: '1 ngày', good: '3 ngày', easy: '5 ngày' };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-xl mx-auto select-none">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur">
          {toast}
        </div>
      )}

      {/* Top Toolbar: Progress, Actions, Direction */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label={vi.common.back}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {setTitle && (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[120px] sm:max-w-[180px] hidden xs:inline">
              {setTitle}
            </span>
          )}
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
            {currentIndex + 1} / {deck.length}
          </div>
        </div>

        {/* Direction & Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const nextDir =
                direction === 'term'
                  ? 'definition'
                  : direction === 'definition'
                  ? 'mixed'
                  : 'term';
              changeDirection(nextDir);
            }}
            title="Đổi chiều thẻ"
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[38px] cursor-pointer"
          >
            {direction === 'term'
              ? 'Anh ➔ Việt'
              : direction === 'definition'
              ? 'Việt ➔ Anh'
              : 'Trộn lẫn'}
          </button>

          <button
            onClick={toggleShuffle}
            title="Xáo trộn thẻ"
            className={`p-2 rounded-lg border transition min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer ${
              isShuffled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {history.length > 0 && (
            <button
              onClick={handleUndo}
              title={vi.study.undo}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full mb-4 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* 3D Flashcard Container with Swipe Gesture */}
      <div
        className="flex-1 flex flex-col justify-center perspective-1000 my-2"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          ref={cardRef}
          onClick={toggleFlip}
          style={{
            transform: `translateX(${touchDeltaX}px) rotate(${tiltAngle}deg)`,
            backgroundColor: swipeColorBg,
          }}
          className={`relative w-full h-[360px] sm:h-[420px] rounded-3xl cursor-pointer shadow-lg transition-transform duration-300 transform-style-3d select-none border border-gray-200/90 dark:border-gray-800 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT FACE */}
          <div className="absolute inset-0 w-full h-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 backface-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{isTermFront ? 'Thuật ngữ (EN)' : 'Định nghĩa (VI)'}</span>
              <span className="text-[11px] opacity-75">{vi.study.flipHint}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                {frontText}
              </h3>
              {isTermFront && currentCard.phonetic && (
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400 mt-2">
                  {currentCard.phonetic}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakTerm(currentCard.term, currentCard.audioUrl);
                }}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title={vi.study.audio}
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <div className="text-xs text-gray-400">Chạm để lật</div>
            </div>
          </div>

          {/* BACK FACE */}
          <div className="absolute inset-0 w-full h-full p-6 sm:p-8 rounded-3xl bg-white dark:bg-gray-900 backface-hidden rotate-y-180 flex flex-col justify-between border-2 border-blue-500/20">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{isTermFront ? 'Định nghĩa (VI)' : 'Thuật ngữ (EN)'}</span>
              {currentCard.partOfSpeech && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 italic">
                  {currentCard.partOfSpeech}
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-3">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {backText}
              </h3>

              {!isTermFront && currentCard.phonetic && (
                <p className="text-sm font-mono text-gray-500 dark:text-gray-400">
                  {currentCard.phonetic}
                </p>
              )}

              {currentCard.example && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 italic max-w-sm">
                  &ldquo;{currentCard.example}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakTerm(currentCard.term, currentCard.audioUrl);
                }}
                className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title={vi.study.audio}
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <div className="text-xs text-gray-400">Chạm để lật lại</div>
            </div>
          </div>
        </div>
      </div>

      {/* Swipe Hints for Mobile */}
      <div className="flex items-center justify-between px-3 py-1 text-[11px] text-gray-400 sm:hidden">
        <span>👈 Vuốt trái: Chưa nhớ</span>
        <span>Vuốt phải: Đã nhớ 👉</span>
      </div>

      {/* Lower Half Controls: Rating buttons (after flip) or Navigation */}
      <div className="mt-4 pt-2">
        {isFlipped ? (
          !scheduled ? (
            /* Free Mode: 2 rating buttons */
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRate('again')}
                className="py-3.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-semibold text-sm transition min-h-[52px] cursor-pointer shadow-sm active:scale-98 flex flex-col items-center justify-center"
              >
                <span className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  <span>{vi.study.again}</span>
                </span>
                <span className="text-[10px] opacity-75 font-normal">Phím 1</span>
              </button>

              <button
                onClick={() => handleRate('good')}
                className="py-3.5 px-4 rounded-2xl bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-300 font-semibold text-sm transition min-h-[52px] cursor-pointer shadow-sm active:scale-98 flex flex-col items-center justify-center"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{vi.study.good}</span>
                </span>
                <span className="text-[10px] opacity-75 font-normal">Phím 2</span>
              </button>
            </div>
          ) : (
            /* Scheduled Mode: 4 SRS rating buttons */
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleRate('again')}
                className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 font-semibold text-xs transition min-h-[52px] flex flex-col items-center justify-center"
              >
                <span>{vi.study.again}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  {previewIntervals.again} (1)
                </span>
              </button>

              <button
                onClick={() => handleRate('hard')}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 font-semibold text-xs transition min-h-[52px] flex flex-col items-center justify-center"
              >
                <span>{vi.study.hard}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  {previewIntervals.hard} (2)
                </span>
              </button>

              <button
                onClick={() => handleRate('good')}
                className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs transition min-h-[52px] flex flex-col items-center justify-center"
              >
                <span>{vi.study.good}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  {previewIntervals.good} (3)
                </span>
              </button>

              <button
                onClick={() => handleRate('easy')}
                className="p-2.5 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-300 font-semibold text-xs transition min-h-[52px] flex flex-col items-center justify-center"
              >
                <span>{vi.study.easy}</span>
                <span className="text-[10px] opacity-75 font-normal mt-0.5">
                  {previewIntervals.easy} (4)
                </span>
              </button>
            </div>
          )
        ) : (
          /* Card Not Flipped: Flip button and Prev/Next (free mode) */
          <div className="flex items-center gap-2">
            {!scheduled && (
              <button
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex((i) => i - 1);
                    setIsFlipped(false);
                  }
                }}
                disabled={currentIndex === 0}
                className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition min-h-[52px] min-w-[52px] flex items-center justify-center cursor-pointer"
                title="Thẻ trước"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleFlip}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition min-h-[52px] cursor-pointer shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              <span>Lật thẻ</span>
              <span className="text-xs opacity-75 hidden sm:inline">(Phím Space)</span>
            </button>

            {!scheduled && (
              <button
                onClick={() => {
                  if (currentIndex < deck.length - 1) {
                    setCurrentIndex((i) => i + 1);
                    setIsFlipped(false);
                  }
                }}
                disabled={currentIndex === deck.length - 1}
                className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition min-h-[52px] min-w-[52px] flex items-center justify-center cursor-pointer"
                title="Thẻ tiếp theo"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
