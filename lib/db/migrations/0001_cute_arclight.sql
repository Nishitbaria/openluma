CREATE TYPE "public"."invitation_role" AS ENUM('attendee', 'cohost');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "events" SET "slug" = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(md5(id) from 1 for 6) WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "role" "invitation_role" DEFAULT 'attendee' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "event_cohosts_event_user_unique" ON "event_cohosts" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_unique_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_user_unique" ON "rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_slug_unique" UNIQUE("slug");