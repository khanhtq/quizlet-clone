'use client';

import React from 'react';
import { Volume2 } from 'lucide-react';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
}

interface Props {
  cards: CardItem[];
}

export default function PublicCardList({ cards }: Props) {
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

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
        Danh sách thuật ngữ ({cards.length})
      </h2>

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
    </div>
  );
}
