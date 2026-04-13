# OpenLuma

Open-source event management platform inspired by Lu.ma with AI-powered event creation.

## Quick Reference

```bash
pnpm dev            # Start dev server (localhost:3000)
pnpm build          # Production build
pnpm lint           # Biome linter
pnpm format         # Biome formatter
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run migrations
pnpm db:push        # Push schema directly (dev only)
pnpm db:studio      # Open Drizzle Studio GUI
```

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, React Compiler)
- **Language**: TypeScript
- **Database**: PostgreSQL + Drizzle ORM (`lib/db/schema.ts`)
- **Auth**: Better Auth (`lib/auth.ts`) — sessions, Google OAuth
- **AI**: Vercel AI SDK v6 + OpenAI GPT-4o-mini (`lib/ai/agents/`)
- **Email**: Resend (`lib/email.ts`)
- **Uploads**: Uploadthing (`lib/uploadthing.ts`)
- **Cache**: Upstash Redis (`lib/redis.ts`)
- **UI**: shadcn/ui (radix-nova style) + Tailwind CSS v4
- **Linting**: Biome (not ESLint)
- **Icons**: Lucide React

## Project Structure

```
app/
  (auth)/           # Sign-in, sign-up (redirects if authenticated)
  (dashboard)/      # Authenticated pages: dashboard, events, chat, profile, settings
  (public)/         # Public pages: landing, event discovery, user profiles
  api/              # API routes: auth, chat, events, invitations, cohosts, uploads
  ticket/           # QR ticket pages

components/
  ai-elements/      # Chat UI primitives (conversation, message, prompt-input, artifact)
  chat/             # ChatPanel component
  events/           # Event cards, filters, RSVP, delete, attendee list, invite form
  layout/           # Header, footer, sidebar, theme toggle, mobile nav, feature cards
  icons.tsx          # Custom SVG icons (GitHubIcon)
  logo.tsx           # OpenLuma SVG logo

lib/
  ai/agents/         # AI orchestrator + event agent (multi-agent delegation)
  db/schema.ts       # Full database schema with relations
  auth.ts            # Better Auth server config
  auth-client.ts     # Better Auth client (`authClient.useSession()`)
  email.ts           # Email templates (Resend)
  validators/        # Zod schemas for events, invitations, RSVPs
```

## Architecture Notes

### AI Agent System
- **Orchestrator** (`lib/ai/agents/orchestrator.ts`): Routes requests to specialized agents via `ToolLoopAgent`
- **Event Agent** (`lib/ai/agents/event-agent.ts`): 10 tools for event CRUD, RSVP, invitations
- Entry point: `POST /api/chat` → streams responses via `createAgentUIStreamResponse`
- Uses artifacts to pass structured data (event-created, event-list) to the UI
- Client: `useChat` with `DefaultChatTransport` (`components/chat/chat-panel.tsx`)
- Tool results rendered via `isToolUIPart()` from AI SDK v6

### Auth Pattern
- Server-side: `const session = await auth.api.getSession({ headers: await headers() })`
- Client-side: `const { data: session } = authClient.useSession()`
- Redirect hook: `useRedirectIfAuthenticated("/dashboard")` in auth layout

### Database
- Schema at `lib/db/schema.ts` with Drizzle ORM
- Key tables: users, sessions, events, rsvps, invitations, eventCohosts, attendeeCheckins, chatMessages
- Cascade deletes on user removal
- Enums: event_type, event_visibility, rsvp_status, invitation_status, invitation_role
- Unique constraints: `rsvps(eventId, userId)`, `eventCohosts(eventId, userId)`

### Invitation & Co-host System
- **Invitation flow**: Host/cohost sends invite → email via Resend with accept/decline links → `GET /api/invitations/[token]?action=accept`
- **Roles**: Invitations have a `role` field (`attendee` | `cohost`) — cohosts get `eventCohosts` row on acceptance
- **Direct promotion**: Host can promote existing attendees via `POST /api/events/[eventId]/cohosts` (no email required)
- **Co-host redirect**: Cohost invitations redirect to `/dashboard/events/[id]` on acceptance (attendees go to public page)
- **Invitation errors**: Invalid/expired/wrong-email invitations redirect to `/invitation-error` page with user-friendly messages
- **Email templates**: Role-aware — different subject/body for cohost vs attendee invitations (`lib/email.ts`)

### Access Control
- **Private events**: Visible only to host, cohosts, and users with approved RSVPs
- **Dashboard pages**: Auth-guarded in `(dashboard)/layout.tsx` — redirects to `/sign-in`
- **Event management** (edit, attendees, analytics): Requires host or cohost role
- **Self-RSVP/invite blocked**: Hosts cannot RSVP to or invite themselves
- **RSVP to private events**: Requires a pending invitation
- **API routes**: All mutation endpoints verify host/cohost ownership; RSVP PATCH scoped to `eventId`

### Co-host Dashboard Experience
- **Dashboard home** (`app/(dashboard)/dashboard/page.tsx`): Stats include co-hosted events; upcoming card shows co-hosted events with "Co-host" badge; pending approvals include RSVPs for co-hosted events
- **Events listing** (`app/(dashboard)/dashboard/events/page.tsx`): Has 4 tabs — Upcoming, Past, Co-hosting, Attending. Co-hosted events excluded from "Attending" to avoid duplication
- **Event detail**: Cohosts see full management view (attendees with emails, edit button, scan tickets) but cannot delete the event (host-only)

### Route Groups
- `(auth)` — Unauthenticated only (redirects logged-in users)
- `(dashboard)` — Authenticated with sidebar layout, auth guard in layout.tsx
- `(public)` — Public with header/footer layout, auth-aware navbar

## Conventions

- Use Biome for linting/formatting, not ESLint/Prettier
- Use `pnpm` as the package manager
- shadcn/ui components in `components/ui/` (radix-nova style, `components.json`)
- Server Components by default; add `"use client"` only when needed
- Use `Link` from `next/link` for navigation, not `<a>` tags
- Auth client: `authClient` from `@/lib/auth-client`
- Icons: use Lucide React (`lucide-react`)
- Params in Next.js 16: `params: Promise<{ id: string }>` (must be awaited)
- Env vars in `.env.local` (gitignored); `.env.example` has placeholders

## GitHub

- Repo: https://github.com/Nishitbaria/openluma
- License: MIT
