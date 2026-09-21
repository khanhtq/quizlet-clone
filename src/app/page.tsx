import { getCurrentUser } from '@/server/auth';
import { redirect } from 'next/navigation';
import { vi } from '@/lib/i18n/vi';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
          {vi.common.appName}
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Xin chào, {user.email}!</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Chào mừng bạn đến với hệ thống học từ vựng Quizlet Clone.
          </p>
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-sm">
            {vi.sets.emptySets}
          </div>
        </div>
      </main>
    </div>
  );
}
