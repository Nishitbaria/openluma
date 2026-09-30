ALTER TABLE "attendee_checkins" DROP CONSTRAINT "attendee_checkins_checked_in_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_invited_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "invited_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attendee_checkins" ADD CONSTRAINT "attendee_checkins_checked_in_by_user_id_fk" FOREIGN KEY ("checked_in_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;