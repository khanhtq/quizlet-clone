'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Gamepad2,
  Trophy,
  Timer,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface CardItem {
  id: string;
  term: string;
  definition: string;
}

interface SetDetails {
  id: string;
  title: string;
}

interface MatchTile {
  tileId: string;
  cardId: string;
  type: 'term' | 'definition';
  text: string;
  isMatched: boolean;
}

type GameState = 'intro' | 'playing' | 'completed';

export default function MatchPage() {
  const params = useParams();
  const setId = params.id as string;

  const [set, setSet] = useState<SetDetails | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bestMs, setBestMs] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>('intro');

  // Game state
  const [tiles, setTiles] = useState<MatchTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [mismatchedTileIds, setMismatchedTileIds] = useState<string[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch set, cards, and personal best score
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [setRes, bestRes] = await Promise.all([
          fetch(`/api/sets/${setId}`),
          fetch(`/api/sets/${setId}/match/best`),
        ]);

        if (!setRes.ok) throw new Error('Not found');

        const setData = await setRes.json();
        const bestData = bestRes.ok ? await bestRes.json() : { bestMs: null };

        if (!ignore) {
          setSet(setData.set);
          setCards(setData.cards || []);
          setBestMs(bestData.bestMs ?? null);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError('Không thể tải dữ liệu ghép thẻ');
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [setId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startNewGame = () => {
    if (cards.length < 2) return;

    // Pick up to 6 cards randomly
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const roundCards = shuffled.slice(0, Math.min(6, cards.length));

    // Create 2 tiles per card (term and definition)
    const newTiles: MatchTile[] = [];
    roundCards.forEach((c) => {
      newTiles.push({
        tileId: `term-${c.id}`,
        cardId: c.id,
        type: 'term',
        text: c.term,
        isMatched: false,
      });
      newTiles.push({
        tileId: `def-${c.id}`,
        cardId: c.id,
        type: 'definition',
        text: c.definition,
        isMatched: false,
      });
    });

    // Shuffle tiles
    const shuffledTiles = newTiles.sort(() => Math.random() - 0.5);

    setTiles(shuffledTiles);
    setSelectedTileId(null);
    setMismatchedTileIds([]);
    setElapsedMs(0);
    setIsNewBest(false);
    setGameState('playing');

    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  };

  const handleTileClick = (clickedTile: MatchTile) => {
    if (clickedTile.isMatched || mismatchedTileIds.length > 0) return;

    // Clicked already selected tile -> deselect
    if (selectedTileId === clickedTile.tileId) {
      setSelectedTileId(null);
      return;
    }

    // First tile selection
    if (!selectedTileId) {
      setSelectedTileId(clickedTile.tileId);
      return;
    }

    // Second tile selection: check match
    const firstTile = tiles.find((t) => t.tileId === selectedTileId);
    if (!firstTile) {
      setSelectedTileId(clickedTile.tileId);
      return;
    }

    const isMatch =
      firstTile.cardId === clickedTile.cardId && firstTile.type !== clickedTile.type;

    if (isMatch) {
      // Correct match!
      setSelectedTileId(null);
      const nextTiles = tiles.map((t) =>
        t.tileId === firstTile.tileId || t.tileId === clickedTile.tileId
          ? { ...t, isMatched: true }
          : t
      );
      setTiles(nextTiles);

      // Check if all tiles matched
      const allDone = nextTiles.every((t) => t.isMatched);
      if (allDone) {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalElapsed = Math.max(100, elapsedMs);
        setGameState('completed');

        // Extract unique cardIds played
        const uniqueCardIds = Array.from(new Set(nextTiles.map((t) => t.cardId)));

        fetch(`/api/sets/${setId}/match/score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elapsedMs: finalElapsed,
            cardIds: uniqueCardIds,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              setIsNewBest(data.isNewBest);
              setBestMs(data.bestMs);
            }
          })
          .catch(() => {});
      }
    } else {
      // Mismatch
      setMismatchedTileIds([firstTile.tileId, clickedTile.tileId]);
      setTimeout(() => {
        setMismatchedTileIds([]);
        setSelectedTileId(null);
      }, 400);
    }
  };


  const formatSeconds = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
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

  if (cards.length < 2) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <p className="text-gray-600 dark:text-gray-400">
          Cần ít nhất 2 thẻ để có thể chơi chế độ ghép thẻ. Vui lòng thêm thêm thẻ vào học phần.
        </p>
        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{vi.match.backToSet}</span>
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------
  // 1. INTRO SCREEN
  // ----------------------------------------------------
  if (gameState === 'intro') {
    return (
      <div className="max-w-md mx-auto space-y-6 py-6 pb-16">
        <div className="flex items-center gap-3">
          <Link
            href={`/sets/${setId}`}
            className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{vi.match.title}</h1>
            <div className="text-xs text-gray-500 dark:text-gray-400">{set.title}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
            <Gamepad2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Sẵn sàng ghép thẻ?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {vi.match.desc}
            </p>
          </div>

          {/* Personal Best Info */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>
              {bestMs !== null ? vi.match.personalBest(formatSeconds(bestMs)) : vi.match.noBestYet}
            </span>
          </div>

          <button
            onClick={startNewGame}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm min-h-[48px] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{vi.match.startGame}</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2. PLAYING SCREEN
  // ----------------------------------------------------
  if (gameState === 'playing') {
    const remainingPairs = tiles.filter((t) => !t.isMatched).length / 2;

    return (
      <div className="max-w-4xl mx-auto space-y-4 pb-16">
        {/* Live Status Bar */}
        <div className="flex items-center justify-between gap-4 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => {
              if (window.confirm('Bạn có muốn dừng trò chơi hiện tại?')) {
                if (timerRef.current) clearInterval(timerRef.current);
                setGameState('intro');
              }
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Thoát"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Running Timer */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono font-bold text-lg">
            <Timer className="w-5 h-5" />
            <span>{formatSeconds(elapsedMs)}</span>
          </div>

          {/* Remaining counter */}
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Còn lại: <span className="text-gray-900 dark:text-gray-100 font-bold">{remainingPairs}</span> cặp
          </div>
        </div>

        {/* 2x3 or 3x4 Matching Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map((tile) => {
            const isSelected = selectedTileId === tile.tileId;
            const isMismatched = mismatchedTileIds.includes(tile.tileId);

            if (tile.isMatched) {
              return (
                <div
                  key={tile.tileId}
                  className="min-h-[110px] sm:min-h-[130px] rounded-2xl border border-transparent opacity-0 pointer-events-none transition-opacity duration-300"
                />
              );
            }

            let borderStyle =
              'border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-900';
            let textStyle = 'text-gray-800 dark:text-gray-200';

            if (isSelected) {
              borderStyle =
                'border-blue-600 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/20';
              textStyle = 'text-blue-900 dark:text-blue-100 font-semibold';
            } else if (isMismatched) {
              borderStyle =
                'border-red-500 dark:border-red-500 bg-red-50/70 dark:bg-red-950/40 animate-shake ring-4 ring-red-500/20';
              textStyle = 'text-red-900 dark:text-red-100 font-semibold';
            }

            return (
              <button
                key={tile.tileId}
                onClick={() => handleTileClick(tile)}
                className={`min-h-[110px] sm:min-h-[130px] p-4 rounded-2xl border transition-all duration-150 flex items-center justify-center text-center shadow-sm cursor-pointer select-none active:scale-[0.98] ${borderStyle}`}
              >
                <span className={`text-sm sm:text-base leading-snug break-words line-clamp-4 ${textStyle}`}>
                  {tile.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // 3. COMPLETED / VICTORY SCREEN
  // ----------------------------------------------------
  return (
    <div className="max-w-md mx-auto py-8 text-center space-y-6 pb-16 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg">
        {isNewBest ? <Sparkles className="w-10 h-10" /> : <Trophy className="w-10 h-10" />}
      </div>

      <div className="space-y-2">
        {isNewBest && (
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm animate-bounce">
            {vi.match.newRecord}
          </span>
        )}
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          {vi.match.finishedTitle}
        </h1>
        <p className="text-3xl sm:text-4xl font-black font-mono text-blue-600 dark:text-blue-400">
          {formatSeconds(elapsedMs)}
        </p>
      </div>

      {/* Best time card */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm text-xs font-semibold text-gray-600 dark:text-gray-400">
        <Trophy className="w-4 h-4 text-amber-500 inline-block mr-1.5 -mt-0.5" />
        <span>
          {bestMs !== null
            ? vi.match.personalBest(formatSeconds(bestMs))
            : vi.match.timeElapsed(formatSeconds(elapsedMs))}
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={startNewGame}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm min-h-[48px] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{vi.match.playAgain}</span>
        </button>
        <Link
          href={`/sets/${setId}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm transition min-h-[48px]"
        >
          <span>{vi.match.backToSet}</span>
        </Link>
      </div>
    </div>
  );
}
