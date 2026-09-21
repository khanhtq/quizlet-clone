import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

export default function ReviewPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{vi.nav.reviewToday}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Thuật toán Spaced Repetition (SRS) sẽ tự động tính toán thời điểm vàng để bạn ôn lại các từ vựng cần nhớ.
      </p>
      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
      </div>
    </div>
  );
}
