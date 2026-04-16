CREATE TABLE "event_pageviews" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"ip_hash" text NOT NULL,
	"referrer" text,
	"city" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_pageviews" ADD CONSTRAINT "event_pageviews_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_pageviews_event_id_idx" ON "event_pageviews" USING btree ("event_id");