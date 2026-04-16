CREATE TABLE "rsvp_timeline" (
	"id" text PRIMARY KEY NOT NULL,
	"rsvp_id" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"changed_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvp_timeline" ADD CONSTRAINT "rsvp_timeline_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_timeline" ADD CONSTRAINT "rsvp_timeline_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;