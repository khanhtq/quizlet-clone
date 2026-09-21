'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  RotateCcw,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import {
  checkTypedAnswer,
  generateMultipleChoiceOptions,
  CheckAnswerResult,
} from '@/lib/study-engine';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
}

interface SetDetails {
  id: string;
  title: string;
}

type Stage = 'new' | 'familiar' | 'mastered';

interface FeedbackState {
  answered: boolean;
  isCorrect: boolean;
  isClose: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export default function LearnPage() {
  const params = useParams();
  const setId = params.id as string;

  const [set, setSet] = useState<SetDetails | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Learning progression state
  const [cardStages, setCardStages] = useState<Record<string, Stage>>({});
  const [activeQueue, setActiveQueue] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Question interaction state
  const [typedInput, setTypedInput] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const questionStartTimeRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch set and cards
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/sets/${setId}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (!ignore) {
          setSet(data.set);
          const rawCards: CardItem[] = data.cards || [];
          setCards(rawCards);

          // Initialize card stages
          const initialStages: Record<string, Stage> = {};
          const initialQueue: string[] = [];
          for (const card of rawCards) {
            initialStages[card.id] = 'new';
            initialQueue.push(card.id);
          }
          setCardStages(initialStages);
          setActiveQueue(initialQueue);
          questionStartTimeRef.current = Date.now();
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError('Không thể tải thông tin học phần');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [setId]);

  const currentCardId = activeQueue[currentIdx];
  const currentCard = cards.find((c) => c.id === currentCardId);
  const currentStage = currentCardId ? cardStages[currentCardId] || 'new' : 'new';

  // Track card changes during render without useEffect setState
  const [prevCardId, setPrevCardId] = useState<string | null>(null);
  if (currentCardId && currentCardId !== prevCardId) {
    setPrevCardId(currentCardId);
    setFeedback(null);
    setTypedInput('');
  }

  // Generate options memoized per currentCard
  const multipleChoiceOptions = useMemo(() => {
    if (!currentCard || currentStage !== 'new') return [];
    return generateMultipleChoiceOptions(currentCard, cards).options;
  }, [currentCard, cards, currentStage]);

  // Focus input when stage changes to familiar
  useEffect(() => {
    if (currentStage !== 'new' && !feedback) {
      inputRef.current?.focus();
    }
  }, [currentCardId, currentStage, feedback]);

  const speak = useCallback(
    (term: string, audioUrl?: string | null) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(term);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } else if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {});
      }
    },
    []
  );

  const logReview = useCallback(
    async (cardId: string, rating: 'again' | 'good') => {
      const elapsedMs =
        questionStartTimeRef.current > 0 ? Date.now() - questionStartTimeRef.current : 1000;
      try {
        await fetch('/api/review/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId,
            rating,
            mode: 'learn',
            elapsedMs,
          }),
        });
      } catch {
        // Non-blocking log failure
      }
    },
    []
  );


  // Handle multiple choice answer selection
  const handleSelectOption = (selectedOption: string) => {
    if (feedback || !currentCard) return;

    const isCorrect = selectedOption.trim() === currentCard.definition.trim();

    setFeedback({
      answered: true,
      isCorrect,
      isClose: false,
      userAnswer: selectedOption,
      correctAnswer: currentCard.definition,
    });

    logReview(currentCard.id, isCorrect ? 'good' : 'again');
  };

  // Handle typed answer submission
  const handleCheckTypedAnswer = () => {
    if (feedback || !currentCard) return;

    const result: CheckAnswerResult = checkTypedAnswer(typedInput, currentCard.definition);

    setFeedback({
      answered: true,
      isCorrect: result.isCorrect,
      isClose: result.isClose,
      userAnswer: typedInput,
      correctAnswer: currentCard.definition,
    });

    logReview(currentCard.id, result.isCorrect ? 'good' : 'again');
  };

  // Override close match as fully correct
  const handleOverrideCorrect = () => {
    if (!feedback || !currentCard) return;
    setFeedback({
      ...feedback,
      isCorrect: true,
      isClose: false,
    });
  };

  // Advance to next card in session
  const handleContinue = () => {
    if (!feedback || !currentCard) return;

    const isCardCorrect = feedback.isCorrect;
    const cardId = currentCard.id;

    if (isCardCorrect) {
      if (currentStage === 'new') {
        // Promoted to 'familiar'
        setCardStages((prev) => ({ ...prev, [cardId]: 'familiar' }));
        // Keep in queue or cycle
        // Move card to end of activeQueue to be tested at 'familiar' level
        setActiveQueue((prev) => {
          const next = [...prev];
          next.splice(currentIdx, 1);
          next.push(cardId);
          return next;
        });
      } else if (currentStage === 'familiar') {
        // Promoted to 'mastered'! Remove from active queue
        setCardStages((prev) => ({ ...prev, [cardId]: 'mastered' }));
        setActiveQueue((prev) => {
          const next = [...prev];
          next.splice(currentIdx, 1);
          return next;
        });
      }
    } else {
      // Incorrect answer: demote
      if (currentStage === 'familiar') {
        setCardStages((prev) => ({ ...prev, [cardId]: 'new' }));
      }
      // Re-queue at the end
      setActiveQueue((prev) => {
        const next = [...prev];
        const [moved] = next.splice(currentIdx, 1);
        next.push(moved);
        return next;
      });
    }

    setFeedback(null);
    questionStartTimeRef.current = Date.now();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack if user is typing in an input and hasn't submitted yet
      if (feedback) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleContinue();
        }
        return;
      }

      if (currentStage === 'new' && !feedback) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx >= 0 && idx < multipleChoiceOptions.length) {
            e.preventDefault();
            handleSelectOption(multipleChoiceOptions[idx]);
          }
        }
      }

      if (e.key === 's' || e.key === 'S') {
        if (document.activeElement?.tagName !== 'INPUT' && currentCard) {
          e.preventDefault();
          speak(currentCard.term, currentCard.audioUrl);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleRestart = () => {
    const initialStages: Record<string, Stage> = {};
    const initialQueue: string[] = [];
    for (const card of cards) {
      initialStages[card.id] = 'new';
      initialQueue.push(card.id);
    }
    setCardStages(initialStages);
    setActiveQueue(initialQueue);
    setCurrentIdx(0);
    setFeedback(null);
    questionStartTimeRef.current = Date.now();
  };


  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
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

  if (cards.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <p className="text-gray-600 dark:text-gray-400">{vi.sets.noCards}</p>
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{vi.learn.backToSet}</span>
        </Link>
      </div>
    );
  }

  // Count stages
  const masteredCount = Object.values(cardStages).filter((s) => s === 'mastered').length;
  const familiarCount = Object.values(cardStages).filter((s) => s === 'familiar').length;
  const newCount = Object.values(cardStages).filter((s) => s === 'new').length;
  const totalCount = cards.length;

  // Session Completed state
  const isFinished = activeQueue.length === 0;

  if (isFinished) {
    return (
      <div className="max-w-lg mx-auto py-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {vi.learn.congratsTitle}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            {vi.learn.congratsDesc}
          </p>
        </div>

        {/* Stats summary */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {masteredCount}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {vi.learn.stageMastered}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {vi.learn.stageFamiliar}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">0</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              {vi.learn.stageNew}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={handleRestart}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm min-h-[44px] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{vi.learn.restartLearn}</span>
          </button>
          <Link
            href={`/sets/${setId}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition min-h-[44px]"
          >
            <span>{vi.learn.backToSet}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Top Header & Stage Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/sets/${setId}`}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="text-center flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
              {set.title}
            </h1>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {vi.learn.title} • {activeQueue.length} thẻ cần học
            </div>
          </div>

          <div className="w-10" />
        </div>

        {/* Progress Breakdown */}
        <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-500 dark:text-gray-400">
              {vi.learn.stageNew}: {newCount}
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {vi.learn.stageFamiliar}: {familiarCount}
            </span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {vi.learn.stageMastered}: {masteredCount} / {totalCount}
            </span>
          </div>

          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 transition-all duration-300"
              style={{ width: `${(masteredCount / totalCount) * 100}%` }}
            />
            <div
              className="bg-blue-500 transition-all duration-300"
              style={{ width: `${(familiarCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Question Card */}
      {currentCard && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Question Stage Badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                currentStage === 'new'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
              }`}
            >
              {currentStage === 'new' ? (
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Cấp 1: {vi.learn.stageNew} (Trắc nghiệm)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cấp 2: {vi.learn.stageFamiliar} (Gõ từ)</span>
                </>
              )}
            </span>

            <button
              onClick={() => speak(currentCard.term, currentCard.audioUrl)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Phát âm (phím S)"
              aria-label="Phát âm"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Term Display */}
          <div className="text-center py-4 space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {currentCard.term}
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              {currentCard.phonetic && <span className="font-mono">{currentCard.phonetic}</span>}
              {currentCard.partOfSpeech && (
                <span className="italic font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                  {currentCard.partOfSpeech}
                </span>
              )}
            </div>
            {currentCard.example && (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic max-w-md mx-auto pt-1">
                &ldquo;{currentCard.example}&rdquo;
              </p>
            )}
          </div>

          {/* Interactive Question Area */}
          {currentStage === 'new' ? (
            /* STAGE 1: MULTIPLE CHOICE */
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {vi.learn.selectCorrectDefinition}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {multipleChoiceOptions.map((opt, idx) => {
                  let btnStyle =
                    'border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-gray-800 dark:text-gray-200';

                  if (feedback) {
                    if (opt.trim() === currentCard.definition.trim()) {
                      btnStyle =
                        'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-semibold';
                    } else if (opt === feedback.userAnswer && !feedback.isCorrect) {
                      btnStyle =
                        'border-red-500 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-semibold';
                    } else {
                      btnStyle = 'opacity-40 border-gray-200 dark:border-gray-800';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(opt)}
                      disabled={feedback !== null}
                      className={`p-4 rounded-xl border text-left transition relative flex items-start gap-3 min-h-[56px] cursor-pointer disabled:cursor-default ${btnStyle}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STAGE 2: TYPED ANSWER */
            <div className="space-y-4">
              <label
                htmlFor="typed-answer-input"
                className="block text-xs font-semibold text-gray-500 dark:text-gray-400"
              >
                {vi.learn.typeTheAnswer}
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!feedback) {
                    handleCheckTypedAnswer();
                  } else {
                    handleContinue();
                  }
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    id="typed-answer-input"
                    type="text"
                    value={typedInput}
                    onChange={(e) => setTypedInput(e.target.value)}
                    disabled={feedback !== null}
                    placeholder={vi.learn.typePlaceholder}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                  />
                  {!feedback && (
                    <button
                      type="submit"
                      disabled={!typedInput.trim()}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50 min-h-[44px] cursor-pointer"
                    >
                      {vi.learn.checkButton}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Feedback Bottom Banner */}
          {feedback && (
            <div
              className={`p-5 rounded-xl border animate-in fade-in duration-200 space-y-3 ${
                feedback.isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-100'
                  : feedback.isClose
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-100'
                    : 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800/80 text-red-900 dark:text-red-100'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>{vi.learn.correctFeedback}</span>
                  </>
                ) : feedback.isClose ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span>{vi.learn.closeFeedback}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span>{vi.learn.wrongFeedback}</span>
                  </>
                )}
              </div>

              {/* Show correct answer if wrong or close */}
              {(!feedback.isCorrect || feedback.isClose) && (
                <div className="text-sm space-y-1.5 pt-1 border-t border-black/10 dark:border-white/10">
                  <div>
                    <span className="font-semibold">{vi.learn.correctAnswer}: </span>
                    <span className="font-bold underline">{feedback.correctAnswer}</span>
                  </div>
                  {feedback.userAnswer && (
                    <div className="text-xs opacity-90">
                      <span>{vi.learn.yourAnswer}: </span>
                      <span>{feedback.userAnswer}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {feedback.isClose && !feedback.isCorrect && (
                  <button
                    onClick={handleOverrideCorrect}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition min-h-[44px] cursor-pointer"
                  >
                    {vi.learn.overrideCorrect}
                  </button>
                )}

                <button
                  onClick={handleContinue}
                  autoFocus
                  className="px-6 py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition min-h-[44px] cursor-pointer flex items-center gap-2"
                >
                  <span>{vi.learn.continueButton}</span>
                  <span className="text-xs opacity-75 font-mono">(Enter)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
