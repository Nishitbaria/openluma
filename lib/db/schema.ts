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
  bio: text("bio"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  id: text("id").primaryKey(),
  ipAddress: text("ip_address"),
  token: text("token").notNull().unique(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  accountId: text("account_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  id: text("id").primaryKey(),
  idToken: text("id_token"),
  password: text("password"),
  providerId: text("provider_id").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const verification = pgTable("verification", {
  createdAt: timestamp("created_at"),
  expiresAt: timestamp("expires_at").notNull(),
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  updatedAt: timestamp("updated_at"),
  value: text("value").notNull(),
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
  description: text("description"),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const events = pgTable(
  "events",
  {
    capacity: integer("capacity"),
    categoryId: text("category_id").references(() => categories.id),
    coverImage: text("cover_image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    description: text("description"),
    endTime: timestamp("end_time"),
    hostId: text("host_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    location: text("location"),
    locationDetails: text("location_details"),
    reminderSent1h: boolean("reminder_sent_1h").notNull().default(false),
    reminderSent24h: boolean("reminder_sent_24h").notNull().default(false),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    richDescription: text("rich_description"),
    slug: text("slug").notNull().unique(),
    startTime: timestamp("start_time").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    title: text("title").notNull(),
    type: eventTypeEnum("type").notNull().default("in_person"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    visibility: eventVisibilityEnum("visibility").notNull().default("public"),
  },
  (table) => [
    uniqueIndex("events_slug_unique_idx").on(table.slug),
    index("events_host_id_idx").on(table.hostId),
    index("events_start_time_idx").on(table.startTime),
    index("events_visibility_idx").on(table.visibility),
  ]
);

export const eventTags = pgTable(
  "event_tags",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    tag: text("tag").notNull(),
  },
  (table) => [index("event_tags_event_id_idx").on(table.eventId)]
);

export const eventQuestions = pgTable(
  "event_questions",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    label: text("label").notNull(),
    options: json("options").$type<string[]>(),
    order: integer("order").notNull().default(0),
    required: boolean("required").notNull().default(false),
    type: questionTypeEnum("type").notNull().default("text"),
  },
  (table) => [index("event_questions_event_id_idx").on(table.eventId)]
);

export const rsvps = pgTable(
  "rsvps",
  {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    customAnswers:
      json("custom_answers").$type<Record<string, string | boolean>>(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    message: text("message"),
    status: rsvpStatusEnum("status").notNull().default("pending"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("rsvps_event_id_idx").on(table.eventId),
    index("rsvps_user_id_idx").on(table.userId),
    uniqueIndex("rsvps_event_user_unique").on(table.eventId, table.userId),
  ]
);

export const rsvpTimeline = pgTable("rsvp_timeline", {
  changedByName: text("changed_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  rsvpId: text("rsvp_id")
    .notNull()
    .references(() => rsvps.id, { onDelete: "cascade" }),
  toStatus: text("to_status"),
  type: text("type").notNull(),
});

export const invitations = pgTable(
  "invitations",
  {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    email: text("email").notNull(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at"),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id),
    role: invitationRoleEnum("role").notNull().default("attendee"),
    status: invitationStatusEnum("status").notNull().default("pending"),
    token: text("token").notNull().unique(),
  },
  (table) => [
    index("invitations_event_id_idx").on(table.eventId),
    index("invitations_token_idx").on(table.token),
  ]
);

export const eventCohosts = pgTable(
  "event_cohosts",
  {
    addedAt: timestamp("added_at").notNull().defaultNow(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("event_cohosts_event_user_unique").on(
      table.eventId,
      table.userId
    ),
  ]
);

export const attendeeCheckins = pgTable("attendee_checkins", {
  checkedInAt: timestamp("checked_in_at").notNull().defaultNow(),
  checkedInBy: text("checked_in_by").references(() => user.id),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const eventPageviews = pgTable(
  "event_pageviews",
  {
    city: text("city"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ipHash: text("ip_hash").notNull(),
    referrer: text("referrer"),
  },
  (table) => [index("event_pageviews_event_id_idx").on(table.eventId)]
);

export const chatConversations = pgTable(
  "chat_conversations",
  {
    createdAt: timestamp("created_at").notNull().defaultNow(),
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull().default("New conversation"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("chat_conversations_user_id_idx").on(table.userId),
    index("chat_conversations_updated_at_idx").on(table.updatedAt),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => chatConversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // No id default: the id must always equal the AI SDK UIMessage.id so
    // approval continuations resync onto the same rows.
    id: text("id").primaryKey(),
    order: integer("order").notNull().default(0),
    parts: json("parts").notNull().$type<Record<string, unknown>[]>(),
    role: text("role").notNull(),
  },
  (table) => [
    index("chat_messages_conversation_id_idx").on(table.conversationId),
    uniqueIndex("chat_messages_conversation_order_unique").on(
      table.conversationId,
      table.order
    ),
  ]
);

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many }) => ({
  cohostedEvents: many(eventCohosts),
  events: many(events),
  rsvps: many(rsvps),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  category: one(categories, {
    fields: [events.categoryId],
    references: [categories.id],
  }),
  checkins: many(attendeeCheckins),
  cohosts: many(eventCohosts),
  host: one(user, { fields: [events.hostId], references: [user.id] }),
  invitations: many(invitations),
  pageviews: many(eventPageviews),
  questions: many(eventQuestions),
  rsvps: many(rsvps),
  tags: many(eventTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  events: many(events),
}));

export const eventTagsRelations = relations(eventTags, ({ one }) => ({
  event: one(events, { fields: [eventTags.eventId], references: [events.id] }),
}));

export const eventQuestionsRelations = relations(eventQuestions, ({ one }) => ({
  event: one(events, {
    fields: [eventQuestions.eventId],
    references: [events.id],
  }),
}));

export const rsvpsRelations = relations(rsvps, ({ one, many }) => ({
  event: one(events, { fields: [rsvps.eventId], references: [events.id] }),
  timeline: many(rsvpTimeline),
  user: one(user, { fields: [rsvps.userId], references: [user.id] }),
}));

export const rsvpTimelineRelations = relations(rsvpTimeline, ({ one }) => ({
  event: one(events, {
    fields: [rsvpTimeline.eventId],
    references: [events.id],
  }),
  rsvp: one(rsvps, { fields: [rsvpTimeline.rsvpId], references: [rsvps.id] }),
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
    checkedBy: one(user, {
      fields: [attendeeCheckins.checkedInBy],
      references: [user.id],
      relationName: "checkedBy",
    }),
    event: one(events, {
      fields: [attendeeCheckins.eventId],
      references: [events.id],
    }),
    user: one(user, {
      fields: [attendeeCheckins.userId],
      references: [user.id],
    }),
  })
);

export const eventPageviewsRelations = relations(eventPageviews, ({ one }) => ({
  event: one(events, {
    fields: [eventPageviews.eventId],
    references: [events.id],
  }),
}));

export const chatConversationsRelations = relations(
  chatConversations,
  ({ one, many }) => ({
    messages: many(chatMessages),
    user: one(user, {
      fields: [chatConversations.userId],
      references: [user.id],
    }),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, {
    fields: [chatMessages.conversationId],
    references: [chatConversations.id],
  }),
}));
