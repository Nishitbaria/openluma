TRUNCATE TABLE "chat_messages";--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_user_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "chat_messages_user_id_idx";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "conversation_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "parts" json NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_conversations_user_id_idx" ON "chat_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_conversations_updated_at_idx" ON "chat_conversations" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_id_idx" ON "chat_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_conversation_order_unique" ON "chat_messages" USING btree ("conversation_id","order");--> statement-breakpoint
ALTER TABLE "chat_messages" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "chat_messages" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "chat_messages" DROP COLUMN "tool_call_id";--> statement-breakpoint
ALTER TABLE "chat_messages" DROP COLUMN "tool_name";