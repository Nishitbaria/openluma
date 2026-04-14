CREATE TYPE "public"."question_type" AS ENUM('text', 'paragraph', 'checkbox', 'dropdown');--> statement-breakpoint
CREATE TABLE "event_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"label" text NOT NULL,
	"type" "question_type" DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"options" json
);
--> statement-breakpoint
ALTER TABLE "rsvps" ADD COLUMN "custom_answers" json;--> statement-breakpoint
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_questions_event_id_idx" ON "event_questions" USING btree ("event_id");