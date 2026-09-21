'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  BookOpen,
  ArrowRight,
  Folder as FolderIcon,
  FolderPlus,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface SetItem {
  id: string;
  title: string;
  description: string | null;
  folderId: string | null;
  cardCount: number;
  dueCount: number;
  lastStudiedAt: number | null;
  updatedAt: number;
}

interface FolderItem {
  id: string;
  name: string;
  setsCount: number;
}

export default function SetList() {
  const [sets, setSets] = useState<SetItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Folder creation modal state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Folder rename/delete state
  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [setsRes, foldersRes] = await Promise.all([
          fetch('/api/sets'),
          fetch('/api/folders'),
        ]);

        if (!setsRes.ok) throw new Error();

        const setsData = await setsRes.json();
        const foldersData = foldersRes.ok ? await foldersRes.json() : { folders: [] };

        if (!ignore) {
          setSets(setsData.sets || []);
          setFolders(foldersData.folders || []);
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          setError(vi.common.error);
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName }),
      });

      if (res.ok) {
        const data = await res.json();
        setFolders((prev) => [
          ...prev,
          { id: data.folder.id, name: data.folder.name, setsCount: 0 },
        ]);
        setNewFolderName('');
        setShowCreateFolder(false);
        setSelectedFolderId(data.folder.id);
      }
    } catch {
      alert('Không thể tạo thư mục');
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleUpdateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFolder || !editFolderName.trim()) return;

    try {
      const res = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFolderName }),
      });

      if (res.ok) {
        setFolders((prev) =>
          prev.map((f) => (f.id === editingFolder.id ? { ...f, name: editFolderName } : f))
        );
        setEditingFolder(null);
      }
    } catch {
      alert('Không thể đổi tên thư mục');
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa thư mục này? Các học phần bên trong sẽ không bị xóa.')) {
      return;
    }

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setFolders((prev) => prev.filter((f) => f.id !== folderId));
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        // Unlink sets in local state
        setSets((prev) =>
          prev.map((s) => (s.folderId === folderId ? { ...s, folderId: null } : s))
        );
      }
    } catch {
      alert('Không thể xóa thư mục');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={() => window.location.reload()}
          className="font-medium underline cursor-pointer"
        >
          {vi.common.refresh}
        </button>
      </div>
    );
  }

  // Filter sets by folder
  const filteredSets = selectedFolderId
    ? sets.filter((s) => s.folderId === selectedFolderId)
    : sets;

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <div className="space-y-5">
      {/* Top Header: Sets count & Actions */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {vi.sets.title} ({filteredSets.length})
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition min-h-[38px] cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Thư mục mới</span>
          </button>

          <Link
            href="/sets/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[38px] shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{vi.sets.newSet}</span>
          </Link>
        </div>
      </div>

      {/* Folders Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedFolderId(null)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
            selectedFolderId === null
              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Tất cả ({sets.length})
        </button>

        {folders.map((folder) => {
          const isSelected = selectedFolderId === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <FolderIcon className="w-3.5 h-3.5" />
              <span>{folder.name}</span>
              <span className="opacity-75 font-normal">({folder.setsCount})</span>
            </button>
          );
        })}
      </div>

      {/* Selected Folder Header & Actions (if a folder is active) */}
      {currentFolder && (
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-semibold">
            <FolderIcon className="w-4 h-4 text-blue-600" />
            <span>Thư mục: {currentFolder.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingFolder(currentFolder);
                setEditFolderName(currentFolder.name);
              }}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
              title="Đổi tên thư mục"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteFolder(currentFolder.id)}
              className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
              title="Xóa thư mục"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sets List */}
      {filteredSets.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {selectedFolderId ? 'Thư mục chưa có học phần nào' : vi.sets.emptySets}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
            {selectedFolderId
              ? 'Bạn có thể chọn thư mục này khi tạo hoặc chỉnh sửa học phần.'
              : 'Tạo học phần mới để lưu từ vựng và bắt đầu ghi nhớ với phương pháp Spaced Repetition.'}
          </p>
          <Link
            href="/sets/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition shadow-sm min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>{vi.sets.createNewSet}</span>
          </Link>

        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredSets.map((set) => (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
              className="group p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow transition flex flex-col justify-between min-h-[140px] cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                    {set.title}
                  </h3>
                  {set.dueCount > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
                      {vi.sets.dueCount(set.dueCount)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                      {vi.sets.cardsCount(set.cardCount)}
                    </span>
                  )}
                </div>

                {set.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {set.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                <span>{vi.sets.cardsCount(set.cardCount)}</span>
                <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Học ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                Tạo thư mục mới
              </h3>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Tên thư mục (ví dụ: IELTS, Từ vựng chuyên ngành)..."
                autoFocus
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolder(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[40px]"
                >
                  {vi.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[40px] disabled:opacity-50 cursor-pointer"
                >
                  {creatingFolder ? 'Đang tạo...' : 'Tạo thư mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {editingFolder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              Đổi tên thư mục
            </h3>

            <form onSubmit={handleUpdateFolder} className="space-y-4">
              <input
                type="text"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                autoFocus
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFolder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[40px]"
                >
                  {vi.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!editFolderName.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[40px] cursor-pointer"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
