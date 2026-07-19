# Email operations

OpenLuma sends transactional email through [Resend](https://resend.com). This
doc covers what you must configure for reliable inbox delivery, plus the code
conventions the app follows.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | yes (prod) | Resend API key. If unset, all sends are skipped (no-op) so local dev works without it. |
| `EMAIL_FROM` | recommended | From header, e.g. `OpenLuma <noreply@openluma.nishitbaria.pro>`. Must be on a **verified** domain. |
| `NEXT_PUBLIC_APP_URL` | yes | Base URL used to build event/ticket links in emails. |

## Deliverability checklist (DNS)

Gmail, Yahoo, and Microsoft **reject or spam-filter unauthenticated mail**.
Before sending in production, verify the sending domain in Resend and add the
DNS records it gives you.

- [ ] **SPF** — TXT record authorizing Resend to send for the domain
      (`v=spf1 include:amazonses.com ~all`; use `~all`, not `-all`, while ramping).
- [ ] **DKIM** — TXT record with the signing key Resend provides. This is the
      single most important record for inbox placement.
- [ ] **DMARC** — TXT at `_dmarc.<domain>`. Roll out gradually:
      `p=none` (monitor) → `p=quarantine; pct=25` → `p=reject`.
      Include `rua=mailto:...` to receive aggregate reports.
- [ ] Prefer a **dedicated subdomain** for sending (e.g. `mail.openluma...`) so
      app-domain reputation stays isolated.

### Verify records from the terminal

```bash
dig TXT openluma.nishitbaria.pro +short          # SPF
dig TXT resend._domainkey.openluma.nishitbaria.pro +short   # DKIM (selector may differ)
dig TXT _dmarc.openluma.nishitbaria.pro +short   # DMARC
```

Empty output = the record is missing. Also run a live test through
[mail-tester.com](https://www.mail-tester.com) — aim for 9–10/10.

### Reputation targets

| Metric | Good | Critical |
|--------|------|----------|
| Hard bounce rate | < 1% | > 4% |
| Spam complaint rate | < 0.01% | > 0.05% |

Monitor domain reputation in [Google Postmaster Tools](https://postmaster.google.com).

## Sending reliability (in code)

`lib/email.ts` routes every send through a reliability wrapper that provides:

- **Idempotency keys** — deterministic per business event
  (`rsvp-<eventId>-<recipient>-<status>`, `invite-<token>-<role>`,
  `reminder-<eventId>-<recipient>-<startTime>`) so a retried send never
  produces a duplicate. Resend caches keys ~24h.
- **Retry with backoff** — retries transient failures only (5xx, 429, network
  errors) with exponential backoff + jitter; 4xx (except 429) fail fast.
- **Per-attempt timeout** — avoids hanging on a stuck request.

All templates live under `emails/` as React Email components and are previewed
with `bun run email` (dev server on :3001).

## Email catalog

| Trigger | Function | Type |
|---------|----------|------|
| Invitation sent (attendee/cohost) | `sendInvitationEmail` | Transactional |
| RSVP submitted / status changed | `sendRsvpConfirmationEmail` | Transactional |
| Event starting in 24h / 1h | `sendEventReminderEmail` | Transactional |

All current emails are **transactional** (triggered by a user action or an
event the recipient opted into by RSVPing), so a marketing-style unsubscribe is
not legally required. If a broadcast/newsletter feature is ever added, it must
include a `List-Unsubscribe` header with one-click support and honor
suppression before send.

## Follow-ups not yet implemented

- **Delivery webhooks** — handle Resend `bounced`/`complained` events and build
  a suppression list to protect reputation (recommended before scaling volume).
- **List-Unsubscribe** — add when any non-transactional email is introduced.
