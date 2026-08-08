# OpenLuma Design System

Source of truth for visual and interaction decisions. Codifies what already ships — not a rebrand.

**North star:** Open-source Lu.ma — no vendor lock-in.

Agent shorthand lives in [`AGENTS.md`](AGENTS.md); this file is the full reference.

---

## 1. Product + memorable thing

OpenLuma is an open-source event platform: AI-assisted creation, public pages, RSVPs, invitations, and check-in — without SaaS lock-in.

The one memorable idea every marketing surface should reinforce:

> **Open-source Lu.ma — no vendor lock-in**

If a first viewport could belong to any events app after removing the nav, branding is too weak.

---

## 2. Visual thesis

Industrial / builder-tool aesthetic with light retro-pixel texture. Black-and-white restraint, metal CTAs, and a sparse flickering grid signal “self-hostable software,” not a lifestyle events brand. Marketing may break the grid for composition; the app stays dense and predictable.

---

## 3. Color tokens

Use semantic theme tokens only (`app/globals.css`). Never hardcode palette colors in components (`text-green-600`, `bg-blue-500`, hex/rgb in classNames).

| Token | Role | Light | Dark |
|-------|------|-------|------|
| `background` / `foreground` | Page canvas + body text | near-white / black | black / white |
| `primary` / `primary-foreground` | Emphasis, metal CTAs, key UI | black / white | white / black |
| `muted` / `muted-foreground` | Soft surfaces + secondary copy | light gray / mid gray | dark gray / soft gray |
| `secondary` / `accent` | Subtle fills | light gray | mid dark |
| `border` / `input` / `ring` | Hairlines, fields, focus | light gray / black ring | dark gray / soft ring |
| `destructive` | Errors and destructive actions | red (only intentional chroma) | red |
| `card` / `popover` | Elevated surfaces when needed | white-ish | near-black |

Opacity modifiers are fine: `bg-primary/10`, `bg-muted/30`, `text-foreground/80`.

Charts: `hsl(var(--primary))` (or equivalent semantic mapping) — no decorative multi-hue series unless data requires it.

---

## 4. Typography

Loaded in `app/layout.tsx`:

| Role | Family | Usage |
|------|--------|--------|
| Body / UI | Geist (`font-sans`) | App chrome, section headlines that are not landmarks, forms |
| Display (pixel) | Geist Pixel modes (`square`, `grid`, `circle`, `triangle`, `line`) | `PixelHeading`, `PixelParagraph` accents |
| Mono | Geist Mono | Code, technical labels |

**Do not** introduce Inter, Roboto, Space Grotesk, or other default stacks.

### PixelHeading budget

- **Public pages:** at most **hero + one landmark** (`PixelHeading`) per page.
- Modes: `wave` / `random` with intentional stagger — presence, not decoration spam.
- Prefer `PixelParagraph` for supporting copy; highlight key phrases via `pixelWords`.

### Hierarchy on landing

1. Brand (hero-level OpenLuma signal)
2. One memorable claim (vendor lock-in / open-source Lu.ma)
3. Supporting line (e.g. “Events, simplified.”) — never replaces the brand
4. Short body + single primary CTA group

---

## 5. Buttons / CTAs

| Control | When |
|---------|------|
| `MetalButton` | **One** primary conversion CTA per section |
| `Button variant="outline"` | Secondary action beside MetalButton |
| `Button variant="ghost"` | Tertiary, cancel, nav — never the main conversion |

Keep CTA labels short and action-oriented (“Get Started Free”, “Browse Events”).

---

## 6. Texture & motion

### FlickeringGrid

- **Allowed:** hero, auth surfaces — signature atmosphere.
- **Not allowed:** wallpapering Features / How it works / dashboard / every section.
- Keep full-bleed structure on the hero; fade out toward the bottom so content stays readable.

### Motion budget

Ship **2–3 purposeful motions** on a marketing page, for example:

1. PixelHeading wave/random on brand or landmark
2. How-it-works step stagger
3. Optional shiny text on a single claim badge

No scroll-jacking, no perpetual particle circus, no competing animated badges.

---

## 7. Landing composition rules

- **One composition** in the first viewport — not a dashboard of widgets.
- **Hero budget:** brand, one claim, one short support line, one CTA group, one dominant visual plane (`FlickeringGrid`). No stats strips, schedule snippets, or feature pill clusters in the hero.
- **Brand test:** OpenLuma must remain the hero-level signal.
- **One job per section:** one headline, one short support line, then content.
- **Cards:** default off. Cards only when they are the container for a user interaction. Prefer low-chrome lists/rows for feature catalogs.
- **Section rhythm:** public sections ~`py-24`; spacing base `--spacing: 0.25rem` (4px). Prefer clearer hierarchy over more padding.
- **Hybrid layout:** marketing can be compositional; dashboard stays grid-disciplined.

**Safe to keep:** B/W dual theme, Metal CTAs, FlickeringGrid signature, shadcn primitives, sticky compact header.

---

## 8. Anti-patterns

Do **not**:

- Purple-on-white / purple-to-indigo gradient themes
- Warm cream + terracotta “AI brochure” look
- Broadsheet hairline newspaper layouts as a default
- Hardcoded colors outside semantic tokens
- Multi-feature pill clusters (“Open source · Self-hostable · AI-powered”) in the hero
- Classic 3-column equal icon-card grids for non-interactive feature lists
- Multiple `MetalButton`s competing in one section
- Extra `PixelHeading`s beyond the budget
- Glow stacks, emoji decoration, or floating promo stickers on hero media
- Replacing Geist / Geist Pixel with generic web fonts

---

## Quick checklist (UI PRs)

1. Tokens only — no raw palette classes
2. Primary CTA is `MetalButton` (one per section)
3. PixelHeading within budget
4. Landing hero passes brand + memorable-claim test
5. Features are low-chrome, not SaaS icon-card slop
6. FlickeringGrid only where signature belongs
7. `bun run lint` clean on touched files
