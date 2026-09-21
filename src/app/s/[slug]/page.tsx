import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicSetBySlug } from '@/server/queries/share';
import { getCurrentUser } from '@/server/auth';
import CopyPublicSetButton from '@/components/sets/CopyPublicSetButton';
import PublicCardList from '@/components/sets/PublicCardList';
import { ArrowLeft, Layers, Globe } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicSetPage(props: Props) {
  const params = await props.params;
  const slug = params.slug;

  const data = await getPublicSetBySlug(slug);
  if (!data) {
    notFound();
  }

  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Copy to my sets / Login action */}
        {user ? (
          <CopyPublicSetButton slug={slug} />
        ) : (
          <Link
            href={`/login?redirect=/s/${slug}`}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm min-h-[44px] inline-flex items-center justify-center"
          >
            Đăng nhập để sao chép học phần
          </Link>
        )}
      </div>

      {/* Set Header */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <Globe className="w-4 h-4" />
          <span>Học phần công khai (Chỉ xem)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {data.set.title}
        </h1>

        {data.set.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
            {data.set.description}
          </p>
        )}

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-4 h-4" />
            <span>{data.cards.length} thuật ngữ</span>
          </span>
        </div>
      </div>

      {/* Cards list with TTS */}
      <PublicCardList cards={data.cards} />
    </div>
  );
}
