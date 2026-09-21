'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

export default function CreateSetPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(vi.sets.titleLabel + ' không được để trống');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || vi.common.error);
        setLoading(false);
        return;
      }

      // Redirect to edit page to add cards
      router.push(`/sets/${data.set.id}/edit`);
    } catch {
      setError(vi.common.error);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          {vi.sets.createTitle}
        </h1>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-semibold mb-1.5">
            {vi.sets.titleLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={vi.sets.titlePlaceholder}
            className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-base"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold mb-1.5">
            {vi.sets.descriptionLabel}
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={vi.sets.descriptionPlaceholder}
            className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-base resize-none"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            {vi.common.cancel}
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition min-h-[44px] cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? vi.common.loading : vi.sets.createTitle}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
