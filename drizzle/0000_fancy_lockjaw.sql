CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`refined_text` text,
	`raw_text` text,
	`edited_text` text,
	`audio` blob,
	`audio_local_path` text,
	`duration` real,
	`status` text,
	`mode` text DEFAULT 'voice_transcript' NOT NULL,
	`app_version` text DEFAULT '0.1.0' NOT NULL,
	`detected_language` text,
	`focused_app_name` text,
	`focused_app_bundle_id` text,
	`focused_app_window_title` text,
	`focused_app_window_web_domain` text,
	`focused_app_window_web_url` text,
	`mic_device` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `history_id_unique` ON `history` (`id`);--> statement-breakpoint
CREATE INDEX `idx_history_status` ON `history` (`status`);--> statement-breakpoint
CREATE INDEX `idx_history_created_at` ON `history` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_history_app_name_created_at` ON `history` (`focused_app_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_history_detected_language` ON `history` (`detected_language`);