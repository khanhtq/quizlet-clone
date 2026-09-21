'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Sparkles,
  FileSpreadsheet,
  AlertTriangle,
  Trash2,
  Plus,
  Check,
  Upload,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import { parseBulkText, parseCSV, BulkSeparator, ParsedBulkItem } from '@/lib/parsers';

interface BulkAddModalProps {
  setId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTerms?: string[];
}

export default function BulkAddModal({
  setId,
  isOpen,
  onClose,
  onSuccess,
  existingTerms = [],
}: BulkAddModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [rawText, setRawText] = useState('');
  const [separator, setSeparator] = useState<BulkSeparator>('auto');

  // Review table items
  const [items, setItems] = useState<ParsedBulkItem[]>([]);
  const [step, setStep] = useState<'input' | 'review'>('input');

  // Auto lookup state
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupProgress, setLookupProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Concurrency 3 lookup runner
  async function autoFillMissingMeanings(parsedList: ParsedBulkItem[]) {
    const missingIndices = parsedList
      .map((item, idx) => (!item.definition.trim() ? idx : -1))
      .filter((idx) => idx !== -1);

    if (missingIndices.length === 0) {
      setItems(parsedList);
      setStep('review');
      return;
    }

    setIsLookingUp(true);
    setLookupProgress({ current: 0, total: missingIndices.length });

    const updated = [...parsedList];
    let completed = 0;
    const concurrency = 3;

    // Worker pool of concurrency 3
    const queue = [...missingIndices];

    async function worker() {
      while (queue.length > 0) {
        const idx = queue.shift();
        if (idx === undefined) break;

        const targetWord = updated[idx].term.trim();
        try {
          const res = await fetch(`/api/lookup?word=${encodeURIComponent(targetWord)}`);
          if (res.ok) {
            const data = await res.json();
            const firstViMeaning = data.meanings?.find(
              (m: { vi?: string }) => m.vi && m.vi.trim().length > 0
            );
            const fallbackEnMeaning = data.dictionary?.meanings?.[0]?.definitions?.[0]?.definition;

            if (firstViMeaning?.vi) {
              updated[idx].definition = firstViMeaning.vi;
              if (firstViMeaning.pos) updated[idx].partOfSpeech = firstViMeaning.pos;
            } else if (fallbackEnMeaning) {
              updated[idx].definition = fallbackEnMeaning;
            }

            if (data.dictionary?.phonetic) {
              updated[idx].phonetic = data.dictionary.phonetic;
            }
          }
        } catch {
          // Keep whatever is there
        } finally {
          completed++;
          setLookupProgress({ current: completed, total: missingIndices.length });
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, missingIndices.length) }, () =>
      worker()
    );
    await Promise.all(workers);

    setIsLookingUp(false);
    setItems(updated);
    setStep('review');
  }

  // Handle parsing from text
  async function handleParseText() {
    setError(null);
    if (!rawText.trim()) {
      setError('Vui lòng nhập hoặc dán nội dung từ vựng.');
      return;
    }

    const parsed = parseBulkText(rawText, separator);
    if (parsed.length === 0) {
      setError('Không thể phân tích dữ liệu. Vui lòng kiểm tra lại định dạng.');
      return;
    }

    await autoFillMissingMeanings(parsed);
  }

  // Handle file upload (CSV / TXT)
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parsed = file.name.endsWith('.csv')
        ? parseCSV(content)
        : parseBulkText(content, separator);

      if (parsed.length === 0) {
        setError('Tệp tin trống hoặc không thể phân tích nội dung.');
        return;
      }

      await autoFillMissingMeanings(parsed);
    };

    reader.readAsText(file, 'UTF-8');
  }

  // Save to set
  async function handleSaveCards() {
    const validCards = items.filter((c) => c.term.trim().length > 0);
    if (validCards.length === 0) {
      setError(vi.bulk.noValidCards);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/sets/${setId}/cards/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: validCards.map((c) => ({
            term: c.term.trim(),
            definition: c.definition.trim() || 'Chưa có định nghĩa',
            phonetic: c.phonetic?.trim() || null,
            partOfSpeech: c.partOfSpeech?.trim() || null,
            example: c.example?.trim() || null,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Lỗi lưu thẻ');
      }

      onSuccess();
      onClose();
    } catch {
      setError('Không thể lưu thẻ, vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {vi.bulk.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'input' ? (
            <>
              {/* Tab Selector */}
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Dán văn bản
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] cursor-pointer ${
                    activeTab === 'file'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Nhập tệp (CSV / TXT)
                </button>
              </div>

              {activeTab === 'paste' ? (
                <div className="space-y-4">
                  {/* Separator Selector */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {vi.bulk.separatorLabel}:
                    </label>
                    <select
                      value={separator}
                      onChange={(e) => setSeparator(e.target.value as BulkSeparator)}
                      className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium min-h-[38px]"
                    >
                      <option value="auto">{vi.bulk.sepAuto}</option>
                      <option value=" - ">{vi.bulk.sepDash}</option>
                      <option value="&#9;">{vi.bulk.sepTab}</option>
                      <option value=";">{vi.bulk.sepSemicolon}</option>
                      <option value=",">{vi.bulk.sepComma}</option>
                    </select>
                  </div>

                  {/* Textarea */}
                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={vi.bulk.pastePlaceholder}
                    className="w-full p-3.5 rounded-2xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />

                  <p className="text-xs text-gray-500">
                    💡 Mẹo: Những từ chưa có nghĩa tiếng Việt sẽ được tự động tra cứu từ điển và dịch nghĩa thông minh (tối đa 3 từ đồng thời).
                  </p>
                </div>
              ) : (
                /* File Upload Tab */
                <div className="space-y-4 text-center py-8">
                  <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Chọn tệp CSV hoặc văn bản
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                      Hỗ trợ tệp .csv (có cột term, definition) hoặc .txt với mỗi dòng là một từ vựng.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[44px] cursor-pointer"
                  >
                    Chọn tệp từ thiết bị
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Step 2: Review Table */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {vi.bulk.reviewTitle} ({items.length} thẻ)
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      { term: '', definition: '', phonetic: '', partOfSpeech: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng</span>
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {items.map((item, idx) => {
                  const isDuplicate = existingTerms.some(
                    (t) => t.trim().toLowerCase() === item.term.trim().toLowerCase()
                  );

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start gap-2.5"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            placeholder="Thuật ngữ (EN)"
                            value={item.term}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, term: val } : it))
                              );
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                          />
                          {isDuplicate && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{vi.bulk.duplicateWarning}</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Định nghĩa (VI)"
                            value={item.definition}
                            onChange={(e) => {
                              const val = e.target.value;
                              setItems((prev) =>
                                prev.map((it, i) =>
                                  i === idx ? { ...it, definition: val } : it
                                )
                              );
                            }}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-gray-400 hover:text-red-600 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
                        title="Xóa hàng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto lookup progress bar */}
          {isLookingUp && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                  <span>
                    {vi.bulk.lookingUpProgress(lookupProgress.current, lookupProgress.total)}
                  </span>
                </span>
                <span>
                  {lookupProgress.total > 0
                    ? `${Math.round((lookupProgress.current / lookupProgress.total) * 100)}%`
                    : ''}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out"
                  style={{
                    width: `${
                      lookupProgress.total > 0
                        ? (lookupProgress.current / lookupProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          {step === 'review' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] cursor-pointer"
              >
                Nhập lại
              </button>
              <button
                type="button"
                onClick={handleSaveCards}
                disabled={isSaving || items.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition min-h-[44px] cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSaving ? 'Đang lưu...' : vi.bulk.saveCards(items.length)}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] cursor-pointer"
              >
                {vi.common.cancel}
              </button>
              {activeTab === 'paste' && (
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={isLookingUp || !rawText.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition min-h-[44px] cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{vi.bulk.parseButton}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
