'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  GraduationCap,
  FileCheck2,
  Gamepad2,
  Edit,
  Copy,
  Trash2,
  Volume2,
  Plus,
  Download,
  Share2,
  Star,
  Check,
  Folder as FolderIcon,
  X,
  Globe,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface CardItem {
  id: string;
  term: string;
  definition: string;
  phonetic: string | null;
  partOfSpeech: string | null;
  example: string | null;
  audioUrl: string | null;
  starred: boolean;
}

interface SetDetails {
  id: string;
  title: string;
  description: string | null;
  folderId: string | null;
  isPublic: boolean;
  shareSlug: string | null;
  cardCount: number;
  dueCount: number;
  lastStudiedAt: number | null;
  createdAt: number;
}

interface FolderOption {
  id: string;
  name: string;
}

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id as string;

  const [set, setSet] = useState<SetDetails | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Share state
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPublicShare, setIsPublicShare] = useState(false);
  const [shareSlug, setShareSlug] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);

  // Starred filter
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [setRes, foldersRes] = await Promise.all([
          fetch(`/api/sets/${setId}`),
          fetch('/api/folders'),
        ]);

        if (!setRes.ok) throw new Error('Set not found');

        const setData = await setRes.json();
        const foldersData = foldersRes.ok ? await foldersRes.json() : { folders: [] };

        if (!ignore) {
          setSet(setData.set);
          setCards(setData.cards || []);
          setIsPublicShare(Boolean(setData.set.isPublic));
          setShareSlug(setData.set.shareSlug || null);
          setFolders(foldersData.folders || []);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError('Không thể tải thông tin học phần');
          setLoading(false);
        }
      }
    }

    if (setId) {
      loadData();
    }
    return () => {
      ignore = true;
    };
  }, [setId]);

  function speak(term: string, audioUrl?: string | null) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
    }
  }

  async function handleToggleStar(cardId: string) {
    // Optimistic toggle
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c))
    );

    try {
      await fetch(`/api/cards/${cardId}/star`, { method: 'POST' });
    } catch {
      // Revert if error
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, starred: !c.starred } : c))
      );
    }
  }

  async function handleToggleShare() {
    const nextPublic = !isPublicShare;
    setTogglingShare(true);
    try {
      const res = await fetch(`/api/sets/${setId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextPublic }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsPublicShare(data.isPublic);
        setShareSlug(data.shareSlug);
      }
    } catch {
      alert('Không thể cập nhật chia sẻ');
    } finally {
      setTogglingShare(false);
    }
  }

  function handleCopyShareLink() {
    if (!shareSlug || typeof window === 'undefined') return;
    const url = `${window.location.origin}/s/${shareSlug}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleFolderChange(folderId: string) {
    const newFolderId = folderId === '' ? null : folderId;
    setSet((prev) => (prev ? { ...prev, folderId: newFolderId } : prev));

    try {
      await fetch(`/api/sets/${setId}/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: newFolderId }),
      });
    } catch {
      // Non-blocking
    }
  }

  async function handleDuplicate() {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/sets/${setId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        router.push(`/sets/${data.set.id}`);
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sets/${setId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      }
    } catch {
      alert(vi.common.error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !set) {
    return (
      <div className="p-6 text-center space-y-4">
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

  const starredCount = cards.filter((c) => c.starred).length;
  const displayedCards = showStarredOnly ? cards.filter((c) => c.starred) : cards;

  const studyModes = [
    {
      title: vi.study.flashcards,
      desc: 'Lật thẻ và ghi nhớ',
      href: `/sets/${setId}/flashcards${showStarredOnly ? '?starred=true' : ''}`,
      icon: Layers,
      color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
    },
    {
      title: vi.study.learn,
      desc: 'Trắc nghiệm và gõ từ',
      href: `/sets/${setId}/learn${showStarredOnly ? '?starred=true' : ''}`,
      icon: GraduationCap,
      color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
    },
    {
      title: vi.study.test,
      desc: 'Kiểm tra trình độ',
      href: `/sets/${setId}/test`,
      icon: FileCheck2,
      color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
    },
    {
      title: vi.study.match,
      desc: 'Ghép cặp thuật ngữ',
      href: `/sets/${setId}/match`,
      icon: Gamepad2,
      color: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back and Top Actions */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-2">
          {/* Public Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            title="Chia sẻ học phần"
            className={`p-2.5 rounded-xl border transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
              isPublicShare
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDuplicate}
            disabled={isDuplicating}
            title={vi.sets.duplicate}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
          </button>
          <a
            href={`/api/sets/${setId}/export/csv`}
            download
            title={vi.bulk.exportCSV}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300"
          >
            <Download className="w-4 h-4" />
          </a>
          <Link
            href={`/sets/${setId}/edit`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">{vi.common.edit}</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            title={vi.common.delete}
            className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Set Header Info */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {set.title}
          </h1>
          {set.dueCount > 0 ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              {vi.sets.dueCount(set.dueCount)}
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300">
              {cards.length > 0 ? 'Đã hoàn thành ôn' : 'Chưa có thẻ'}
            </span>
          )}
        </div>

        {set.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {set.description}
          </p>
        )}

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{vi.sets.cardsCount(cards.length)}</span>
            {starredCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{starredCount} thẻ gắn sao</span>
              </span>
            )}
            {isPublicShare && (
              <span className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                <span>Công khai</span>
              </span>
            )}
          </div>

          {/* Folder dropdown assignment */}
          <div className="flex items-center gap-1.5">
            <FolderIcon className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={set.folderId || ''}
              onChange={(e) => handleFolderChange(e.target.value)}
              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              <option value="">Chưa phân vào thư mục</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  Thư mục: {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {set.dueCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="font-bold text-sm">Học phần này có {set.dueCount} từ vựng cần ôn tập</div>
            <div className="text-xs text-blue-100 mt-0.5">Thuật toán SRS đã tính toán thời điểm vàng để ôn lại</div>
          </div>
          <Link
            href={`/review?setId=${setId}`}
            className="px-4 py-2 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-semibold text-xs transition shadow-sm shrink-0 min-h-[44px] inline-flex items-center justify-center"
          >
            Ôn ngay
          </Link>
        </div>
      )}

      {/* Study Modes Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {vi.sets.studyModes}
          </h2>

          {starredCount > 0 && (
            <button
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                showStarredOnly
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  showStarredOnly ? 'fill-amber-500 text-amber-500' : 'text-gray-400'
                }`}
              />
              <span>Chỉ học thẻ gắn sao ({starredCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {studyModes.map((mode) => {
            const Icon = mode.icon;
            const disabled = displayedCards.length === 0;

            return (
              <Link
                key={mode.title}
                href={disabled ? '#' : mode.href}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between shadow-sm min-h-[110px] ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                    : `${mode.color} hover:scale-[1.02] active:scale-[0.98] cursor-pointer`
                }`}
                onClick={(e) => {
                  if (disabled) {
                    e.preventDefault();
                    alert('Vui lòng thêm thẻ vào học phần trước khi bắt đầu học.');
                  }
                }}
              >
                <Icon className="w-6 h-6 mb-2" />
                <div>
                  <div className="font-semibold text-sm leading-snug">{mode.title}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{mode.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {vi.cards.termLabel} trong học phần ({displayedCards.length})
          </h2>
          <Link
            href={`/sets/${setId}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm hoặc sửa thẻ</span>
          </Link>
        </div>

        {displayedCards.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {showStarredOnly ? 'Chưa có thẻ nào được gắn sao' : vi.sets.noCards}
            </p>
            {!showStarredOnly && (
              <Link
                href={`/sets/${setId}/edit`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>{vi.cards.addCard}</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedCards.map((card, idx) => (
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

                <div className="flex items-center gap-1 shrink-0">
                  {/* Star Toggle Button */}
                  <button
                    onClick={() => handleToggleStar(card.id)}
                    className="p-2 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    title={card.starred ? 'Bỏ gắn sao' : 'Gắn sao thẻ này'}
                    aria-label="Gắn sao"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        card.starred
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-gray-400 hover:text-amber-500'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => speak(card.term, card.audioUrl)}
                    className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    aria-label="Phát âm"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-gray-100">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span>Chia sẻ học phần</span>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Toggle public */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Chia sẻ công khai
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Bất kỳ ai có liên kết đều có thể xem và sao chép học phần này
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={togglingShare}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPublicShare ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                      isPublicShare ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Public URL Box */}
              {isPublicShare && shareSlug && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    Liên kết công khai
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={
                        typeof window !== 'undefined'
                          ? `${window.location.origin}/s/${shareSlug}`
                          : `/s/${shareSlug}`
                      }
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
                    />
                    <button
                      onClick={handleCopyShareLink}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[40px] cursor-pointer flex items-center gap-1.5"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[40px] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Xác nhận xóa học phần
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vi.sets.deleteConfirm}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px]"
              >
                {vi.common.cancel}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition min-h-[44px] disabled:opacity-50"
              >
                {isDeleting ? vi.common.loading : vi.common.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
