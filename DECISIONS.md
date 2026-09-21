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
- **dictionary lookup & LLM fallback**: Parallelized Free Dictionary API and Anthropic Claude (with daily cap & user rate limits), caching merged results in `dictionary_cache` and falling back gracefully without API key.
- **autocomplete**: Combined user's terms with Datamuse suggestions under 200ms debounce with full keyboard accessibility.
- **srs timezone handling**: Target due dates for intervals >= 1 day calculate the exact matching clock time in the user's timezone using `Intl.DateTimeFormat` and offset refinement.
- **deterministic srs undo**: Replaying chronological review logs for the card reconstructs the exact prior SRS state on undo without requiring historical snapshot columns.
- **in-session again re-queueing**: Implemented in-session queueing of cards rated 'again' to re-test after ~10 minutes or immediately before completing the session.
- **bulk add concurrency 3**: Managed async auto-lookup for terms without definition using a client-side concurrency worker pool of 3 with live progress indication.
- **rfc 4180 csv with utf-8 bom**: Prepend byte order mark `\uFEFF` on CSV exports to guarantee flawless rendering of Vietnamese accents across Microsoft Excel, Google Sheets, and standard spreadsheet software.
- **json backup re-keying on restore**: When importing foreign JSON backups, re-key collided IDs with `nanoid()` while maintaining relational integrity (folders -> sets -> cards -> progress -> logs) to prevent cross-user ID collision or data corruption.
- **learn 2-stage progression**: Implemented `new` (4-choice distractors) -> `familiar` (typed answer with diacritic/fuzzy and edit distance 1 "gần đúng" tolerance) -> `mastered` with in-session cycling, wrong answer demotion, and `review_logs` persistence with `mode: 'learn'`.
- **test mode customizable generator**: Dynamic test creation supporting user-configured question counts and enabled types (Trắc nghiệm, Đúng/Sai, Tự luận), full review summary, and a targeted "Làm lại các câu sai" retry workflow.
- **match game timer & best score**: 6-pair (12 tiles) shuffled interactive grid with live tenths-of-second timer, tap-to-pair feedback, and server-side personal best persistence in `match_scores`.

