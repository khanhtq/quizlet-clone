import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import LogoutButton from '@/components/auth/LogoutButton';

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto py-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label={vi.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{vi.nav.settings}</h1>
      </div>

      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-semibold">Tài khoản</h2>
        <div className="pt-2">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
