'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, Search, Settings, LogOut } from 'lucide-react';
import { vi } from '@/lib/i18n/vi';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
}

export default function AppShell({ children, userEmail }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // If on login or register, don't show the main shell
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/', label: vi.nav.home, icon: Home },
    { href: '/review', label: vi.nav.reviewToday, icon: Calendar },
    { href: '/search', label: vi.nav.search, icon: Search },
    { href: '/settings', label: vi.nav.settings, icon: Settings },
  ];

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      {/* Desktop Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sticky top-0 h-screen select-none">
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            Q
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight text-blue-600 dark:text-blue-400">
              {vi.common.appName}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Flashcard & SRS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition min-h-[44px] ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {userEmail && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 truncate">
              {userEmail}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer min-h-[44px]"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{vi.auth.logoutButton}</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header (< 1024px) */}
        <header className="lg:hidden h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between sticky top-0 z-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              Q
            </div>
            <span className="font-bold text-base text-blue-600 dark:text-blue-400">
              {vi.common.appName}
            </span>
          </Link>
          <button
            onClick={handleLogout}
            title={vi.auth.logoutButton}
            aria-label={vi.auth.logoutButton}
            className="p-2 text-gray-500 hover:text-red-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content with bottom padding on mobile for tab bar and safe-area */}
        <main className="flex-1 pb-24 lg:pb-8 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar (< 1024px) */}
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-30 px-2 py-1 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[44px] min-h-[48px] px-3 py-1 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
