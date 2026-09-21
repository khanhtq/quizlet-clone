'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { vi } from '@/lib/i18n/vi';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-3.5 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer min-h-[44px] flex items-center justify-center"
    >
      {vi.auth.logoutButton}
    </button>
  );
}
