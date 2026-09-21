'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { vi } from '@/lib/i18n/vi';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(vi.auth.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(vi.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || vi.common.error);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError(vi.common.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{vi.auth.registerTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {vi.auth.registerSubtitle}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
            >
              {vi.auth.emailLabel}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={vi.auth.emailPlaceholder}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              {vi.auth.passwordLabel}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={vi.auth.passwordPlaceholder}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-1"
            >
              {vi.auth.confirmPasswordLabel}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={vi.auth.confirmPasswordPlaceholder}
              className="w-full h-11 px-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
          >
            {loading ? vi.auth.registering : vi.auth.registerButton}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <span>{vi.auth.haveAccount} </span>
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-500 font-semibold underline-offset-4 hover:underline"
          >
            {vi.auth.loginNow}
          </Link>
        </div>
      </div>
    </div>
  );
}
