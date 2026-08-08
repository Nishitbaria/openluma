<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OpenLuma

Open-source event management platform inspired by Lu.ma — Next.js 16, AI-powered event creation, PostgreSQL + Drizzle, Better Auth.

**Repo:** https://github.com/Nishitbaria/openluma · **Live:** https://openluma.vercel.app

## Commands

```bash
bun dev             # Start dev server (localhost:3000)
bun run build       # Production build
bun run lint        # Biome linter
bun run format      # Biome formatter
bun run db:generate # Generate Drizzle migrations
bun run db:migrate  # Run migrations
bun run db:push     # Push schema directly (dev only)
bun run db:studio   # Open Drizzle Studio GUI
```

Use `bun` — not npm, pnpm, or yarn. Use Biome for lint/format — not ESLint or Prettier.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19, React Compiler) |
| Language | TypeScript (strict) |
| Database | PostgreSQL + Drizzle ORM (`lib/db/schema.ts`) |
| Auth | Better Auth (`lib/auth.ts`) — sessions, Google OAuth |
| AI | Vercel AI SDK v7 + OpenAI GPT-5-mini (`lib/ai/agents/`) |
| Email | Resend (`lib/email.ts`) |
| Uploads | Uploadthing (`lib/uploadthing.ts`) |
| Cache | Upstash Redis (`lib/redis.ts`) |
| UI | shadcn/ui (radix-nova style) + Tailwind CSS v4 |
| Icons | Lucide React |

## Project Structure

```
app/
  (auth)/           # Sign-in, sign-up — redirects if authenticated
  (dashboard)/      # Authenticated: dashboard, events, chat, profile, settings
  (public)/         # Public: landing, event discovery, user profiles
  api/              # API routes: auth, chat, events, invitations, cohosts, uploads
  ticket/           # QR ticket pages

components/
  ai-elements/      # Chat UI primitives (conversation, message, prompt-input, artifact)
  chat/             # ChatPanel
  events/           # Event cards, filters, RSVP, delete, attendee list, invite form
  layout/           # Header, footer, sidebar, theme toggle, mobile nav
  ui/               # shadcn/ui primitives (radix-nova style)

lib/
  ai/agents/        # Orchestrator + event agent (multi-agent delegation)
  db/schema.ts      # Full database schema with relations
  auth.ts           # Better Auth server config
  auth-client.ts    # Better Auth client
  email.ts          # Email templates (Resend)
  validators/       # Zod schemas for events, invitations, RSVPs

actions/            # Server actions (events, rsvps, invitations, profile)
hooks/              # Custom React hooks
providers/          # Context providers
```

## Architecture

### AI Agent System

- **Orchestrator** (`lib/ai/agents/orchestrator.ts`): Routes requests via `ToolLoopAgent` and `delegateToEventAgent`
- **Event Agent** (`lib/ai/agents/event-agent.ts`): 10 tools for event CRUD, RSVP, invitations
- Entry point: `POST /api/chat` → streams via `createAgentUIStreamResponse`
- Artifacts pass structured data (`event-created`, `event-list`) to the UI
- Client: `useChat` with `DefaultChatTransport` in `components/chat/chat-panel.tsx`
- Tool results rendered via `isToolUIPart()` from AI SDK v7

### Auth

- Server (cached): `const session = await getSession(await headers())` — `React.cache()` per request
- Import from `@/lib/auth`: `getSession` (server components) and `auth` (API routes)
- Client: `const { data: session } = authClient.useSession()`
- Redirect hook: `useRedirectIfAuthenticated("/dashboard")` in auth layout

### Database

- Schema at `lib/db/schema.ts` with Drizzle ORM
- Key tables: users, sessions, events, rsvps, invitations, eventCohosts, attendeeCheckins, chatMessages
- Enums: event_type, event_visibility, rsvp_status, invitation_status, invitation_role
- Unique constraints: `rsvps(eventId, userId)`, `eventCohosts(eventId, userId)`

### Access Control

- **Private events**: Visible only to host, cohosts, and approved RSVPs
- **Dashboard**: Auth-guarded in `(dashboard)/layout.tsx`
- **Event management** (edit, attendees, analytics): Host or cohost only
- **Delete event**: Host only (not cohosts)
- **Self-RSVP/invite blocked**: Hosts cannot RSVP to or invite themselves
- **RSVP to private events**: Requires a pending invitation
- **API routes**: Mutation endpoints verify host/cohost ownership

### Route Groups

- `(auth)` — Unauthenticated only
- `(dashboard)` — Authenticated with sidebar layout
- `(public)` — Public with header/footer layout

### Uploads

- Server: `lib/uploadthing.ts` — `profileAvatar` and `eventCoverImage` endpoints
- Client: `lib/uploadthing-client.ts` — `useUploadThing` hook (custom UI, no pre-built components)
- SSR: `NextSSRPlugin` in root `app/layout.tsx`

## Design System

See [`DESIGN.md`](DESIGN.md) for the full source of truth.

**Always follow these rules for UI changes.**

### Colors — Theme Tokens Only

Never use hardcoded colors (`text-green-600`, `bg-blue-500`). Always use semantic tokens: `text-primary`, `bg-muted`, `text-muted-foreground`, `text-destructive`, `border`, `ring`. Opacity: `bg-primary/80`.

### Typography (Public Pages)

Use `PixelParagraph` for descriptions and `PixelHeading` for hero/landmark headings only:

```tsx
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words"
import { PixelHeading } from "@/components/ui/pixel-heading-character"

<PixelHeading as="h1" mode="wave" autoPlay cycleInterval={300} staggerDelay={120} showLabel={false}>
  Title
</PixelHeading>

<PixelParagraph
  text="Description text."
  pixelWords={["key term"]}
  font="circle"
  pixelWordClassName="text-foreground"
  className="mt-4 text-muted-foreground leading-relaxed"
/>
```

Both are Server Components. Use `PixelHeading` sparingly — hero + one landmark section max per page.

### Buttons

- **`MetalButton`**: Single primary CTA per section (conversion goal)
- **`Button variant="outline"`**: Secondary actions alongside MetalButton
- **`Button variant="ghost"`**: Tertiary/cancel/nav — never for important CTAs

### Components

- Use shadcn/ui from `components/ui/` — never build primitives from scratch
- Destructive actions: always use `Dialog` with confirm button
- Empty states: icon + heading + helper text
- Toasts: `sonner` (`toast.success`, `toast.error`)
- Charts: shadcn `ChartContainer` wrapping Recharts — colors via `hsl(var(--primary))` only

## Coding Conventions

- Server Components by default; `"use client"` only when needed
- Use `Link` from `next/link`, not `<a>` tags
- Next.js 16 params: `params: Promise<{ id: string }>` — must be awaited
- Env vars in `.env.local` (gitignored); see `.env.example`
- Parallelize independent async work with `Promise.all()`
- Use `useMemo` for derived data in client components
- Avoid `{number && <JSX>}` — use ternary or `!= null` guard
- Minimize scope — focused diffs, no unrelated changes
- Match existing patterns before introducing new abstractions

## Commit Messages (Conventional Commits)

release-please reads commits for version bumps and changelogs.

```
<type>(<optional scope>): <short description>
```

| Type | Version bump |
|------|--------------|
| `feat` | minor |
| `fix` | patch |
| `feat!` / `fix!` | major (breaking) |
| `perf` | patch |
| `refactor`, `docs`, `chore`, `build`, `ci` | no release |

Examples: `feat: add calendar export`, `fix(email): ics attachment missing timezone`, `feat(ai): add attendee suggestion tool`

Rules: present tense, lowercase, under 72 chars, no trailing period.

## Before Submitting

1. Run `bun run lint` and `bun run build`
2. Follow design system rules for any UI change
3. One feature or fix per PR
4. Add screenshots for UI changes
