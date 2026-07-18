# Security Fixes — TODO

All items resolved.

---

## [x] 1. HIGH — RSVP self-approval / IDOR in server actions

**Files:** `actions/rsvps.ts` → `approveRsvpAction`, `rejectRsvpAction`

**Fixed:** Both actions now verify host/cohost ownership and scope updates by `eventId` + `rsvpId`.

---

## [x] 2. MEDIUM — Missing authorization on attendee check-in (POST)

**File:** `app/api/events/[eventId]/check-in/route.ts` → `POST`

**Fixed:** POST now gates on host/cohost before writing check-in records, matching GET.

---

## [x] 3. Follow-up — grep for the same pattern elsewhere

Audited all `"use server"` actions and API mutation routes. No additional session-only mutation gaps found beyond the two fixes above.

Confirmed already-correct: AI agent tools (`lib/ai/agents/*`), event/invitation/cohost/question API routes, `actions/events.ts`, `actions/profile.ts`.
