# Design Spec: School Management System UI

**Purpose:** fixed, concrete values for Claude Code to build against — colors, type, spacing, and component patterns as literal decisions, not descriptions it has to interpret. Paste this whole document into your first frontend prompt (and reference it again in every later UI session) so every screen stays consistent instead of drifting toward Claude Code's own default look each time.

**Reference:** built to match the reference screenshots provided (soft light-mode dashboard, black pill navigation, avatar-stack, rounded white cards) — not a generic Tailwind/shadcn dashboard default.

---

## 1. Color tokens

Use these exact hex values. Do not substitute "similar" colors — consistency across screens depends on every session using the same literal values.

| Token name | Hex | Usage |
|---|---|---|
| `--color-ink` | `#10141A` | Primary text, nav pill background, primary buttons |
| `--color-page` | `#F7F6F3` | Page background (warm off-white, not pure white) |
| `--color-surface` | `#FFFFFF` | Card backgrounds |
| `--color-border` | `#E4E4E4` | All hairline borders (0.5-1px) |
| `--color-text-secondary` | `#5F5E5A` | Labels, muted text, inactive nav items |
| `--color-accent-blue` | `#83A2DB` | Avatar fills, informational accents, links |
| `--color-accent-coral` | `#CE6969` | Reserved for one avatar-fill role only — see note below |
| `--color-success-bg` | `#EAF3DE` | Present / paid / confirmed status pill background |
| `--color-success-text` | `#3B6D11` | Present / paid / confirmed status pill text |
| `--color-danger-bg` | `#FAECE7` | Absent / overdue / violation status pill background |
| `--color-danger-text` | `#993C1D` | Absent / overdue / violation status pill text |

**Rule:** status pills (present/absent, paid/unpaid, submitted/pending) always use the `success` or `danger` pair above — never blue or coral for status. Blue and coral are reserved for avatars and incidental accents, not semantic states. Mixing these up is the fastest way for the palette to stop meaning anything.

**Text-on-color rule:** text on a colored background always uses the darker "text" token from the same pair (e.g., `--color-success-text` on `--color-success-bg`), never plain black or gray — this is already baked into the tokens above, just don't override it per-screen.

---

## 2. Typography

| Role | Font | Weight | Size | Usage |
|---|---|---|---|---|
| Display/heading | Lufga (fallback: Manrope) | 600 | 20-24px | Page titles, section headers |
| Body/UI | Lufga (fallback: Manrope) | 400-500 | 13-15px | Labels, buttons, table cells, nav |
| Data/numeric | Lufga (fallback: Manrope), tabular figures | 600 | 20-22px | Metric card numbers, gradebook scores, fee amounts |

**Note on Lufga:** it's not available on standard free CDNs. If you have a license/file for it, self-host it (`@font-face` with the actual font file). If not, use Manrope as the permanent fallback — it's close enough in character (geometric, rounded terminals) that the two are visually compatible, so don't mix Lufga on some screens and a different substitute on others.

**Two weights only in body/UI text:** 400 for regular text, 500-600 for emphasis. Don't reach for 700/800 — it reads heavier than this design language uses anywhere in the reference.

**Sentence case everywhere** — buttons, nav labels, headers. Never Title Case, never all-caps.

---

## 3. Spacing, radius, borders

| Token | Value | Usage |
|---|---|---|
| `--radius-card` | 14px | Cards, panels |
| `--radius-pill` | 20px (nav), 12-16px (status badges) | Pills and badges |
| `--radius-control` | 8px | Buttons, inputs |
| `--border-width` | 0.5px | All borders — never 1px+, it reads heavier than the reference |
| Card padding | 16-20px | Consistent across all card types |
| Grid gap | 12px | Between cards in a grid |

**No drop shadows.** The reference uses flat surfaces with hairline borders for separation, not shadow-based elevation. If Claude Code adds `box-shadow` by default (shadcn's default card does), remove it — border + subtle background difference does the elevation work here instead.

---

## 4. Component patterns

### Navigation
Black pill (`--color-ink` background, white text, `--radius-pill`) around the *active* tab only, sitting inside a light pill-shaped container (`--color-surface` background, `--color-border` border). Inactive tabs: `--color-text-secondary` text, no background, no border.

### Avatar stack
Overlapping circles (`margin-right: -8px`), 2px `--color-page`-colored border between them to create separation without a shadow. Fill colors rotate through `--color-accent-blue`, `--color-accent-coral`, and `--color-ink` (for a "+N more" overflow circle) — not through the full palette, just those three.

### Metric card
`--color-surface` background, `--color-border` border, `--radius-card`. Label: 12px, `--color-text-secondary`, above the number. Number: 22px, weight 600, `--color-ink` (or `--color-danger-text`/`--color-success-text` if the metric itself is a status count, like "absent today").

### Status pill
Small rounded badge (`--radius-pill` at 12px scale), background + text from the matching success/danger token pair. Never any other color for status. 11px text, weight 600.

### List row (roster, gradebook, invoice list)
Flex row, `0.5px solid --color-border` bottom divider (last row in a card: no divider), avatar/initials circle + name on the left, status pill or value on the right. No zebra striping, no row backgrounds — the divider alone separates rows.

---

## 5. Explicit "don't" list

Give Claude Code these constraints directly — without them, it defaults to the generic look every time:
- Don't use shadcn's default `Card` component styling (drop shadow, 1px border) — override to match section 3 above.
- Don't use an indigo/purple/violet accent anywhere — this palette has no purple.
- Don't invent new colors for new states as the app grows — every new status (e.g., "pending," "on leave") should map to the existing success/danger pair or `--color-text-secondary` for neutral, not a new hue.
- Don't use gradients anywhere, including on buttons or headers.
- Don't add icons from a different icon set per screen — pick one icon library (e.g., Tabler or Lucide, outline style only) and use it everywhere for consistency.

---