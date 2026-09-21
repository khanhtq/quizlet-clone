'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import { LookupResult, MeaningItem } from '@/server/lookup/types';
import BulkAddModal from '@/components/cards/BulkAddModal';

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

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Meaning suggestions state
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showDefinitionSuggestions, setShowDefinitionSuggestions] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const termInputRef = useRef<HTMLInputElement>(null);
  const termDropdownRef = useRef<HTMLDivElement>(null);
  const defDropdownRef = useRef<HTMLDivElement>(null);

  const reloadCards = useCallback(async () => {
    try {
      const res = await fetch(`/api/sets/${setId}`);
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch {
      // Ignore
    }
  }, [setId]);

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
    setActiveSuggestionIndex(-1);
    if (value.trim().length < 2) {
      setDuplicateWarning(null);
      setSuggestions([]);
      setShowSuggestions(false);
      setShowDefinitionSuggestions(false);
      setLookupResult(null);
    }
  }

  // 1. Duplicate term check with debounce (300ms)
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

  // 2. Autocomplete suggestions (200ms debounce)
  useEffect(() => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    let isCurrent = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(trimmed)}`
        );
        if (res.ok && isCurrent) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          if (data.suggestions && data.suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }
      } catch {
        // Ignore autocomplete error
      }
    }, 200);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [term]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (termDropdownRef.current && !termDropdownRef.current.contains(target)) {
        setShowSuggestions(false);
      }
      if (
        defDropdownRef.current &&
        !defDropdownRef.current.contains(target) &&
        termDropdownRef.current &&
        !termDropdownRef.current.contains(target)
      ) {
        setShowDefinitionSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Meaning suggestions lookup (350ms debounce with abort)
  useEffect(() => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    let isCurrent = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsLookingUp(true);
        const res = await fetch(
          `/api/lookup?word=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (res.ok && isCurrent) {
          const data = await res.json();
          setLookupResult(data);
          // Autofill phonetic if not already filled
          if (data.phonetic) {
            setPhonetic((prev) => (prev ? prev : data.phonetic));
          }
          // If definition suggestions are available, display dropdown and auto-suggest first meaning
          if (data.meanings && data.meanings.length > 0) {
            setShowDefinitionSuggestions(true);
            const firstMeaning = data.meanings[0];
            const rawText = firstMeaning.vi || firstMeaning.en || '';
            const formatted = firstMeaning.pos ? `(${firstMeaning.pos}) ${rawText}` : rawText;
            setDefinition((prev) => (prev ? prev : formatted));
            if (firstMeaning.pos) {
              setPartOfSpeech((prev) => (prev ? prev : firstMeaning.pos));
            }
            if (firstMeaning.exampleEn) {
              setExample((prev) => (prev ? prev : firstMeaning.exampleEn));
            }
          }
        }
      } catch {
        // Ignore lookup error / abort
      } finally {
        if (isCurrent) setIsLookingUp(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  async function triggerLookup(forceRefresh = false) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setIsLookingUp(true);
    try {
      const res = await fetch(
        `/api/lookup?word=${encodeURIComponent(trimmed)}${
          forceRefresh ? '&refresh=true' : ''
        }`
      );
      if (res.ok) {
        const data = await res.json();
        setLookupResult(data);
        if (data.phonetic) setPhonetic(data.phonetic);
        if (data.meanings && data.meanings.length > 0) {
          setShowDefinitionSuggestions(true);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLookingUp(false);
    }
  }

  function selectSuggestion(word: string) {
    setTerm(word);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setIsLookingUp(true);
    // Directly trigger lookup for this word
    void fetch(`/api/lookup?word=${encodeURIComponent(word)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLookupResult(data);
          if (data.phonetic) setPhonetic(data.phonetic);
          if (data.meanings && data.meanings.length > 0) {
            setShowDefinitionSuggestions(true);
            const firstMeaning = data.meanings[0];
            const rawText = firstMeaning.vi || firstMeaning.en || '';
            const formatted = firstMeaning.pos ? `(${firstMeaning.pos}) ${rawText}` : rawText;
            setDefinition(formatted);
            if (firstMeaning.pos) {
              setPartOfSpeech(firstMeaning.pos);
            }
            if (firstMeaning.exampleEn) {
              setExample(firstMeaning.exampleEn);
            }
          }
        }
      })
      .finally(() => {
        setIsLookingUp(false);
      });
  }

  function applyMeaningChip(m: MeaningItem) {
    const rawMeaning = m.vi || m.en || '';
    const formattedDefinition = m.pos ? `(${m.pos}) ${rawMeaning}` : rawMeaning;
    setDefinition(formattedDefinition);
    if (m.pos) {
      setPartOfSpeech(m.pos);
    }
    if (m.exampleEn) {
      setExample(m.exampleEn);
    }
    if (lookupResult?.phonetic) {
      setPhonetic(lookupResult.phonetic);
    }
  }

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
          audioUrl: lookupResult?.audioUrl || undefined,
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
        setLookupResult(null);
        setSuggestions([]);
        setShowSuggestions(false);
        setShowDefinitionSuggestions(false);
        // Focus back to term input
        termInputRef.current?.focus();
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsAddingCard(false);
    }
  }

  function handleTermKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        );
        return;
      }
      if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddCard();
    }
  }

  function handleDefinitionKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowDefinitionSuggestions(false);
      return;
    }
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

      {/* Inline Add Card Form with Suggestions */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
          {/* Term Input with Autocomplete Dropdown */}
          <div ref={termDropdownRef} className="relative">
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              {vi.cards.termLabel} <span className="text-red-500">*</span>
            </label>
            <input
              ref={termInputRef}
              type="text"
              value={term}
              onChange={(e) => handleTermChange(e.target.value)}
              onKeyDown={handleTermKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder={vi.cards.termPlaceholder}
              autoComplete="off"
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 max-h-48 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => selectSuggestion(s)}
                    className={`w-full text-left px-3.5 py-2.5 text-sm transition cursor-pointer flex items-center justify-between ${
                      idx === activeSuggestionIndex
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Definition Input with Suggestions Dropdown */}
          <div ref={defDropdownRef} className="relative">
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              {vi.cards.definitionLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              onFocus={() => {
                if (lookupResult?.meanings && lookupResult.meanings.length > 0) {
                  setShowDefinitionSuggestions(true);
                }
              }}
              onClick={() => {
                if (lookupResult?.meanings && lookupResult.meanings.length > 0) {
                  setShowDefinitionSuggestions(true);
                }
              }}
              onKeyDown={handleDefinitionKeyDown}
              placeholder="(loại từ) nghĩa (VD: (noun) quả táo)"
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Definition Suggestions Dropdown */}
            {showDefinitionSuggestions && lookupResult?.meanings && lookupResult.meanings.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto p-1 divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg mb-1 flex items-center justify-between">
                  <span>Gợi ý định nghĩa ({lookupResult.meanings.length})</span>
                  <span className="text-[10px] text-gray-400 font-normal">Nhấp để chọn</span>
                </div>
                {lookupResult.meanings.map((m, idx) => {
                  const rawMeaning = m.vi || m.en || '';
                  const formattedText = m.pos ? `(${m.pos}) ${rawMeaning}` : rawMeaning;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        applyMeaningChip(m);
                        setShowDefinitionSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/60 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        {m.pos && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                            {m.pos}
                          </span>
                        )}
                        <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {formattedText}
                        </span>
                      </div>
                      {(m.exampleEn || m.exampleVi) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 italic">
                          {m.exampleEn} {m.exampleVi ? `— ${m.exampleVi}` : ''}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Meaning Suggestion Chips */}
        {term.trim().length >= 2 && (
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gợi ý nghĩa ({isLookingUp ? 'Đang tra...' : 'chọn để điền nhanh'})</span>
              </div>
              <button
                type="button"
                onClick={() => triggerLookup(true)}
                disabled={isLookingUp}
                title="Làm mới tra cứu"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLookingUp ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {lookupResult?.meanings && lookupResult.meanings.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {lookupResult.meanings.map((m, idx) => {
                  const rawMeaning = m.vi || m.en || '';
                  const formattedText = m.pos ? `(${m.pos}) ${rawMeaning}` : rawMeaning;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyMeaningChip(m)}
                      title={m.exampleEn ? `${formattedText} - VD: ${m.exampleEn}` : formattedText}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 text-xs text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950 transition flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer text-left"
                    >
                      <span className="text-[10px] font-bold uppercase px-1 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {m.pos}
                      </span>
                      <span className="line-clamp-1">{formattedText}</span>
                    </button>
                  );
                })}
              </div>
            ) : isLookingUp ? (
              <div className="flex gap-2 animate-pulse">
                <div className="h-6 w-24 bg-blue-200 dark:bg-blue-900 rounded-lg" />
                <div className="h-6 w-32 bg-blue-200 dark:bg-blue-900 rounded-lg" />
              </div>
            ) : null}

            {lookupResult?.notice && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                {lookupResult.notice}
              </p>
            )}
          </div>
        )}

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            Danh sách thẻ ({cards.length})
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold transition min-h-[38px] cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{vi.bulk.title}</span>
            </button>
            <a
              href={`/api/sets/${setId}/export/csv`}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold transition min-h-[38px] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{vi.bulk.exportCSV}</span>
            </a>
          </div>
        </div>

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

      <BulkAddModal
        setId={setId}
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={reloadCards}
        existingTerms={cards.map((c) => c.term)}
      />
    </div>
  );
}
