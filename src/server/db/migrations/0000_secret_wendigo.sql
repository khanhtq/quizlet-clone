CREATE TABLE `api_usage` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_usage_unique` ON `api_usage` (`user_id`,`day`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_api_usage_user_id` ON `api_usage` (`user_id`);--> statement-breakpoint
CREATE TABLE `card_progress` (
	`card_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`repetitions` integer DEFAULT 0 NOT NULL,
	`ease_factor` integer DEFAULT 250 NOT NULL,
	`interval_days` integer DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`last_reviewed_at` integer,
	`lapses` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_card_progress_user_id` ON `card_progress` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_card_progress_user_due` ON `card_progress` (`user_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` text NOT NULL,
	`user_id` text NOT NULL,
	`term` text NOT NULL,
	`definition` text NOT NULL,
	`phonetic` text,
	`part_of_speech` text,
	`example` text,
	`audio_url` text,
	`position` integer DEFAULT 0 NOT NULL,
	`starred` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`set_id`) REFERENCES `sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cards_set_id` ON `cards` (`set_id`);--> statement-breakpoint
CREATE INDEX `idx_cards_user_id` ON `cards` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_cards_user_term` ON `cards` (`user_id`,`term`);--> statement-breakpoint
CREATE TABLE `dictionary_cache` (
	`word` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`source` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_folders_user_id` ON `folders` (`user_id`);--> statement-breakpoint
CREATE TABLE `match_scores` (
	`user_id` text NOT NULL,
	`set_id` text NOT NULL,
	`best_ms` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`set_id`) REFERENCES `sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_match_scores_unique` ON `match_scores` (`user_id`,`set_id`);--> statement-breakpoint
CREATE INDEX `idx_match_scores_user_id` ON `match_scores` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_match_scores_set_id` ON `match_scores` (`set_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rate_limits_reset_at` ON `rate_limits` (`reset_at`);--> statement-breakpoint
CREATE TABLE `review_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`card_id` text NOT NULL,
	`rating` text NOT NULL,
	`mode` text NOT NULL,
	`elapsed_ms` integer DEFAULT 0 NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_logs_user_id` ON `review_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_review_logs_card_id` ON `review_logs` (`card_id`);--> statement-breakpoint
CREATE INDEX `idx_review_logs_user_reviewed` ON `review_logs` (`user_id`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`folder_id` text,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT false NOT NULL,
	`share_slug` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_studied_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `folders`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sets_share_slug_unique` ON `sets` (`share_slug`);--> statement-breakpoint
CREATE INDEX `idx_sets_user_id` ON `sets` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sets_folder_id` ON `sets` (`folder_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`meaning_language` text DEFAULT 'both' NOT NULL,
	`new_cards_per_day` integer DEFAULT 20 NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`tts_autoplay` integer DEFAULT false NOT NULL,
	`default_direction` text DEFAULT 'term' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);