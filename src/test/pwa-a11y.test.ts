import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import manifest from '../app/manifest';

describe('PWA & Accessibility Verification (M11)', () => {
  const rootDir = process.cwd();

  it('generates all required PWA icon sizes and formats', () => {
    const iconsDir = path.join(rootDir, 'public', 'icons');
    expect(fs.existsSync(path.join(iconsDir, 'icon-192.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-512.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'icon-maskable-512.png'))).toBe(true);
    expect(fs.existsSync(path.join(iconsDir, 'apple-touch-icon.png'))).toBe(true);
  });

  it('serves a valid Web App Manifest per PWA standards', () => {
    const m = manifest();
    expect(m.name).toBe('Quizlet Clone - Học từ vựng');
    expect(m.short_name).toBe('Quizlet');
    expect(m.display).toBe('standalone');
    expect(m.theme_color).toBe('#2563eb');
    expect(m.icons).toBeDefined();
    expect(m.icons!.length).toBeGreaterThanOrEqual(4);

    const maskable = m.icons!.find((i) => i.purpose === 'maskable');
    expect(maskable).toBeDefined();
    expect(maskable?.sizes).toBe('512x512');
  });

  it('configures service worker with online-first policy, offline fallback, and skips api', () => {
    const swPath = path.join(rootDir, 'public', 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    // Offline fallback URL
    expect(swContent).toContain('/offline');
    // API calls bypass service worker caching
    expect(swContent).toContain("url.pathname.startsWith('/api/')");
    // Document navigation fallback
    expect(swContent).toContain("event.request.mode === 'navigate'");
  });

  it('provides CSS rules for prefers-reduced-motion and accessible focus-visible', () => {
    const cssPath = path.join(rootDir, 'src', 'app', 'globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('prefers-reduced-motion');
    expect(cssContent).toContain(':focus-visible');
    expect(cssContent).toContain('.pb-safe');
  });
});
