'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileCheck2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import {
  checkTypedAnswer,
  generateMultipleChoiceOptions,
  generateTrueFalseQuestion,
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

type QuestionType = 'multipleChoice' | 'trueFalse' | 'written';

interface TestQuestion {
  id: string;
  card: CardItem;
  type: QuestionType;
  options?: string[]; // for multiple choice
  correctIndex?: number;
  tfDisplayedDefinition?: string; // for true/false
  tfExpectedAnswer?: boolean; // for true/false
  userAnswer?: string; // option index, 'true'/'false', or typed text
  isGraded?: boolean;
  isCorrect?: boolean;
  isClose?: boolean;
}

type TestPhase = 'setup' | 'testing' | 'results';

export default function TestPage() {
  const params = useParams();
  const setId = params.id as string;

  const [set, setSet] = useState<SetDetails | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Setup options
  const [questionCount, setQuestionCount] = useState(10);
  const [enabledTypes, setEnabledTypes] = useState<Record<QuestionType, boolean>>({
    multipleChoice: true,
    trueFalse: true,
    written: true,
  });

  // Test state
  const [phase, setPhase] = useState<TestPhase>('setup');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [startTime, setStartTime] = useState(0);

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
          setQuestionCount(Math.min(rawCards.length, 20));
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

  const speak = (term: string, audioUrl?: string | null) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
    }
  };

  const handleToggleType = (type: QuestionType) => {
    const next = { ...enabledTypes, [type]: !enabledTypes[type] };
    // Ensure at least one type remains enabled
    if (Object.values(next).some(Boolean)) {
      setEnabledTypes(next);
    }
  };

  const generateTest = (cardsToUse: CardItem[], count: number) => {
    const selectedTypes = (Object.keys(enabledTypes) as QuestionType[]).filter(
      (t) => enabledTypes[t]
    );

    // Shuffle cards
    const shuffledCards = [...cardsToUse].sort(() => Math.random() - 0.5);
    const chosenCards = shuffledCards.slice(0, Math.min(count, shuffledCards.length));

    const generated: TestQuestion[] = chosenCards.map((card, idx) => {
      // Cycle through enabled question types
      const type = selectedTypes[idx % selectedTypes.length];

      if (type === 'multipleChoice') {
        const { options, correctIndex } = generateMultipleChoiceOptions(card, cards);
        return {
          id: `q-${idx}-${card.id}`,
          card,
          type,
          options,
          correctIndex,
          userAnswer: undefined,
        };
      } else if (type === 'trueFalse') {
        const tf = generateTrueFalseQuestion(card, cards);
        return {
          id: `q-${idx}-${card.id}`,
          card,
          type,
          tfDisplayedDefinition: tf.displayedDefinition,
          tfExpectedAnswer: tf.isCorrect,
          userAnswer: undefined,
        };
      } else {
        // written
        return {
          id: `q-${idx}-${card.id}`,
          card,
          type,
          userAnswer: '',
        };
      }
    });

    setQuestions(generated);
    setStartTime(Date.now());
    setPhase('testing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartTest = () => {
    generateTest(cards, questionCount);
  };

  const handleAnswerQuestion = (qIndex: number, answer: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], userAnswer: answer };
      return next;
    });
  };

  const handleSubmitTest = async () => {
    const unansweredCount = questions.filter(
      (q) => q.userAnswer === undefined || q.userAnswer.trim() === ''
    ).length;

    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `Bạn còn ${unansweredCount} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài kiểm tra không?`
      );
      if (!confirmSubmit) return;
    }

    const elapsedTotal = Date.now() - startTime;
    const avgElapsed = Math.round(elapsedTotal / Math.max(1, questions.length));

    // Grade all questions
    const graded = questions.map((q) => {
      let isCorrect = false;
      let isClose = false;

      if (q.type === 'multipleChoice') {
        if (q.userAnswer !== undefined && q.options && q.correctIndex !== undefined) {
          isCorrect = q.options[parseInt(q.userAnswer, 10)] === q.card.definition;
        }
      } else if (q.type === 'trueFalse') {
        if (q.userAnswer !== undefined) {
          const userBool = q.userAnswer === 'true';
          isCorrect = userBool === q.tfExpectedAnswer;
        }
      } else if (q.type === 'written') {
        const res = checkTypedAnswer(q.userAnswer || '', q.card.definition);
        isCorrect = res.isCorrect;
        isClose = res.isClose;
      }

      return {
        ...q,
        isGraded: true,
        isCorrect,
        isClose,
      };
    });

    setQuestions(graded);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Send review logs in background
    for (const q of graded) {
      try {
        await fetch('/api/review/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardId: q.card.id,
            rating: q.isCorrect ? 'good' : 'again',
            mode: 'test',
            elapsedMs: avgElapsed,
          }),
        });
      } catch {
        // Non-blocking log
      }
    }
  };

  const handleRetryWrong = () => {
    const wrongCards = questions.filter((q) => !q.isCorrect).map((q) => q.card);
    if (wrongCards.length > 0) {
      generateTest(wrongCards, wrongCards.length);
    }
  };

  const handleRetakeAll = () => {
    generateTest(cards, questionCount);
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
          <span>{vi.test.backToSet}</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // 1. SETUP PHASE
  // ----------------------------------------------------
  if (phase === 'setup') {
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <Link
            href={`/sets/${setId}`}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{vi.test.title}</h1>
            <div className="text-xs text-gray-500 dark:text-gray-400">{set.title}</div>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900 dark:text-gray-100">
                {vi.test.setupTitle}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tùy chỉnh số lượng câu hỏi và dạng bài bạn muốn làm.
              </p>
            </div>
          </div>

          {/* Question Count Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
              {vi.test.questionCount}: <span className="text-blue-600 font-bold">{questionCount}</span> / {cards.length}
            </label>
            <input
              type="range"
              min={1}
              max={cards.length}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              className="w-full accent-blue-600 cursor-pointer h-2 bg-gray-200 dark:bg-gray-800 rounded-lg"
            />
            <div className="flex gap-2">
              {[5, 10, 20, cards.length]
                .filter((cnt, idx, arr) => cnt <= cards.length && arr.indexOf(cnt) === idx)
                .map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer min-h-[36px] ${
                      questionCount === count
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {count === cards.length ? `Tất cả (${cards.length})` : `${count} câu`}
                  </button>
                ))}
            </div>
          </div>

          {/* Question Types Toggle */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
              {vi.test.questionTypes}
            </label>
            <div className="space-y-2.5">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={enabledTypes.multipleChoice}
                  onChange={() => handleToggleType('multipleChoice')}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {vi.test.typeMultipleChoice}
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={enabledTypes.trueFalse}
                  onChange={() => handleToggleType('trueFalse')}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {vi.test.typeTrueFalse}
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={enabledTypes.written}
                  onChange={() => handleToggleType('written')}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {vi.test.typeWritten}
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={handleStartTest}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{vi.test.startTest}</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. TESTING PHASE
  // ----------------------------------------------------
  if (phase === 'testing') {
    const answeredCount = questions.filter(
      (q) => q.userAnswer !== undefined && q.userAnswer.trim() !== ''
    ).length;

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
          <button
            onClick={() => {
              if (window.confirm('Bạn có muốn thoát khỏi bài kiểm tra hiện tại?')) {
                setPhase('setup');
              }
            }}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Thoát"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
              Tiến độ: {answeredCount} / {questions.length} câu đã trả lời
            </div>
            <div className="w-48 mx-auto h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
              <div
                className="bg-blue-600 h-full transition-all duration-200"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleSubmitTest}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[40px] cursor-pointer shadow-sm"
          >
            {vi.test.submitTest}
          </button>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800/80 pb-3">
                <span className="text-xs font-bold text-gray-400 font-mono">
                  Câu {idx + 1} / {questions.length}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {q.type === 'multipleChoice'
                      ? 'Trắc nghiệm'
                      : q.type === 'trueFalse'
                        ? 'Đúng / Sai'
                        : 'Tự luận'}
                  </span>
                  <button
                    onClick={() => speak(q.card.term, q.card.audioUrl)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition"
                    title="Phát âm"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Term prompt */}
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {q.card.term}
                </div>
                {q.card.phonetic && (
                  <div className="text-xs text-gray-400 font-mono">{q.card.phonetic}</div>
                )}
              </div>

              {/* Question specific inputs */}
              {q.type === 'multipleChoice' && q.options && (
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = q.userAnswer === String(optIdx);
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleAnswerQuestion(idx, String(optIdx))}
                          className={`p-3.5 rounded-xl border text-left text-sm transition flex items-start gap-3 cursor-pointer min-h-[48px] ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 font-medium ring-2 ring-blue-500/20'
                              : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-300 dark:border-gray-700 text-gray-500'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {q.type === 'trueFalse' && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-sm text-gray-800 dark:text-gray-200">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1">
                      {vi.test.isThisCorrect}
                    </span>
                    <span className="font-semibold text-base">
                      &ldquo;{q.tfDisplayedDefinition}&rdquo;
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAnswerQuestion(idx, 'true')}
                      className={`py-3 rounded-xl border font-semibold text-sm transition cursor-pointer min-h-[44px] ${
                        q.userAnswer === 'true'
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {vi.test.trueBtn}
                    </button>
                    <button
                      onClick={() => handleAnswerQuestion(idx, 'false')}
                      className={`py-3 rounded-xl border font-semibold text-sm transition cursor-pointer min-h-[44px] ${
                        q.userAnswer === 'false'
                          ? 'border-red-600 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 ring-2 ring-red-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {vi.test.falseBtn}
                    </button>
                  </div>
                </div>
              )}

              {q.type === 'written' && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block">
                    {vi.learn.typeTheAnswer}
                  </label>
                  <input
                    type="text"
                    value={q.userAnswer || ''}
                    onChange={(e) => handleAnswerQuestion(idx, e.target.value)}
                    placeholder={vi.learn.typePlaceholder}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom submit button */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSubmitTest}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm min-h-[48px] cursor-pointer"
          >
            {vi.test.submitTest}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. RESULTS PHASE
  // ----------------------------------------------------
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const totalCount = questions.length;
  const percentage = Math.round((correctCount / totalCount) * 100);
  const wrongQuestions = questions.filter((q) => !q.isCorrect);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link
          href={`/sets/${setId}`}
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {vi.test.resultsTitle}
          </h1>
          <div className="text-xs text-gray-500 dark:text-gray-400">{set.title}</div>
        </div>
      </div>

      {/* Score Banner */}
      <div
        className={`p-8 rounded-2xl border text-center space-y-4 ${
          percentage >= 80
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-50'
            : percentage >= 50
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80 text-blue-950 dark:text-blue-50'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-50'
        }`}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center">
          {percentage >= 80 ? (
            <Sparkles className="w-8 h-8 text-emerald-500" />
          ) : (
            <FileCheck2 className="w-8 h-8 text-blue-500" />
          )}
        </div>

        <div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            {vi.test.percent(percentage)}
          </div>
          <div className="text-sm font-semibold opacity-90 mt-1">
            {vi.test.score(correctCount, totalCount)}
          </div>
        </div>

        {/* Retake actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {wrongQuestions.length > 0 && (
            <button
              onClick={handleRetryWrong}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm transition shadow-sm min-h-[44px] cursor-pointer"
            >
              {vi.test.retryWrong} ({wrongQuestions.length})
            </button>
          )}

          <button
            onClick={handleRetakeAll}
            className="px-5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-medium text-xs sm:text-sm transition min-h-[44px] cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{vi.test.retakeAll}</span>
          </button>
        </div>
      </div>

      {/* Question Details List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          Chi tiết bài làm ({questions.length} câu)
        </h2>

        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-5 rounded-xl border space-y-3 ${
                q.isCorrect
                  ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                    <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                      {q.card.term}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {q.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đúng</span>
                    </span>
                  ) : q.isClose ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>Gần đúng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      <span>Sai</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Review details */}
              <div className="text-xs space-y-1 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                <div className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Đáp án đúng:{' '}
                  </span>
                  {q.type === 'trueFalse' ? (
                    <span>
                      {q.tfExpectedAnswer ? 'Đúng' : 'Sai'} (Định nghĩa thực tế:{' '}
                      {q.card.definition})
                    </span>
                  ) : (
                    <span className="font-medium">{q.card.definition}</span>
                  )}
                </div>

                <div className="text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Câu trả lời của bạn:{' '}
                  </span>
                  {q.type === 'multipleChoice' && q.options && q.userAnswer !== undefined ? (
                    <span className={q.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {q.options[parseInt(q.userAnswer, 10)]}
                    </span>
                  ) : q.type === 'trueFalse' && q.userAnswer !== undefined ? (
                    <span className={q.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {q.userAnswer === 'true' ? 'Đúng' : 'Sai'}
                    </span>
                  ) : (
                    <span className={q.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {q.userAnswer || '(Bỏ trống)'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 flex justify-center">
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm transition min-h-[44px]"
        >
          <span>{vi.test.backToSet}</span>
        </Link>
      </div>
    </div>
  );
}
