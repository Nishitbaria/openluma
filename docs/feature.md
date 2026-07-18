# OpenLuma — Feature Backlog

A prioritized list of improvements and new features to build. Pick from **Recommended first** based on impact vs effort, or choose by theme.

**Last updated:** July 2026  
**Status key:** `[ ]` Not started · `[~]` In progress · `[x]` Done

---

## Recommended build order

| Priority | Feature | Impact | Effort | Section |
|----------|---------|--------|--------|---------|
| ~~1~~ | ~~Persist AI chat history~~ (done) | High | Medium | [AI](#ai-experience) |
| 2 | My Tickets hub (attendee) | High | Low | [Attendee](#attendee-experience) |
| 3 | Pending approvals inbox (host) | High | Medium | [Host](#host-experience) |
| 4 | Discover search & filters | High | Medium | [Public / Growth](#public--growth) |
| 5 | Terms & Privacy pages | Medium | Low | [Trust & Polish](#trust--polish) |
| 6 | Merge analytics into Insights tab | Medium | Low | [Host](#host-experience) |
| 7 | Context-aware AI assistant | High | Medium | [AI](#ai-experience) |
| 8 | Signed QR tickets | Medium | Medium | [Security](#security--trust) |
| 9 | Rate limiting on sensitive APIs | Medium | Low | [Security](#security--trust) |
| 10 | Docker self-hosting | Medium | Medium | [Platform](#platform--devex) |

---

## AI experience

### [x] 1. Persist AI chat history

**Why:** `chatMessages` table exists in schema but chat is stateless — refresh loses everything.

**What to build:**

- Save user/assistant messages in `POST /api/chat`
- Load last N messages when opening `/dashboard/chat`
- Optional: "New conversation" button

**Files:** `app/api/chat/route.ts`, `lib/db/schema.ts`, `components/chat/chat-panel.tsx`  
**Effort:** Medium · **Impact:** High

---

### [ ] 2. Context-aware AI assistant

**Why:** AI doesn't know which event page the user is on.

**What to build:**

- Pass `eventId` / page context into orchestrator
- Prompts like "Approve all pending", "How many checked in?", "Summarize this event"

**Files:** `lib/ai/agents/orchestrator.ts`, `components/chat/chat-panel.tsx`  
**Effort:** Medium · **Impact:** High

---

### [ ] 3. Expand AI agent tools

**Why:** Differentiates OpenLuma from generic event tools.

**What to build:**

- `getEventAnalytics` — funnel, views, check-in rate
- `bulkApproveRsvps` — approve multiple pending RSVPs
- `sendAttendeeMessage` — email blast to approved attendees
- `exportAttendeeCsv` — download attendee list

**Files:** `lib/ai/agents/event-agent.ts`, `lib/ai/agents/orchestrator.ts`  
**Effort:** High · **Impact:** High

---

### [ ] 4. Dynamic chat suggestions

**Why:** Static suggestions in chat empty state miss real user needs.

**What to build:**

- Suggestions from live data: pending approvals, events this week, events missing cover image

**Files:** `components/chat/chat-panel.tsx`, new server action or API  
**Effort:** Low · **Impact:** Medium

---

## Attendee experience

### [ ] 5. My Tickets hub

**Why:** Attendees have no single place for all upcoming events + ticket access.

**What to build:**

- `/dashboard/tickets` or new dashboard section
- List events user is attending (approved, pending, waitlisted)
- Links to `/ticket/[eventId]` and public event page
- Status badges + waitlist position

**Files:** New page under `app/(dashboard)/`, sidebar link in `components/layout/app-sidebar.tsx`  
**Effort:** Low · **Impact:** High

---

### [ ] 6. Ticket page polish

**Why:** Ticket works but feels minimal on mobile.

**What to build:**

- Mobile-first layout (large QR, event name, time, location)
- Add to calendar on ticket page
- Share event button

**Files:** `app/ticket/[eventId]/page.tsx`, `components/events/calendar-export-button.tsx`  
**Effort:** Low · **Impact:** Medium

---

### [ ] 7. Waitlist UX improvements

**Why:** Waitlist exists but could feel more transparent.

**What to build:**

- Confirm promotion email always sends on auto-promote
- Show updated position after refresh
- Clear "Leave waitlist" flow

**Files:** `app/api/events/[eventId]/rsvp/route.ts`, `components/events/rsvp-button.tsx`, `lib/email.ts`  
**Effort:** Low · **Impact:** Medium

---

## Host experience

### [ ] 8. Pending approvals inbox

**Why:** Hosts approve RSVPs per event; no global view.

**What to build:**

- Global inbox: "X pending across Y events"
- Bulk approve / reject
- Optional custom message on approval (API already supports `customMessage`)

**Files:** New dashboard page or expand `app/(dashboard)/dashboard/page.tsx`, attendee list components  
**Effort:** Medium · **Impact:** High

---

### [ ] 9. Merge analytics pages

**Why:** Basic `/analytics` page duplicates richer Insights tab on event detail.

**What to build:**

- Redirect `/dashboard/events/[id]/analytics` → event detail `?tab=insights`
- Remove or deprecate standalone analytics page

**Files:** `app/(dashboard)/dashboard/events/[eventId]/analytics/page.tsx`, event detail page  
**Effort:** Low · **Impact:** Medium

---

### [ ] 10. Post-clone event flow

**Why:** Clone sets placeholder date 1 week out; host may not notice.

**What to build:**

- After clone, redirect to edit with focus on date/time + cover image
- Toast: "Set your event date and cover image"

**Files:** `app/api/events/[eventId]/clone/route.ts`, clone UI trigger  
**Effort:** Low · **Impact:** Medium

---

### [ ] 11. Host broadcast emails

**Why:** Can invite and confirm RSVPs, but can't message all approved attendees.

**What to build:**

- "Message attendees" on event detail
- Subject + body → all approved RSVPs via Resend
- Rate limit sends

**Files:** New API route, `lib/email.ts`, event detail UI  
**Effort:** Medium · **Impact:** Medium

---

### [ ] 12. Co-host permission parity (server actions)

**Why:** API allows co-hosts for invites; `actions/invitations.ts` is host-only.

**What to build:**

- Align `sendInvitationAction` / `bulkSendInvitationsAction` with API co-host checks

**Files:** `actions/invitations.ts`  
**Effort:** Low · **Impact:** Medium

---

## Public / Growth

### [ ] 13. Discover search & filters

**Why:** Discover only searches title, max 30 events, no date filter.

**What to build:**

- Search title + description + location
- Filters: date range, category, event type
- Pagination or infinite scroll

**Files:** `app/(public)/events/page.tsx`, `components/events/event-filters.tsx`  
**Effort:** Medium · **Impact:** High

---

### [ ] 14. Public host profiles v2

**Why:** `/u/[userId]` exists but is basic.

**What to build:**

- Custom username slug (`/u/nisith`)
- Social links on profile
- Optional: follow / email when host creates new public event

**Files:** `app/(public)/u/[userId]/page.tsx`, schema migration for username  
**Effort:** High · **Impact:** Medium

---

### [ ] 15. SEO & sharing

**Why:** Better discovery outside the app.

**What to build:**

- `sitemap.xml` for public events and profiles
- JSON-LD `Event` structured data on `/e/[slug]`
- Verify OG route covers all share surfaces

**Files:** `app/sitemap.ts`, `app/(public)/e/[slug]/page.tsx`, `app/api/og/route.tsx`  
**Effort:** Medium · **Impact:** Medium

---

## Trust & polish

### [ ] 16. Terms & Privacy pages

**Why:** Sign-in, sign-up, and footer use `href="#"` — hurts trust.

**What to build:**

- `/terms` and `/privacy` (markdown or simple pages)
- Wire links in auth pages and footer

**Files:** `app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`, `components/layout/footer.tsx`  
**Effort:** Low · **Impact:** Medium

---

### [ ] 17. First-time host onboarding

**Why:** New hosts land on empty dashboard.

**What to build:**

- Empty state with "Create with AI" vs "Create manually"
- Checklist: cover image, date, visibility, first invite

**Files:** `app/(dashboard)/dashboard/page.tsx`, `dashboard/events/new/page.tsx`  
**Effort:** Medium · **Impact:** Medium

---

### [ ] 18. Notification preferences

**Why:** No user control over emails.

**What to build:**

- Settings toggles: RSVP confirmations, reminders, invitations, marketing
- Store preferences on user record or separate table

**Files:** `app/(dashboard)/dashboard/settings/page.tsx`, schema, email send paths  
**Effort:** Medium · **Impact:** Medium

---

## Security & trust

### [x] RSVP server action authorization

Host/cohost gate on `approveRsvpAction` / `rejectRsvpAction`. See `SECURITY_TODO.md`.

### [x] Check-in POST authorization

Host/cohost gate on check-in writes. See `SECURITY_TODO.md`.

### [ ] 19. Signed QR tickets

**Why:** QR payload is plain JSON (`userId`, `eventId`) — forgeable if leaked.

**What to build:**

- HMAC-signed token with expiry
- Validate signature on check-in POST

**Files:** `app/api/events/[eventId]/ticket/route.ts`, `check-in/route.ts`, new `lib/tickets.ts`  
**Effort:** Medium · **Impact:** Medium (security)

---

### [ ] 20. Rate limiting on sensitive endpoints

**Why:** `ratelimit` in `lib/redis.ts` is configured but underused.

**What to build:**

- Apply to `/api/chat`, RSVP POST, invitation send, auth-adjacent routes

**Files:** `lib/redis.ts`, relevant API routes  
**Effort:** Low · **Impact:** Medium

---

### [ ] 21. Shared `event-access` auth helper

**Why:** Host/cohost checks duplicated across many files — regression risk.

**What to build:**

- `lib/auth/event-access.ts` with `getEventForHostOrCohost` / `requireHostOrCohost`
- Gradually refactor routes and actions

**Effort:** Low · **Impact:** Medium (maintainability + security)

---

## Platform & DevEx

### [ ] 22. Docker self-hosting

**Why:** README says "Dockerfile coming soon."

**What to build:**

- `Dockerfile` + `docker-compose.yml` (app + Postgres)
- Document env vars in README

**Effort:** Medium · **Impact:** Medium (open-source adoption)

---

### [ ] 23. E2E / integration tests

**Why:** No test suite; security fixes need manual verification.

**What to build:**

- Critical paths: RSVP approval auth, check-in auth, waitlist promotion, private event visibility
- CI job with test DB

**Effort:** High · **Impact:** High (long-term)

---

### [ ] 24. Reminder cron reliability

**Why:** Cron runs once daily at 9am (`vercel.json`); 1h reminders may miss same-day events.

**What to build:**

- Run reminders hourly or use finer-grained scheduling
- Document `CRON_SECRET` setup

**Files:** `vercel.json`, `app/api/reminders/route.ts`  
**Effort:** Low · **Impact:** Medium

---

## Future / larger bets

| Feature | Notes |
|---------|--------|
| Recurring / series events | New schema + UI complexity |
| Apple Wallet / Google Wallet passes | Mobile ticket experience |
| Paid tickets / Stripe | Major product scope |
| Multi-language (i18n) | App-wide effort |
| Mobile app (Expo) | Separate codebase |
| Community / comments on events | Social layer |
| Event categories admin UI | Categories in schema; needs management UI |

---

## How to pick what to build first

**If you want fastest user-visible wins:**  
→ #5 My Tickets, #16 Terms/Privacy, #9 Merge analytics, #13 Discover filters

**If you want to lean into AI differentiation:**  
→ #1 Chat persistence, #2 Context-aware AI, #3 New agent tools

**If you want host retention:**  
→ #8 Pending inbox, #11 Broadcast emails, #10 Post-clone flow

**If you want security & trust before growth:**  
→ #19 Signed QR, #20 Rate limits, #21 Shared auth helper, #23 Tests

---

## Related docs

- [`README.md`](../README.md) — features & setup
- [`AGENTS.md`](../AGENTS.md) — conventions for AI/coding agents
- [`SECURITY.md`](../SECURITY.md) — disclosure policy
- [`SECURITY_TODO.md`](../SECURITY_TODO.md) — completed security fixes
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — how to contribute
