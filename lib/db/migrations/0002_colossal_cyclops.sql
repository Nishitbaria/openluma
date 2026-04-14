ALTER TABLE "events" ADD COLUMN "rich_description" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "reminder_sent_24h" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "reminder_sent_1h" boolean DEFAULT false NOT NULL;