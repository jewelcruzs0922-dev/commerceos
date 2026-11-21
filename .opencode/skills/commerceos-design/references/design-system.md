---
name: CommerceOS Design System
description: Concrete tokens, type scale, spacing, elevation, and component recipes for the CommerceOS visual direction. Read together with the commerceos-design skill before writing UI code.
---

# CommerceOS Design System — Quiet Operations

Direction: a calm operations ledger. Near-white neutral surfaces with a faint green cast, ink text, thin rules instead of shadow stacks, monospace figures for anything an operator compares, and one emerald accent reserved for action and current location.

This replaces the earlier "Ledger" amber/IBM Plex direction. The governing instruction package (`MASTER_INSTRUCTIONS.md`, `BRAND_GUIDELINES.md`) specifies emerald, soft neutrals, Geist or Inter, and 10–14px corners. Do not reintroduce amber as the action color.

## Color tokens

Light values live on `:root`, dark values on `.dark` in `src/app/globals.css`. Components consume them through shadcn semantic classes (`bg-background`, `text-muted-foreground`, `border-border`), never raw hex.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `#F7F8F5` | `#0B110E` | Page surface |
| `--foreground` | `#14201A` | `#E9EFEA` | Ink text |
| `--card` | `#FFFFFF` | `#111915` | Discrete objects only |
| `--popover` | `#FFFFFF` | `#15201A` | Menus, dialogs, tooltips |
| `--muted` | `#EFF2EE` | `#18241D` | Table headers, sunken rows |
| `--muted-foreground` | `#5A6860` | `#A0ADA5` | Secondary text, labels |
| `--border` | `#E1E6E0` | `#26352C` | Dividers and rules |
| `--input` | `#89968E` | `#5D7164` | Field boundaries (≥3:1) |
| `--primary` | `#0B6B4B` | `#34C08A` | Primary action, active nav |
| `--primary-foreground` | `#F5FBF8` | `#06130D` | Text on primary |
| `--secondary` | `#EDF1EE` | `#1B2A22` | Secondary surfaces |
| `--accent` | `#E7F0EA` | `#1A2C24` | Hover, selected row, current nav |
| `--accent-foreground` | `#0B4A36` | `#D9F3E7` | Text on accent |
| `--destructive` | `#B42318` | `#F58A80` | Delete, refund, void |
| `--ring` | `#0B6B4B` | `#34C08A` | Focus ring |

Semantic status. Always paired with a label or icon; never color alone.

| State | Text light | Surface light | Text dark | Surface dark |
| --- | --- | --- | --- | --- |
| success | `#1F7A53` | `#E6F1EB` | `#6FCF9F` | `#12271C` |
| warning | `#8A5A12` | `#F7EEDC` | `#E0B15F` | `#2A2113` |
| danger | `#B42318` | `#F7E5E3` | `#F58A80` | `#2C1714` |
| info | `#2B5B85` | `#E6EDF4` | `#8DB8DC` | `#14232F` |
| neutral | `#5A6860` | `#EFEDE8` | `#A0ADA5` | `#1B231E` |

Chart series, max four visible. Order: emerald, blue, ochre, slate. A fifth (mauve) exists only for rare stacked series.

| Series | Light | Dark |
| --- | --- | --- |
| 1 | `#0B6B4B` | `#34C08A` |
| 2 | `#2B5B85` | `#7BB2DE` |
| 3 | `#8A5A12` | `#D8A657` |
| 4 | `#5A6860` | `#A0ADA5` |
| 5 | `#8C6AA0` | `#B49AC4` |

Measured contrast (WCAG 2.1):

| Pair | Ratio |
| --- | --- |
| Light ink on background | 15.7:1 |
| Light muted text on card | 5.9:1 |
| Light primary button label | 6.2:1 |
| Light field boundary on card | 3.1:1 |
| Dark ink on background | 16.4:1 |
| Dark muted text on card | 7.7:1 |
| Dark primary button label | 8.2:1 |
| Dark field boundary on card | 3.4:1 |
| Focus ring on card (both modes) | 6.5:1 / 7.7:1 |

Rules:
- Emerald is action and current location, not decoration. Never large fills, never gradients.
- Borders carry grouping. One shadow token exists, `--shadow-overlay` (`0 1px 2px rgb(8 20 14 / 0.06)`), used only on overlays. No other elevation steps.
- Dark mode is a designed set, not an inversion.
- Status chips: `border` at 25% of the status color, status surface fill, status text, 12px sentence case.

## Typography

- UI: **Geist Sans** (`--font-geist-sans`), weights 400/500/600.
- Figures, SKUs, order numbers, timestamps: **Geist Mono** (`--font-geist-mono`), 400/500.
- Loaded with `next/font`, `display: swap`. One family pair project-wide.

| Role | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 32 / 40 | 600 | One per screen, at most |
| `h1` | 24 / 32 | 600 | Page title |
| `h2` | 18 / 26 | 600 | Section title |
| `h3` | 15 / 22 | 600 | Card or group title |
| `body` | 14 / 22 | 400 | Default |
| `small` | 13 / 20 | 400 | Table cells, meta |
| `label` | 12 / 16 | 500 | Field labels, column headers |
| `figure` | 28 / 34 | 600 | KPI values, mono |
| `figure-sm` | 16 / 22 | 500 | Inline metrics, mono |

Rules:
- `tabular-nums` on every table number, KPI, and money value. Tailwind class: `tabular-nums`.
- Column headers 12px, 500, muted, sentence case.
- Tables: 44px rows compact, 52px comfortable. Pick one per screen.
- No all-caps eyebrows. No letter-spacing tricks. No accented words inside headings.
- Truncate long names with `truncate` and expose the full value via `title`.

## Spacing, grid, radius

- 4px base: 4, 8, 12, 16, 24, 32, 48, 64.
- Page padding 16 mobile, 24 tablet, 32 desktop. Content max width 1440px.
- Section rhythm 32px; inside a section 16px; label to field 6px.
- 12-column grid, 24px gutter at desktop.
- Radius scale: 6px `sm`, 10px `md`, 12px `lg`, 14px `xl`. Controls, cards, and buttons use `lg` (12px); dialogs use `xl` (14px); chips are pill-shaped. Nothing else exceeds 16px.
- Control heights: 32px default (compact tables and toolbars), 36px `size="lg"` for primary form actions, 28px `size="sm"` for dense row actions.

## Brand

- Mark: an open ring ("C") with a horizontal ledger rule through the opening. Monogram, not a cart.
- Files: `public/brand/mark-ink.svg`, `public/brand/mark-inverse.svg`, `public/brand/app-icon.svg`, `src/app/icon.svg`.
- In-product lockup: `src/components/brand/wordmark.tsx` (`BrandMark`, `Wordmark`). Uses currentColor; the rule is `text-primary`.
- The mark must stay legible at 16px and in one color. No gradients, no container.

## Component recipes

**Page header.** Title (`h1`) left, one primary action right, secondary actions as ghost buttons. One row, fixed height. No hero banners.

**KPI strip.** Up to four metrics in one row separated by 1px rules, not cards. Label (12px muted) → value (mono figure, tabular) → delta with arrow and comparison window. No icons, no colored blocks.

**Table.** Header on `--muted`, 44px rows, 1px row rules, no vertical lines, no zebra. Numeric columns right-aligned and mono. First column is the identifier. Status is a labelled chip. Hover tints the row; selected rows use `--accent` at full tint with a checkbox.

**Buttons.** `default` = emerald fill for the single primary action. `outline` = secondary. `ghost` = tertiary and toolbar icons (always `aria-label`). `destructive` = tinted red, used for irreversible actions after confirmation. Never two primary buttons in one region.

**Forms.** `FieldGroup` + `Field` + `FieldLabel` + control + `FieldDescription`/`FieldError`. Labels above, always visible. Validate on blur and submit. Two columns max at desktop, stacked at mobile. Destructive actions use a dialog that names the object and consequence.

**Empty state.** `Empty` with one sentence naming the object and reason, one action to resolve it, optional 20px Lucide icon. No illustration.

**Toasts.** Sonner, bottom-right, 1px border, no fill except the icon. Copy states what changed and what happens next.

**Dialog.** Title required. Description required. Actions right-aligned; destructive action last and visually distinct.

**Charts.** Title states the question. Max four series. Horizontal gridlines only, 1px. Axis labels formatted as the data. Zero baseline for bars. Empty and partial states designed.

## Motion

- 120–200ms for state changes, 200–300ms for panels, ease-out.
- No page-load entrances, no hover transforms that move targets.
- `prefers-reduced-motion` disables animation globally in `globals.css`.

## Accessibility

- Text ≥ 4.5:1; large text ≥ 3:1; field boundaries and focus rings ≥ 3:1.
- Every interactive element is keyboard reachable. `globals.css` adds a 2px emerald `:focus-visible` outline at 2px offset on every surface; component rings sit inside it.
- Icon-only buttons carry `aria-label`. Decorative icons are `aria-hidden`.
- Form errors are programmatically associated and use `role="alert"` where appropriate.
- Tables use `<th scope>`. Empty states are text, not only an icon.
- No horizontal page scroll at 375px; tables scroll inside their own container.

## Reference route

`/design` renders the token tables, type specimens, control states, data display, overlays, and empty/loading states. It is the sign-off surface for this system and must be checked in both themes at 375, 768, and 1440 before UI work is reported done. It is marked `noindex` and is not part of the dashboard shell.
