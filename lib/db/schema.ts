import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Better Auth Required Tables ─────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ─── Application Enums ───────────────────────────────────────────────────────

export const eventTypeEnum = pgEnum("event_type", [
  "in_person",
  "virtual",
  "hybrid",
]);

export const eventVisibilityEnum = pgEnum("event_visibility", [
  "public",
  "private",
]);

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "pending",
  "approved",
  "rejected",
  "waitlisted",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
  "expired",
]);

export const invitationRoleEnum = pgEnum("invitation_role", [
  "attendee",
  "cohost",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "text",
  "paragraph",
  "checkbox",
  "dropdown",
  "social_profile",
  "company",
  "phone",
  "website",
  "terms",
]);

// ─── Application Tables ──────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
});

export const events = pgTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    richDescription: text("rich_description"),
    coverImage: text("cover_image"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    timezone: text("timezone").notNull().default("UTC"),
    location: text("location"),
    locationDetails: text("location_details"),
    type: eventTypeEnum("type").notNull().default("in_person"),
    visibility: eventVisibilityEnum("visibility").notNull().default("public"),
    capacity: integer("capacity"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    reminderSent24h: boolean("reminder_sent_24h").notNull().default(false),
    reminderSent1h: boolean("reminder_sent_1h").notNull().default(false),
    hostId: text("host_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("events_slug_unique_idx").on(table.slug),
    index("events_host_id_idx").on(table.hostId),
    index("events_start_time_idx").on(table.startTime),
    index("events_visibility_idx").on(table.visibility),
  ],
);

export const eventTags = pgTable(
  "event_tags",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => [index("event_tags_event_id_idx").on(table.eventId)],
);

export const eventQuestions = pgTable(
  "event_questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: questionTypeEnum("type").notNull().default("text"),
    required: boolean("required").notNull().default(false),
    order: integer("order").notNull().default(0),
    options: json("options").$type<string[]>(),
  },
  (table) => [index("event_questions_event_id_idx").on(table.eventId)],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull().default("pending"),
    message: text("message"),
    customAnswers: json("custom_answers").$type<Record<string, string | boolean>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("rsvps_event_id_idx").on(table.eventId),
    index("rsvps_user_id_idx").on(table.userId),
    uniqueIndex("rsvps_event_user_unique").on(table.eventId, table.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    role: invitationRoleEnum("role").notNull().default("attendee"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  (table) => [
    index("invitations_event_id_idx").on(table.eventId),
    index("invitations_token_idx").on(table.token),
  ],
);

export const eventCohosts = pgTable(
  "event_cohosts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_cohosts_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
  ],
);

export const attendeeCheckins = pgTable("attendee_checkins", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
  checkedInBy: text("checked_in_by").references(() => user.id),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    toolCallId: text("tool_call_id"),
    toolName: text("tool_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("chat_messages_user_id_idx").on(table.userId)],
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  events: many(events),
  rsvps: many(rsvps),
  cohostedEvents: many(eventCohosts),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  host: one(user, { fields: [events.hostId], references: [user.id] }),
  category: one(categories, {
    fields: [events.categoryId],
    references: [categories.id],
  }),
  rsvps: many(rsvps),
  invitations: many(invitations),
  cohosts: many(eventCohosts),
  tags: many(eventTags),
  questions: many(eventQuestions),
  checkins: many(attendeeCheckins),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, { fields: [eventTags.eventId], references: [events.id] }),
}));

export const eventQuestionsRelations = relations(eventQuestions, ({ one }) => ({
  event: one(events, { fields: [eventQuestions.eventId], references: [events.id] }),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
  user: one(user, { fields: [rsvps.userId], references: [user.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  event: one(events, {
    fields: [invitations.eventId],
    references: [events.id],
  }),
  inviter: one(user, {
    fields: [invitations.invitedBy],
    references: [user.id],
  }),
}));

export const eventCohostsRelations = relations(eventCohosts, ({ one }) => ({
  event: one(events, {
    fields: [eventCohosts.eventId],
    references: [events.id],
  }),
  user: one(user, { fields: [eventCohosts.userId], references: [user.id] }),
}));

export const attendeeCheckinsRelations = relations(
  attendeeCheckins,
  ({ one }) => ({
    event: one(events, {
      fields: [attendeeCheckins.eventId],
      references: [events.id],
    }),
    user: one(user, {
      fields: [attendeeCheckins.userId],
      references: [user.id],
    }),
    checkedBy: one(user, {
      fields: [attendeeCheckins.checkedInBy],
      references: [user.id],
      relationName: "checkedBy",
    }),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(user, { fields: [chatMessages.userId], references: [user.id] }),
}));
