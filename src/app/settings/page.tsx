'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  Globe,
  Clock,
  Volume2,
  Layers,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { vi } from '@/lib/i18n/vi';
import LogoutButton from '@/components/auth/LogoutButton';

interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  meaningLanguage: 'vi' | 'en' | 'both';
  newCardsPerDay: number;
  timezone: string;
  ttsAutoplay: boolean;
  defaultDirection: 'term' | 'definition' | 'mixed';
}

const COMMON_TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'UTC',
  'Asia/Bangkok',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Australia/Sydney',
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    meaningLanguage: 'both',
    newCardsPerDay: 20,
    timezone: 'Asia/Ho_Chi_Minh',
    ttsAutoplay: false,
    defaultDirection: 'term',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.settings) {
            setSettings(data.settings);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setToast({ type: 'success', message: vi.settings.savedSuccess });
      } else {
        setToast({ type: 'error', message: vi.settings.saveFailed });
      }
    } catch {
      setToast({ type: 'error', message: vi.settings.saveFailed });
    } finally {
      setSaving(false);
    }
  }

  // Detect browser timezone if not set
  function detectTimezone() {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setSettings((prev) => ({ ...prev, timezone: detected }));
      }
    } catch {
      // Ignore
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-6">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label={vi.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {vi.settings.title}
            </h1>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Study Preferences Section */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>{vi.settings.studyPreferences}</span>
          </h2>

          {/* New cards per day */}
          <div className="space-y-1.5">
            <label
              htmlFor="newCardsPerDay"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              {vi.settings.newCardsPerDay}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="newCardsPerDay"
                type="number"
                min={1}
                max={100}
                value={settings.newCardsPerDay}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    newCardsPerDay: Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 20)),
                  }))
                }
                className="w-28 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
              <span className="text-xs text-gray-500">
                (Từ 1 đến 100 thẻ mỗi ngày)
              </span>
            </div>
          </div>

          {/* Meaning Language */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gray-400" />
              <span>{vi.settings.meaningLanguage}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'both', label: vi.settings.langBoth },
                { value: 'vi', label: vi.settings.langVi },
                { value: 'en', label: vi.settings.langEn },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      meaningLanguage: opt.value as 'vi' | 'en' | 'both',
                    }))
                  }
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition min-h-[44px] cursor-pointer text-left ${
                    settings.meaningLanguage === opt.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600'
                      : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Direction */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {vi.settings.defaultDirection}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: 'term', label: vi.settings.dirTerm },
                { value: 'definition', label: vi.settings.dirDef },
                { value: 'mixed', label: vi.settings.dirMixed },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultDirection: opt.value as 'term' | 'definition' | 'mixed',
                    }))
                  }
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition min-h-[44px] cursor-pointer text-left ${
                    settings.defaultDirection === opt.value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600'
                      : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* TTS Autoplay Toggle */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="ttsAutoplay"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-blue-500" />
                <span>{vi.settings.ttsAutoplay}</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {vi.settings.ttsAutoplayDesc}
              </p>
            </div>
            <input
              id="ttsAutoplay"
              type="checkbox"
              checked={settings.ttsAutoplay}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, ttsAutoplay: e.target.checked }))
              }
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 cursor-pointer"
            />
          </div>
        </div>

        {/* General Settings Section */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>{vi.settings.general}</span>
          </h2>

          {/* Timezone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="timezone"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                {vi.settings.timezone}
              </label>
              <button
                type="button"
                onClick={detectTimezone}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Tự động nhận diện
              </button>
            </div>
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, timezone: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            >
              {!COMMON_TIMEZONES.includes(settings.timezone) && (
                <option value={settings.timezone}>{settings.timezone}</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Múi giờ được dùng để xác định đúng thời điểm chuyển ngày và nhắc nhở ôn tập Spaced Repetition.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              {vi.settings.theme}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'system', label: vi.settings.themeSystem, icon: Laptop },
                { value: 'light', label: vi.settings.themeLight, icon: Sun },
                { value: 'dark', label: vi.settings.themeDark, icon: Moon },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        theme: opt.value as 'system' | 'light' | 'dark',
                      }))
                    }
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition min-h-[44px] cursor-pointer ${
                      settings.theme === opt.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-600'
                        : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition min-h-[44px] shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? vi.settings.saving : vi.settings.saveButton}</span>
          </button>
        </div>
      </form>

      {/* Account Section */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {vi.settings.account}
        </h2>
        <div className="pt-1">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
