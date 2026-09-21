# Architectural & Implementation Decisions

- **lucide-react**: Added for accessible and consistent UI icons across responsive shell, flashcards, and navigation without heavy bundle overhead.
- **@types/node@^22**: Installed to align with host Node.js v22.19.0 and fulfill Vitest peer dependency.
- **rate_limits table**: Added dedicated table in SQLite/LibSQL to support serverless rate limiting for login (by IP+email) and signup (by IP) as required by Section 9.
- **src/proxy.ts**: Adopted Next.js 16 `proxy.ts` convention to eliminate middleware deprecation warning.
- **src/server/queries**: Structured user-scoped database access layer ensuring strict multi-tenant data isolation.
- **vitest fileParallelism: false**: Configured Vitest to run sequentially to avoid SQLite `SQLITE_BUSY: database is locked` during concurrent file writes.
- **responsive shell**: Implemented `AppShell` with desktop sticky sidebar (>= 1024px) and mobile bottom tab bar (< 1024px) with safe-area insets and touch targets >= 44px.
- **flashcards 3d & swipe**: Implemented CSS 3D transforms and pointer events without external animation libraries, supporting 30% threshold swipe, tilt feedback, TTS, and keyboard shortcuts.
- **study direction persistence**: Stored per-set direction preference in localStorage under `quizlet_direction_${setId}`.
