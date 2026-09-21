'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  Database,
  Download,
  Upload,
  KeyRound,
  Trash2,
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
  const router = useRouter();
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

  // Backup & Restore state
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Dark mode class sync
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: data.message || 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Đổi mật khẩu thất bại' });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'Lỗi kết nối máy chủ' });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/login');
      } else {

        setDeleteError(data.error || 'Xóa tài khoản thất bại');
      }
    } catch {
      setDeleteError('Lỗi kết nối máy chủ');
    } finally {
      setDeletingAccount(false);
    }
  }


  async function handleRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (restoreMode === 'replace') {
      if (!confirm(vi.backup.confirmReplace)) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setIsRestoring(true);
    setToast(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: restoreMode,
            backup: parsed,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setToast({
            type: 'success',
            message: vi.backup.restoreSuccess(
              data.restored.setsCount,
              data.restored.cardsCount
            ),
          });
          // Reload settings
          const sRes = await fetch('/api/settings');
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.settings) setSettings(sData.settings);
          }
        } else {
          setToast({ type: 'error', message: vi.backup.restoreFailed });
        }
      } catch {
        setToast({ type: 'error', message: vi.backup.restoreFailed });
      } finally {
        setIsRestoring(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

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

      {/* Backup & Restore Section */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {vi.backup.title}
          </h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {vi.backup.desc}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <a
            href="/api/backup"
            download
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-semibold transition min-h-[44px] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{vi.backup.exportButton}</span>
          </a>

          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value as 'merge' | 'replace')}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium min-h-[44px]"
            >
              <option value="merge">{vi.backup.mergeOption}</option>
              <option value="replace">{vi.backup.replaceOption}</option>
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            <button
              type="button"
              disabled={isRestoring}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-semibold transition min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isRestoring ? 'Đang khôi phục...' : vi.backup.restoreButton}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
          {vi.settings.account}
        </h2>

        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span>{vi.settings.changePassword}</span>
          </div>

          {passwordMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                passwordMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              {vi.settings.currentPassword}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              {vi.settings.newPassword}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Ít nhất 8 ký tự"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              {vi.settings.confirmNewPassword}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition min-h-[44px] cursor-pointer disabled:opacity-50"
          >
            {passwordLoading ? 'Đang cập nhật...' : vi.settings.updatePasswordBtn}
          </button>
        </form>

        {/* Logout & Delete Account Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <LogoutButton />

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition min-h-[44px] cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{vi.settings.deleteAccount}</span>
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-800 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
              {vi.settings.deleteAccount}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {vi.settings.deleteAccountWarning}
            </p>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
              {vi.settings.deleteAccountConfirmPrompt}
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Gõ "XÓA TÀI KHOẢN" hoặc email...'
              className="w-full px-3.5 py-2.5 rounded-xl border border-red-300 dark:border-red-900 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            {deleteError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px]"
              >
                {vi.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deleteConfirmText.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition min-h-[44px] disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? 'Đang xóa...' : vi.settings.deleteAccountBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

