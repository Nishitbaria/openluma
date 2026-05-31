# Changelog

All notable changes to OpenLuma are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-05-31

### Initial public release

#### Added
- **AI-Powered Event Creation** — Create, edit, and manage events through natural language via an OpenAI GPT-4o-mini agent (Vercel AI SDK v6)
- **Event Discovery** — Public event listing with search and filtering by type and date
- **RSVP & Ticketing** — Full RSVP workflow with approval queue, waitlisting, and unique QR code tickets
- **Attendee Check-in** — QR code scanning with audit trail and real-time check-in status
- **Email Notifications** — Automated transactional emails via Resend: invitations, RSVP confirmations, reminders, ICS calendar attachments
- **Co-host System** — Invite co-hosts with granular permissions; co-hosts can manage attendees, edit events, and scan tickets
- **Role-Based Access Control** — Host, co-host, and attendee roles enforced server-side across all API routes
- **Private Events** — Invite-only events with access control; only invited/approved attendees can view
- **Google OAuth** — One-click sign-in with session management via Better Auth
- **Profile & Uploads** — User profiles with avatar and event cover image uploads via Uploadthing
- **Dark / Light Mode** — Full theme support with next-themes
- **Reminder Cron** — Daily email reminders for upcoming events via Vercel Cron

#### Tech Stack
- Next.js 16 (App Router, React 19, React Compiler)
- PostgreSQL + Drizzle ORM
- Better Auth
- Vercel AI SDK v6 + OpenAI
- Resend, Uploadthing, Upstash Redis
- shadcn/ui + Tailwind CSS v4 + Biome

---

*This project uses [semantic versioning](https://semver.org/).*
