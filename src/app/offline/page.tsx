'use client';

import React from 'react';
import { WifiOff, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
          <WifiOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Bạn đang ngoại tuyến
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Quizlet Clone hoạt động tối ưu nhất khi có kết nối internet. Vui lòng kiểm tra lại Wi-Fi hoặc mạng di động của bạn.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition min-h-[44px] cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử tải lại trang</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
