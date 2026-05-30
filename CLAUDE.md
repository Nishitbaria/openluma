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
- Server-side (cached): `const session = await getSession(await headers())` — uses `React.cache()` for per-request dedup
- Import from `@/lib/auth`: `getSession` (cached, for server components/pages) and `auth` (raw Better Auth instance, for API routes)
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

### Uploads
- **Server config**: `lib/uploadthing.ts` — file router with `profileAvatar` and `eventCoverImage` endpoints
- **Client**: `lib/uploadthing-client.ts` — exports `useUploadThing` hook (no pre-built UI components)
- **SSR**: `NextSSRPlugin` in root `app/layout.tsx` with `extractRouterConfig(ourFileRouter)`
- **Cover image picker**: Custom drag-and-drop UI using `useUploadThing("eventCoverImage")` in `components/events/event-cover-image-picker.tsx`
- **Profile avatar**: Custom upload button using `useUploadThing("profileAvatar")` on profile page
- No `@uploadthing/react/styles.css` import — all upload UI is custom-built

## Design System Guidelines

> **IMPORTANT: Always follow these rules for every UI change — no exceptions.**

### Colors — Theme Only
- **Never** use hardcoded colors like `text-green-600`, `bg-blue-500`, `text-red-500`, etc.
- **Always** use semantic theme tokens: `text-primary`, `bg-primary`, `text-muted-foreground`, `bg-muted`, `text-destructive`, `bg-destructive`, `border`, `ring`, etc.
- For opacity variants use Tailwind's slash syntax: `bg-primary/80`, `bg-primary/60`, `text-primary/70`
- Status indicators: use `text-primary` for success/active, `text-muted-foreground` for neutral, `text-destructive` for errors

### Typography
- Headings: `font-bold` or `font-semibold` with `tracking-tight`
- Body/labels: `text-sm text-muted-foreground`
- Stat values: `text-2xl font-bold`
- Captions: `text-xs text-muted-foreground`

### Pixel Typography Pattern (Public Pages)

> **IMPORTANT: Every new public-facing page must follow this pattern for descriptions and hero titles.**

**Descriptions** — always use `PixelParagraph` instead of a plain `<p>`:
```tsx
import { PixelParagraph } from "@/components/ui/pixel-paragraph-words"

<PixelParagraph
  text="Your description text here."
  pixelWords={["key term", "another term"]}  // 1–3 meaningful words max
  font="circle"
  pixelWordClassName="text-foreground"
  className="mt-4 text-muted-foreground leading-relaxed"
/>
```
- Pick 1–3 key concept words per description to highlight — never highlight filler words
- Use `font="circle"` consistently across all pages for visual cohesion
- `pixelWordClassName="text-foreground"` makes pixel words pop from `text-muted-foreground` base

**Animated titles** — use `PixelHeading` for hero/landmark headings only:
```tsx
import { PixelHeading } from "@/components/ui/pixel-heading-character"

<PixelHeading
  as="h1"
  mode="wave"       // "wave" for hero, "random" for accent lines
  autoPlay
  cycleInterval={300}
  staggerDelay={120}
  showLabel={false}
  className="text-5xl font-bold tracking-tight"
>
  Your Title
</PixelHeading>
```
- Use `PixelHeading` sparingly — hero section + 1 landmark section per page max
- Section subheadings (`h2`, `h3`) stay as plain text — pixel animation on every heading is overwhelming
- `mode="wave"` for primary titles, `mode="random"` for secondary accent headings

**Both components are Server Components** — no `"use client"` needed unless the page already requires it.

### Spacing & Layout
- Card padding: use `CardHeader` / `CardContent` — never add raw `p-*` to `<Card>` directly
- Consistent gap: `gap-2` (tight), `gap-4` (default), `gap-6` (sections), `gap-8` (page sections)
- Stack spacing: `space-y-2` (tight), `space-y-4` (default), `space-y-6` (sections)

### Button Usage — MetalButton vs Button

**`MetalButton`** (chromatic shader ring, `components/ui/metal-button.tsx`) — use for:
- The **single primary CTA** on a page (e.g. "Get Started Free", "Start for Free", "Create Event")
- Actions that are the **main conversion goal** of a section
- Max **1 MetalButton per section** — the effect loses impact if overused

```tsx
import { MetalButton } from "@/components/ui/metal-button"
<MetalButton asChild size="lg">
  <Link href="/sign-up">Get Started Free</Link>
</MetalButton>
```

**`Button variant="outline"`** — use for:
- **Secondary actions** alongside a MetalButton (e.g. "Browse Events", "View on GitHub")
- Actions that are optional or supplementary — not the main goal

**`Button variant="ghost"`** — use for:
- **Tertiary/low-priority actions** (e.g. "Cancel", "Skip", nav links)
- Never use ghost for important CTAs

**Rule of thumb**: One MetalButton per section max. If a section has only one button, it should be MetalButton. If it has two, MetalButton = primary, outline = secondary.

### Components
- Use shadcn/ui components from `components/ui/` for all UI primitives — never build custom buttons, inputs, dialogs from scratch
- Confirmation actions (delete, cancel): always use a `Dialog` with a destructive confirm button — never inline two-button patterns
- Empty states: always show an icon + heading + helper text — never just plain text
- Loading states: use `disabled` + text change (e.g. "Saving...") — no spinners unless async duration is unknown
- Toast notifications: use `sonner` (`toast.success`, `toast.error`) for all user feedback

### Icons
- Source: Lucide React only (`lucide-react`)
- Size: `h-4 w-4` (inline), `h-5 w-5` (card headers), `h-8 w-8` (empty states)
- Color: `text-muted-foreground` by default; `text-primary` for active/highlighted

### Charts & Data Viz
- Use shadcn chart (`components/ui/chart.tsx`) wrapping Recharts — never raw Recharts without `ChartContainer`
- Colors: only `hsl(var(--primary))` and its opacity variants — no hardcoded hex/rgb/named colors
- Always show a zero/empty state when there is no data

## Conventions

- Use Biome for linting/formatting, not ESLint/Prettier
- Use `pnpm` as the package manager
- shadcn/ui components in `components/ui/` (radix-nova style, `components.json`)
- Server Components by default; add `"use client"` only when needed
- Use `Link` from `next/link` for navigation, not `<a>` tags
- Auth (server): `getSession(await headers())` from `@/lib/auth` — cached per request via `React.cache()`
- Auth (client): `authClient` from `@/lib/auth-client`
- Icons: use Lucide React (`lucide-react`)
- Params in Next.js 16: `params: Promise<{ id: string }>` (must be awaited)
- Env vars in `.env.local` (gitignored); `.env.example` has placeholders
- Parallelize independent async operations with `Promise.all()` — never sequential awaits for independent work
- Use `useMemo` for derived data in client components that filter/map arrays from props
- Avoid `{number && <JSX>}` — use ternary or `!= null` guard to prevent rendering `"0"`

## GitHub

- Repo: https://github.com/Nishitbaria/openluma
- License: MIT
