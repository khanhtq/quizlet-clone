import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// 1. users: id, email (unique, lowercased), password_hash, created_at
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull(),
});

// 2. user_settings: user_id (pk), theme (system|light|dark), meaning_language (vi|en|both),
// new_cards_per_day, timezone, tts_autoplay, default_direction (term|definition|mixed)
export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  meaningLanguage: text('meaning_language', { enum: ['vi', 'en', 'both'] })
    .notNull()
    .default('both'),
  newCardsPerDay: integer('new_cards_per_day').notNull().default(20),
  timezone: text('timezone').notNull().default('UTC'),
  ttsAutoplay: integer('tts_autoplay', { mode: 'boolean' }).notNull().default(false),
  defaultDirection: text('default_direction', {
    enum: ['term', 'definition', 'mixed'],
  })
    .notNull()
    .default('term'),
});

// 3. folders: id, user_id, name, created_at
export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    index('idx_folders_user_id').on(table.userId),
  ]
);

// 4. sets: id, user_id, folder_id (nullable), title, description, is_public, share_slug, created_at, updated_at, last_studied_at
export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => folders.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description'),
    isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
    shareSlug: text('share_slug').unique(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    lastStudiedAt: integer('last_studied_at'),
  },
  (table) => [
    index('idx_sets_user_id').on(table.userId),
    index('idx_sets_folder_id').on(table.folderId),
  ]
);

// 5. cards: id, set_id, user_id, term, definition, phonetic, part_of_speech, example, audio_url, position, starred, created_at, updated_at
export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    setId: text('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    term: text('term').notNull(),
    definition: text('definition').notNull(),
    phonetic: text('phonetic'),
    partOfSpeech: text('part_of_speech'),
    example: text('example'),
    audioUrl: text('audio_url'),
    position: integer('position').notNull().default(0),
    starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('idx_cards_set_id').on(table.setId),
    index('idx_cards_user_id').on(table.userId),
    index('idx_cards_user_term').on(table.userId, table.term),
  ]
);

// 6. card_progress: card_id (pk), user_id, repetitions, ease_factor, interval_days, due_at, last_reviewed_at, lapses
export const cardProgress = sqliteTable(
  'card_progress',
  {
    cardId: text('card_id')
      .primaryKey()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    repetitions: integer('repetitions').notNull().default(0),
    easeFactor: integer('ease_factor').notNull().default(250), // Stored as integer * 100 for exact precision (2.5 -> 250)
    intervalDays: integer('interval_days').notNull().default(0),
    dueAt: integer('due_at').notNull(),
    lastReviewedAt: integer('last_reviewed_at'),
    lapses: integer('lapses').notNull().default(0),
  },
  (table) => [
    index('idx_card_progress_user_id').on(table.userId),
    index('idx_card_progress_user_due').on(table.userId, table.dueAt),
  ]
);

// 7. review_logs: id, user_id, card_id, rating (again|hard|good|easy), mode, elapsed_ms, reviewed_at
export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    rating: text('rating', { enum: ['again', 'hard', 'good', 'easy'] }).notNull(),
    mode: text('mode', {
      enum: ['flashcards', 'review', 'learn', 'test', 'match'],
    }).notNull(),
    elapsedMs: integer('elapsed_ms').notNull().default(0),
    reviewedAt: integer('reviewed_at').notNull(),
  },
  (table) => [
    index('idx_review_logs_user_id').on(table.userId),
    index('idx_review_logs_card_id').on(table.cardId),
    index('idx_review_logs_user_reviewed').on(table.userId, table.reviewedAt),
  ]
);

// 8. dictionary_cache: word (pk, lowercased), payload_json, source, fetched_at
export const dictionaryCache = sqliteTable('dictionary_cache', {
  word: text('word').primaryKey(),
  payloadJson: text('payload_json').notNull(),
  source: text('source').notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

// 9. api_usage: user_id, day, kind, count
export const apiUsage = sqliteTable(
  'api_usage',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: text('day').notNull(), // 'YYYY-MM-DD'
    kind: text('kind').notNull(), // 'llm_lookup', etc.
    count: integer('count').notNull().default(0),
  },
  (table) => [
    uniqueIndex('idx_api_usage_unique').on(table.userId, table.day, table.kind),
    index('idx_api_usage_user_id').on(table.userId),
  ]
);

// 10. match_scores: user_id, set_id, best_ms
export const matchScores = sqliteTable(
  'match_scores',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    setId: text('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    bestMs: integer('best_ms').notNull(),
  },
  (table) => [
    uniqueIndex('idx_match_scores_unique').on(table.userId, table.setId),
    index('idx_match_scores_user_id').on(table.userId),
    index('idx_match_scores_set_id').on(table.setId),
  ]
);

// 11. rate_limits: key (pk), count, reset_at, created_at (for serverless DB rate limiting)
export const rateLimits = sqliteTable(
  'rate_limits',
  {
    key: text('key').primaryKey(), // e.g. "login:ip:email" or "signup:ip"
    count: integer('count').notNull().default(1),
    resetAt: integer('reset_at').notNull(),
  },
  (table) => [
    index('idx_rate_limits_reset_at').on(table.resetAt),
  ]
);
