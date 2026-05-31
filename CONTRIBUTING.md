# Contributing to OpenLuma

Thanks for your interest in contributing! OpenLuma is actively maintained and welcomes contributions of all kinds — bug fixes, features, docs, and more.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Code Style](#code-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Issues](#reporting-issues)

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/openluma.git`
3. Create a branch: `git checkout -b feat/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database (local or remote)

### Install dependencies

```bash
pnpm install
```

### Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the required values in `.env.local`. Minimum required for local dev:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — any random string
- `BETTER_AUTH_URL` — `http://localhost:3000`
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`
- `OPENAI_API_KEY` — for the AI agent features

### Run the database

```bash
pnpm db:push      # Push schema to database
pnpm db:studio    # Optional: open Drizzle Studio GUI
```

### Start the dev server

```bash
pnpm dev
```

## How to Contribute

### Picking an issue

- Check the [issue tracker](https://github.com/Nishitbaria/openluma/issues) for open issues
- Issues tagged `good first issue` are ideal for new contributors
- Comment on an issue before starting work to avoid duplicate effort

### Branch naming

| Type | Format |
|------|--------|
| Feature | `feat/short-description` |
| Bug fix | `fix/short-description` |
| Docs | `docs/short-description` |
| Refactor | `refactor/short-description` |

## Code Style

- **Linter/formatter**: Biome (not ESLint/Prettier) — run `pnpm lint` and `pnpm format`
- **TypeScript**: strict mode — no `any` unless unavoidable
- **Colors**: use theme tokens only (`text-primary`, `text-muted-foreground`, etc.) — never hardcoded Tailwind colors
- **Components**: Server Components by default; add `"use client"` only when needed
- **Buttons**: `MetalButton` for primary CTAs, `Button variant="outline"` for secondary
- **Typography**: use `PixelParagraph` for public-facing descriptions, `PixelHeading` for hero/landmark headings
- See `CLAUDE.md` for the full design system reference

## Submitting a Pull Request

1. Make sure `pnpm build` and `pnpm lint` pass with no errors
2. Fill out the PR template completely
3. Keep PRs focused — one feature or fix per PR
4. Add screenshots for any UI changes
5. Be responsive to review feedback

## Reporting Issues

- Use the [bug report template](https://github.com/Nishitbaria/openluma/issues/new?template=bug_report.yml) for bugs
- Use the [feature request template](https://github.com/Nishitbaria/openluma/issues/new?template=feature_request.yml) for ideas
- Search existing issues before opening a new one

## Questions?

Open a [GitHub Discussion](https://github.com/Nishitbaria/openluma/discussions) or reach out via the issue tracker.
