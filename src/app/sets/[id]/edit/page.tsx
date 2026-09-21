'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  position: number;
}

interface DuplicateInfo {
  id: string;
  term: string;
  definition: string;
  setId: string;
}

export default function SetEditPage() {
  const params = useParams();
  const setId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
  const [setSavedSuccess, setSetSavedSuccess] = useState(false);

  // New card form state
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [example, setExample] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateInfo | null>(null);

  const termInputRef = useRef<HTMLInputElement>(null);

  // Load set and cards
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await fetch(`/api/sets/${setId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!ignore) {
          setTitle(data.set.title);
          setDescription(data.set.description || '');
          setCards(data.cards || []);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          alert('Không thể tải học phần');
          setLoading(false);
        }
      }
    }
    if (setId) loadData();
    return () => {
      ignore = true;
    };
  }, [setId]);

  function handleTermChange(value: string) {
    setTerm(value);
    if (value.trim().length < 2) {
      setDuplicateWarning(null);
    }
  }

  // Duplicate term check with debounce
  useEffect(() => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/cards/duplicate-check?term=${encodeURIComponent(trimmed)}`
        );
        if (res.ok && isCurrent) {
          const data = await res.json();
          setDuplicateWarning(data.duplicate);
        }
      } catch {
        // Ignore check error
      }
    }, 300);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [term]);

  async function handleSaveSetHeader(e: React.FormEvent) {
    e.preventDefault();
    setSavingSet(true);
    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        setSetSavedSuccess(true);
        setTimeout(() => setSetSavedSuccess(false), 2500);
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setSavingSet(false);
    }
  }

  async function handleAddCard(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!term.trim() || !definition.trim() || isAddingCard) return;

    setIsAddingCard(true);
    try {
      const res = await fetch(`/api/sets/${setId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: term.trim(),
          definition: definition.trim(),
          phonetic: phonetic.trim() || undefined,
          partOfSpeech: partOfSpeech.trim() || undefined,
          example: example.trim() || undefined,
          position: cards.length,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCards((prev) => [...prev, data.card]);
        // Reset form
        setTerm('');
        setDefinition('');
        setPhonetic('');
        setPartOfSpeech('');
        setExample('');
        setDuplicateWarning(null);
        // Focus back to term input
        termInputRef.current?.focus();
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsAddingCard(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    }
  }

  function reuseMeaning() {
    if (duplicateWarning) {
      setDefinition(duplicateWarning.definition);
    }
  }

  async function handleDeleteCard(cardId: string) {
    if (!confirm(vi.cards.deleteCardConfirm)) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    } catch {
      alert(vi.common.error);
    }
  }

  async function moveCard(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;

    const newCards = [...cards];
    const temp = newCards[index];
    newCards[index] = newCards[targetIndex];
    newCards[targetIndex] = temp;

    setCards(newCards);

    // Save reorder
    try {
      await fetch(`/api/sets/${setId}/cards/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: newCards.map((c) => c.id) }),
      });
    } catch {
      // Revert if error
    }
  }

  async function handleUpdateCardField(
    cardId: string,
    field: 'term' | 'definition',
    value: string
  ) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, [field]: value } : c))
    );
    try {
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/sets/${setId}`}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            {vi.sets.editTitle}
          </h1>
        </div>

        <Link
          href={`/sets/${setId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition min-h-[44px]"
        >
          <Check className="w-4 h-4" />
          <span>Hoàn tất</span>
        </Link>
      </div>

      {/* Set Header Edit Form */}
      <form
        onSubmit={handleSaveSetHeader}
        className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3"
      >
        <div>
          <label htmlFor="title" className="block text-xs font-semibold mb-1">
            {vi.sets.titleLabel}
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-xs font-semibold mb-1">
            {vi.sets.descriptionLabel}
          </label>
          <textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          {setSavedSuccess && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Đã lưu thông tin
            </span>
          )}
          <button
            type="submit"
            disabled={savingSet}
            className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-semibold transition min-h-[36px]"
          >
            {savingSet ? vi.common.loading : 'Lưu tiêu đề'}
          </button>
        </div>
      </form>

      {/* Inline Add Card Form */}
      <div className="p-5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>{vi.cards.addCard}</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowOptionalFields(!showOptionalFields)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {showOptionalFields ? 'Ẩn chi tiết' : '+ Thêm phiên âm, từ loại, ví dụ'}
          </button>
        </div>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{vi.cards.duplicateWarning(duplicateWarning.term)}</span>
            </div>
            <button
              type="button"
              onClick={reuseMeaning}
              className="px-2.5 py-1 rounded-lg bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 font-semibold hover:bg-amber-300 transition shrink-0 cursor-pointer min-h-[32px]"
            >
              {vi.cards.reuseMeaning}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              {vi.cards.termLabel} <span className="text-red-500">*</span>
            </label>
            <input
              ref={termInputRef}
              type="text"
              value={term}
              onChange={(e) => handleTermChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={vi.cards.termPlaceholder}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              {vi.cards.definitionLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={vi.cards.definitionPlaceholder}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {showOptionalFields && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                {vi.cards.phoneticLabel}
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="/əˈbaʊt/"
                className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                {vi.cards.partOfSpeechLabel}
              </label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="noun, verb, adj..."
                className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                {vi.cards.exampleLabel}
              </label>
              <input
                type="text"
                value={example}
                onChange={(e) => setExample(e.target.value)}
                placeholder="Câu ví dụ..."
                className="w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Mẹo: Nhấn Enter để lưu thẻ và tiếp tục từ mới
          </span>
          <button
            type="button"
            onClick={() => handleAddCard()}
            disabled={!term.trim() || !definition.trim() || isAddingCard}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{vi.cards.saveAndNext}</span>
          </button>
        </div>
      </div>

      {/* Existing Cards List */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Danh sách thẻ ({cards.length})
        </h2>

        {cards.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            Học phần chưa có thẻ nào. Nhập thuật ngữ và định nghĩa ở trên để thêm thẻ.
          </div>
        ) : (
          <div className="space-y-2.5">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-start gap-3"
              >
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => moveCard(idx, 'up')}
                    disabled={idx === 0}
                    title={vi.cards.moveUp}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(idx, 'down')}
                    disabled={idx === cards.length - 1}
                    title={vi.cards.moveDown}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Card Content */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div>
                    <input
                      type="text"
                      value={card.term}
                      onChange={(e) =>
                        handleUpdateCardField(card.id, 'term', e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={card.definition}
                      onChange={(e) =>
                        handleUpdateCardField(card.id, 'definition', e.target.value)
                      }
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id)}
                  title={vi.common.delete}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
