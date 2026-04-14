# OpenLuma Feature Roadmap

> Gap analysis vs Lu.ma — prioritized by impact-to-effort ratio.
> Last updated: 2026-04-15

---

## What We Already Have

- Event CRUD with cover images, types (in_person/virtual/hybrid), visibility, capacity, approval toggle
- RSVP system with approval workflow, QR ticket generation, QR scanner check-in
- Co-host system with email invitations and direct promotion
- AI agent for event creation via natural language chat (GPT-4o-mini)
- Public event discovery with title search and type filter
- Email notifications for invitations + RSVP approval (Resend)
- ICS calendar export (download + email attachment)
- User profiles with avatar upload (UploadThing)
- Dashboard with basic analytics (counts only)
- CSV attendee export, light/dark theme, sidebar navigation
- Custom event URL slugs — shareable `/e/[slug]` links, auto-generated + customizable (PR #1)
- OG image generation — 1200×630 social cards via `next/og`, Redis-cached (PR #2)
- Rich text event descriptions — Tiptap WYSIWYG editor, stored as JSON with plain-text fallback (PR #3)
- Event cloning — "Duplicate" button + AI `cloneEvent` tool (PR #4)
- Waitlist auto-promotion — auto-waitlists when full, promotes oldest on cancellation (PR #5)
- Automated pre-event reminders — Vercel Cron sends 24h + 1h emails to approved attendees (PR #6)
- Custom registration questions — hosts define text/paragraph/checkbox/dropdown questions per event, answers stored per RSVP (PR #7)
- UI polish — RSVP cancel confirmation modal, waitlist position display, copy link button on public event page, improved empty states

## What We Don't Have (vs Lu.ma)

---

## Tier 1 — High Impact, Moderate Effort

### 1. Custom Event URL Slugs ✅ Done

**Problem:** All event URLs use UUIDs (`/events/9935db37-cde9-...`) which look unprofessional in social posts and messages.

**Solution:** Add `slug text unique` column to `events` table. Auto-generate from title + nanoid suffix on creation. Allow host to customize. Resolve public pages by slug at `/e/[slug]`.

**Files to modify:**
- `lib/db/schema.ts` — add `slug` column with unique index
- `app/(public)/e/[slug]/page.tsx` — new route (or modify existing `events/[eventId]`)
- `app/api/events/route.ts` — generate slug in POST handler
- `components/events/event-form.tsx` — add slug input that auto-populates from title
- `lib/validators/event.ts` — add `slug: z.string().regex(/^[a-z0-9-]+$/).optional()`

**Dependencies:** None (`nanoid` already installed)

---

### 2. OG Image Generation for Social Sharing ✅ Done

**Problem:** Shared event links on Twitter/LinkedIn show no rich preview — just a plain text link. Lu.ma generates beautiful social cards automatically.

**Solution:** Use Next.js built-in `ImageResponse` from `next/og` at `app/api/og/route.tsx`. Renders event title, host name, date, cover image as 1200×630 PNG. Update `generateMetadata` to include `openGraph.images`.

**Files to modify:**
- `app/api/og/route.tsx` — new file using `ImageResponse`
- `app/(public)/events/[eventId]/page.tsx` — add `openGraph.images` to `generateMetadata`
- `lib/redis.ts` — cache OG metadata by eventId to avoid repeated DB reads on scraper hits

**Dependencies:** None (`next/og` is built into Next.js 16)

---

### 3. Rich Text Event Descriptions ✅ Done

**Problem:** Event descriptions are plain text only. Lu.ma supports bold, italic, bullets, links, and embeds. Plain text is the #1 quality gap.

**Solution:** Replace `<Textarea>` with Tiptap editor. Store as JSON in a new `richDescription jsonb` column (keep `description text` as plaintext fallback for AI/search). Render read-only on public event pages.

**Files to modify:**
- `lib/db/schema.ts` — add `richDescription jsonb` to `events`
- `components/events/event-form.tsx` — replace `<Textarea>` with Tiptap editor component
- `components/events/event-edit-drawer.tsx` — same Tiptap editor
- `app/(public)/events/[eventId]/page.tsx` — replace `whitespace-pre-wrap` with Tiptap read-only renderer
- `app/(dashboard)/dashboard/events/[eventId]/page.tsx` — same for dashboard view
- `lib/validators/event.ts` — add `richDescription: z.any().optional()`

**Dependencies:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`

---

### 4. Event Cloning / Duplication ✅ Done

**Problem:** Recurring meetup organizers re-create events from scratch every time. Lu.ma has "Clone Event" (up to 30 at once).

**Solution:** "Duplicate Event" button in the More tab. Server action copies all fields except id/dates/guests. AI agent gets a `cloneEvent` tool.

**Files to modify:**
- `actions/events.ts` — add `cloneEventAction(eventId, overrides)`
- `app/(dashboard)/dashboard/events/[eventId]/page.tsx` — add button in More tab
- `lib/ai/agents/event-agent.ts` — add `cloneEvent` tool

**Dependencies:** None

---

### 5. Waitlist Auto-Promotion ✅ Done

**Problem:** The `waitlisted` status exists in `rsvpStatusEnum` but is never used. When capacity fills, new RSVPs fail instead of waitlisting. When someone cancels, hosts must manually promote.

**Solution:**
- Auto-set status to `waitlisted` when `approvedCount >= capacity` (instead of returning 400)
- When an approved attendee cancels, auto-promote the oldest waitlisted RSVP to `approved` and send confirmation email
- `sendRsvpConfirmationEmail` already handles approval emails

**Files to modify:**
- `app/api/events/[eventId]/rsvp/route.ts` — POST: auto-waitlist; DELETE: trigger promotion
- `actions/rsvps.ts` — `cancelRsvpAction` triggers promotion logic

**Dependencies:** None

---

### 6. Automated Pre-Event Reminders ✅ Done

**Problem:** `sendEventReminderEmail` is fully implemented in `lib/email.ts` but never called from anywhere. No scheduler exists.

**Solution:** Use Upstash QStash to schedule webhook calls at `startTime - 24h` and `startTime - 1h` when events are created/updated. A new API route processes the queue.

**Files to modify:**
- `app/api/events/route.ts` (POST) and `app/api/events/[eventId]/route.ts` (PUT) — schedule QStash call after insert/update
- `app/api/reminders/route.ts` — new handler: verify QStash signature, send reminders to all approved RSVPs
- `lib/db/schema.ts` — add `reminderSent24h boolean` and `reminderSent1h boolean` to events

**Dependencies:** `@upstash/qstash` (same Upstash ecosystem already in use)

---

### 7. Custom Registration Questions ✅ Done

**Problem:** Every real event needs at least one custom question (dietary restrictions, company name, t-shirt size). Currently no way to collect structured data from attendees.

**Solution:** Hosts define ordered questions (short text, paragraph, checkbox, dropdown) per event. Answers stored as JSONB per RSVP. Included in CSV export.

**Schema changes:**
```
eventQuestions: id, eventId, label, type (text|paragraph|checkbox|dropdown), required, order, options jsonb
rsvps: + customAnswers jsonb
```

**Files to modify:**
- `lib/db/schema.ts` — new `eventQuestions` table, add `customAnswers jsonb` to `rsvps`
- `lib/validators/event.ts` — add question schema
- `components/events/event-form.tsx` — question builder UI section
- `components/events/rsvp-button.tsx` — render question fields dynamically in RSVP modal
- `components/events/attendee-list.tsx` — show answers in attendee detail, include in CSV export

**Dependencies:** None (Zod handles dynamic validation)

---

## Tier 2 — Medium Impact, More Work

### 8. Paid Ticketing (Stripe)

**Problem:** No payment support at all. This is the largest single feature gap vs Lu.ma for professional organizers.

**Solution:** `ticketTiers` table (name, price, currency, quantity, description). Stripe Checkout for paid tiers. Webhook handler creates RSVP on `checkout.session.completed`. Free tiers use existing flow.

**Schema changes:**
```
ticketTiers: id, eventId, name, price (integer cents), currency, quantity, description, isPublic, order
rsvps: + stripePaymentIntentId text, + ticketTierId text FK
```

**Files to modify:**
- `lib/db/schema.ts` — new `ticketTiers` table, extend `rsvps`
- `app/api/webhooks/stripe/route.ts` — new webhook handler
- `app/api/events/[eventId]/checkout/route.ts` — new: creates Stripe Checkout session
- `components/events/rsvp-button.tsx` — tier selection before checkout
- `lib/validators/event.ts` — tier schemas

**Dependencies:** `stripe`, `@stripe/stripe-js`
**Env vars:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

---

### 9. Event Page View Analytics

**Problem:** Hosts see zero funnel data. No way to know how many people viewed an event page vs. how many RSVP'd.

**Solution:** Log pageviews to `eventPageviews` table (referrer, utm_source, utm_medium, city via request.geo, ip_hash). Show views-over-time sparkline + conversion rate in Insights tab. Rate-limit recording per IP via Redis.

**Schema changes:**
```
eventPageviews: id, eventId, referrer, utmSource, utmMedium, city, ipHash, createdAt
```

**Files to modify:**
- `lib/db/schema.ts` — new `eventPageviews` table
- `app/(public)/events/[eventId]/page.tsx` — async DB insert (non-blocking) on page load
- `app/(dashboard)/dashboard/events/[eventId]/page.tsx` — Insights tab: sparkline chart + conversion rate
- `lib/redis.ts` — rate-limit pageview recording per IP

**Dependencies:** None for basic SVG sparkline; `recharts` for richer charts

---

### 10. REST API + Webhook System

**Problem:** Existing API routes are clean but have no API key auth or webhook dispatch. Self-hosters can't integrate with external tools.

**Solution:** `apiKeys` table for personal access tokens. `webhooks` table (url, events[], secret) with HMAC signing. Fire webhook POSTs from server actions.

**Schema changes:**
```
apiKeys: id, userId, name, keyHash, lastUsedAt, createdAt
webhooks: id, userId, url, events text[], secret, active, createdAt
```

**Files to modify:**
- `lib/db/schema.ts` — new tables
- `lib/api-auth.ts` — new middleware for API key verification
- `actions/rsvps.ts`, `actions/events.ts` — fire webhook POSTs after mutations
- `app/(dashboard)/dashboard/settings/page.tsx` — API keys + webhooks management UI

**Dependencies:** None (crypto is Node.js stdlib)

---

### 11. Zoom / Google Meet Auto-Creation

**Problem:** Virtual event hosts manually paste meeting links. Lu.ma auto-generates Zoom/Meet links.

**Solution:** After creating a virtual event, auto-generate a Google Meet link via Google Calendar API (no separate Zoom account needed). Store in `events.location`. AI agent gets a `generateMeetingLink` tool.

**Files to modify:**
- `lib/auth.ts` — add Google Calendar OAuth scope
- `app/api/events/[eventId]/meeting/route.ts` — new endpoint
- `lib/ai/agents/event-agent.ts` — add `generateMeetingLink` tool
- `lib/db/schema.ts` — add `meetingProvider text`, `meetingId text` to events

**Dependencies:** `googleapis`

---

## Tier 3 — Nice to Have

### 13. Event Page Themes
5-6 CSS theme variants (Minimal, Dark, Warm, Confetti, Pastel). `theme text` column on events. Applied via `data-theme` attribute. `canvas-confetti` is already installed — Confetti theme needs zero new deps.

### 14. Community Calendar Pages
Public `/u/[userId]/calendar` page + ICS feed at `/u/[userId]/calendar.ics`. Subscribable calendar showing all public events by a host. ICS generation already exists in `lib/email.ts`.

### 15. SMS Reminders (Twilio)
Add `phoneNumber text` to user. Send SMS alongside email reminders. 95% open rate vs 25% for email. **Deps:** `twilio`.

### 16. Group Registration
`quantity int default 1` on rsvps. Capacity checks use `SUM(quantity)`. One QR per attendee in group.

---

## Implementation Sequencing

| Sprint | Features | Status |
|--------|----------|--------|
| 1 | Slugs (#1), OG Images (#2) | ✅ Done |
| 2 | Rich Text (#3), Event Cloning (#4) | ✅ Done |
| 3 | Waitlist (#5), Reminders (#6) | ✅ Done |
| 4 | Custom Questions (#7), UI Polish | ✅ Done |
| 5 | Analytics (#9), Paid Ticketing (#8) | Pending |
| 6 | API/Webhooks (#10), Zoom/Meet (#11) | Pending |
| 7+ | Tier 3 features by community demand | Pending |

---

## OpenLuma's Unique Advantages Over Lu.ma

Already built (Lu.ma doesn't have):
- **AI event creation** via natural language chat
- **Open source** — self-hostable, fully customizable, no platform fees ever
- **No vendor lock-in** — own your data, own your audience

Differentiation to lean into:
- AI-drafted event descriptions
- AI-powered event discovery recommendations
- Open API from day one (Lu.ma paywalls their API behind $59/mo Plus plan)

---

## Key Files Reference

| File | Role |
|------|------|
| `lib/db/schema.ts` | All schema changes land here (single source of truth) |
| `lib/email.ts` | Email templates — `sendEventReminderEmail` is written but never called |
| `lib/ai/agents/event-agent.ts` | AI tools — add cloneEvent, generateMeetingLink, draftBlast |
| `actions/rsvps.ts` | Waitlist promotion, custom question answers, capacity gate |
| `actions/events.ts` | Event cloning server action |
| `app/(public)/events/[eventId]/page.tsx` | OG metadata, rich text rendering, pageview logging |
| `app/(dashboard)/dashboard/events/[eventId]/page.tsx` | Insights tab, blast UI, clone button |
| `components/events/event-form.tsx` | Slug input, rich text editor, question builder, tier builder |
| `components/events/rsvp-button.tsx` | Custom questions, tier selection, Stripe checkout |
| `lib/redis.ts` | Rate limiter is wired but never applied — use for pageview dedup + API rate limiting |
