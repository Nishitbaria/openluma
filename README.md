# OpenLuma

[![CI](https://github.com/Nishitbaria/openluma/actions/workflows/ci.yml/badge.svg)](https://github.com/Nishitbaria/openluma/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](https://github.com/Nishitbaria/openluma/blob/main/LICENSE)
[![Release](https://img.shields.io/github/v/release/Nishitbaria/openluma?color=black)](https://github.com/Nishitbaria/openluma/releases)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-black.svg)](https://github.com/Nishitbaria/openluma/blob/main/CONTRIBUTING.md)

An open-source event management platform inspired by [Lu.ma](https://lu.ma) — built with Next.js 16, AI-powered event creation, and a modern full-stack architecture.

> **Use natural language to create, manage, and discover events.** OpenLuma features an AI agent that handles event operations through conversation, alongside a full-featured web UI for hosts and attendees.

**[Live Demo](https://openluma.vercel.app)** · **[Report Bug](https://github.com/Nishitbaria/openluma/issues/new?template=bug_report.yml)** · **[Request Feature](https://github.com/Nishitbaria/openluma/issues/new?template=feature_request.yml)**

## Features

- **AI-Powered Event Management** — Create, edit, search, and manage events through natural language conversation
- **Event Discovery** — Browse and search public events with filtering by type and date
- **RSVP & Ticketing** — Full RSVP workflow with approval, waitlisting, and QR code tickets
- **Email Notifications** — Automated emails for invitations, RSVP confirmations, and reminders with ICS calendar attachments
- **Role-Based Access** — Host, co-host, and attendee roles with granular permissions
- **Attendee Check-in** — QR code scanning for event check-in with audit trail
- **OAuth Authentication** — Google login with session management via Better Auth
- **File Uploads** — Image uploads for events and profiles via Uploadthing
- **Dark Mode** — Theme switching with next-themes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19, React Compiler) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database | [PostgreSQL](https://www.postgresql.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Better Auth](https://www.better-auth.com/) (sessions, OAuth) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) + OpenAI GPT-4o-mini |
| Email | [Resend](https://resend.com/) |
| Uploads | [Uploadthing](https://uploadthing.com/) |
| Cache | [Upstash Redis](https://upstash.com/) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Linting | [Biome](https://biomejs.dev/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [PostgreSQL](https://www.postgresql.org/) database
- [pnpm](https://pnpm.io/) (recommended) or npm

### 1. Clone the repository

```bash
git clone https://github.com/Nishitbaria/openluma.git
cd openluma
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your credentials in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Random secret for session signing |
| `BETTER_AUTH_URL` | Yes | App URL (`http://localhost:3000` for dev) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `OPENAI_API_KEY` | Yes | OpenAI API key for the AI agent |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `RESEND_API_KEY` | Yes | Resend API key for emails |
| `UPLOADTHING_TOKEN` | Yes | Uploadthing token for file uploads |

### 4. Set up the database

```bash
# Generate migrations from the schema
pnpm db:generate

# Apply migrations
pnpm db:migrate
```

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
openluma/
├── app/
│   ├── (dashboard)/         # Authenticated host/attendee pages
│   │   └── dashboard/
│   │       └── events/[eventId]/
│   ├── (public)/            # Public-facing pages
│   │   ├── events/          # Event discovery & detail
│   │   └── u/               # User profiles
│   ├── api/
│   │   ├── auth/            # Better Auth endpoints
│   │   ├── chat/            # AI agent endpoint
│   │   └── events/          # Event API routes
│   └── ticket/              # Ticket & QR code pages
├── components/              # Shared UI components (shadcn/ui)
├── lib/
│   ├── ai/
│   │   └── agents/
│   │       ├── orchestrator.ts   # Main AI agent (routes requests)
│   │       └── event-agent.ts    # Event operations (10 tools)
│   ├── db/
│   │   └── schema.ts        # Drizzle database schema
│   ├── auth.ts              # Better Auth config
│   └── email.ts             # Email templates (Resend)
├── actions/                 # Server actions
├── hooks/                   # Custom React hooks
├── providers/               # Context providers
└── public/                  # Static assets
```

## AI Agent Architecture

OpenLuma uses a **multi-agent delegation pattern** powered by the Vercel AI SDK:

```
User Message
    │
    ▼
┌──────────────┐
│ Orchestrator  │  Routes requests to specialized agents
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Event Agent   │  Handles all event operations
└──────────────┘
```

The **Event Agent** has access to these tools:

| Tool | Description |
|------|-------------|
| `getCurrentDate` | Resolves relative dates ("next Friday") |
| `createEvent` | Creates events with full validation |
| `listMyEvents` | Lists the user's hosted events |
| `searchEvents` | Searches public events by title/date |
| `getEventDetails` | Retrieves full event info with attendees |
| `editEvent` | Updates event details (host/cohost only) |
| `deleteEvent` | Deletes events with confirmation flow |
| `submitRsvp` | Handles RSVP submission |
| `getAttendees` | Lists attendees grouped by status |
| `sendInvitation` | Sends email invitations with tokens |

## Available Scripts

```bash
pnpm dev            # Start development server
pnpm build          # Build for production
pnpm start          # Start production server
pnpm lint           # Run Biome linter
pnpm format         # Format code with Biome
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run database migrations
pnpm db:push        # Push schema changes directly
pnpm db:studio      # Open Drizzle Studio (database GUI)
```

## Database Schema

The core data model:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  users   │────▶│  events  │◀────│   rsvps  │
└──────────┘     └──────────┘     └──────────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
     ┌───────────┐ ┌────────┐ ┌─────────────┐
     │invitations│ │  tags  │ │  cohosts    │
     └───────────┘ └────────┘ └─────────────┘
```

- **events** — Title, description, location, capacity, visibility, type, approval settings
- **rsvps** — Status workflow: pending -> approved / rejected / waitlisted
- **invitations** — Token-based email invitations with 7-day expiry
- **eventCohosts** — Co-host delegation
- **attendeeCheckins** — Check-in audit trail

## Deployment

OpenLuma can be deployed to any platform that supports Next.js:

- **[Vercel](https://vercel.com)** — Zero-config deployment (recommended)
- **[Railway](https://railway.app)** — Full-stack with managed PostgreSQL
- **Docker** — Self-hosted (Dockerfile coming soon)

Make sure to set all environment variables from `.env.example` in your deployment platform.

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run linting: `pnpm lint`
5. Commit your changes: `git commit -m "feat: add my feature"`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- Inspired by [Lu.ma](https://lu.ma)
- Built with [Next.js](https://nextjs.org/), [Vercel AI SDK](https://sdk.vercel.ai/), [shadcn/ui](https://ui.shadcn.com/)
