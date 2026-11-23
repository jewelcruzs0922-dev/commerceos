---
name: CommerceOS Design System
description: Concrete tokens, type scale, spacing, elevation, and component recipes for the CommerceOS green-and-yellow visual direction. Read together with the commerceos-design skill before writing UI code.
---

# CommerceOS Design System — Green/Yellow Operations

Direction: a confident retail operations console. Deep green forms the application shell and carries primary actions. Bright yellow is a selective highlight for demo state, attention queues, selected navigation, and one comparison series. White work surfaces hold dense data. Near-black text and thin rules keep every module readable.

Color is part of the identity, not a coat of paint. Do not drift into an all-neutral admin template, and do not turn every surface green or yellow.

## Color tokens

Light values live on `:root`, dark values on `.dark` in `src/app/globals.css`. Components consume semantic classes (`bg-primary`, `text-muted-foreground`, `border-border`, `bg-highlight`), never raw hex.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | `#F7F9F6` | `#0B110D` | Page canvas |
| `--foreground` | `#171C19` | `#EEF6F0` | Ink text |
| `--card` | `#FFFFFF` | `#121A15` | Work surface |
| `--popover` | `#FFFFFF` | `#16211A` | Menus, dialogs, tooltips |
| `--muted` | `#F1F5F1` | `#15231A` | Table headers, sunken rows |
| `--muted-foreground` | `#626B65` | `#A7B8AD` | Secondary text, labels |
| `--border` | `#E1E7E2` | `#26362C` | Dividers and rules |
| `--input` | `#78857C` | `#647A6C` | Field boundaries (≥3:1) |
| `--primary` | `#16834A` | `#4ADE80` | Primary action, links |
| `--primary-strong` | `#0E6038` | `#3CCB70` | Primary hover |
| `--primary-foreground` | `#FFFFFF` | `#07110C` | Text on primary |
| `--secondary` | `#EAF4EC` | `#17271D` | Secondary surfaces |
| `--accent` | `#E7F5EC` | `#183323` | Hover, selected row |
| `--accent-foreground` | `#0E6038` | `#D9FBE5` | Text on accent |
| `--destructive` | `#B42318` | `#F58A80` | Delete, refund, void |
| `--ring` | `#16834A` | `#4ADE80` | Focus ring |
| `--highlight` | `#F4D531` | `#F4D531` | Demo state, attention, selected nav |
| `--highlight-soft` | `#FFF3A6` | `#2D270C` | Attention panel fill |
| `--highlight-foreground` | `#171C19` | `#171C19` | Text on yellow |
| `--highlight-border` | `#E7D47A` | `#5B4D13` | Yellow panel boundary |

Semantic status. Always paired with a label or icon; never color alone.

| State | Text light | Surface light | Text dark | Surface dark |
| --- | --- | --- | --- | --- |
| success | `#16834A` | `#E7F5EC` | `#6FCF9F` | `#12271C` |
| warning | `#C45000` | `#FFF3A6` | `#F4D531` | `#2D270C` |
| danger | `#B42318` | `#FCEBE9` | `#F58A80` | `#2C1714` |
| info | `#0E7490` | `#E7F6FA` | `#67D3E8` | `#0C252B` |
| neutral | `#626B65` | `#EFF3EF` | `#A7B8AD` | `#16251F` |

Chart series, maximum four visible. Green is revenue. Yellow is the comparison or orders series and must use `#B38600` on white so the line clears 3:1.

| Series | Light | Dark |
| --- | --- | --- |
| 1 | `#16834A` | `#4ADE80` |
| 2 | `#B38600` | `#F4D531` |
| 3 | `#0E6038` | `#2BB673` |
| 4 | `#626B65` | `#A7B8AD` |

Measured contrast (WCAG 2.1):

| Pair | Ratio |
| --- | --- |
| Light ink on canvas | 16.3:1 |
| Light muted text on white | 5.5:1 |
| White on primary green | 4.8:1 |
| Light field boundary on white | 3.9:1 |
| Dark ink on background | 17.3:1 |
| Dark muted text on card | 8.5:1 |
| Dark primary label | 11.0:1 |
| Dark field boundary on card | 3.8:1 |
| Sidebar text on deep green | 7.3:1 |
| Near-black on bright yellow | 11.8:1 |
| Yellow focus ring on deep green | 5.2:1 |

Rules:
- Deep green is the shell. Green is the primary action. Yellow is attention, demo state, selected navigation, and one chart series. Never use yellow as a large page background or as the primary button.
- White is the work surface. Near-black is text and high-emphasis type. Use soft green for selected or related records.
- Borders carry grouping. One shadow token exists, `--shadow-overlay` (`0 16px 40px rgb(22 60 38 / 0.16)`), used only on overlays.
- Sidebar: `#0E6038` with `#F4FBF5` text; active item is `#F4D531` with `#171C19` text; border is white at 14%; focus ring is yellow.
- Light mode only. No theme switcher or dark variant is exposed.
- Status labels: no capsule, border, or fill. Use a 2px × 10px colored tick plus 12px sentence-case text. The label carries the meaning; the tick reinforces it.

## Typography

- UI: **Geist Sans** (`--font-geist-sans`), weights 400/500/600.
- Figures, SKUs, order numbers, timestamps: **Geist Mono** (`--font-geist-mono`), 400/500.
- Loaded with `next/font`, `display: swap`. One family pair project-wide.

| Role | Size / line-height | Weight | Use |
| --- | --- | --- | --- |
| `display` | 32 / 40 | 600 | One per screen, at most |
| `h1` | 26 / 32 | 600 | Page title |
| `h2` | 18 / 26 | 600 | Section title |
| `h3` | 15 / 22 | 600 | Card or group title |
| `body` | 14 / 22 | 400 | Default |
| `small` | 13 / 20 | 400 | Table cells, meta |
| `label` | 12 / 16 | 500 | Field labels, column headers |
| `figure` | 32 / 40 | 600 | Primary metric, mono |
| `figure-sm` | 22 / 28 | 600 | Supporting metric, mono |

Rules:
- `tabular-nums` on every table number, KPI, and money value. Tailwind class: `tabular-nums`.
- Column headers 12px, 500, muted, sentence case. No uppercase tracking.
- Tables: 44px rows compact, 52px comfortable. Pick one per screen.
- No all-caps eyebrows. No letter-spacing tricks. No accented words inside headings.
- Truncate long names with `truncate` and expose the full value via `title`.

## Spacing, grid, radius

- 4px base: 4, 8, 12, 16, 24, 32, 48, 64.
- Page padding 16 mobile, 24 tablet, 32 desktop. Content max width 1440px.
- Section rhythm 32px; inside a section 16px; label to field 6px.
- 12-column grid, 24px gutter at desktop.
- Radius scale: 6px `sm`, 10px `md`, 12px `lg`, 14px `xl`. Controls, cards, and buttons use `lg`; dialogs use `xl`; nothing else exceeds 16px. Status labels have no radius because they are not chips.
- Control heights: 32px default, 36px `size="lg"` for primary form actions, 28px `size="sm"` for dense row actions.

## Brand

- Mark: an open ring ("C") with a horizontal rule through the opening. Monogram, not a cart.
- Files: `public/brand/mark-ink.svg`, `public/brand/mark-inverse.svg`, `public/brand/app-icon.svg`, `src/app/icon.svg`.
- In-product lockup: `src/components/brand/wordmark.tsx` (`BrandMark`, `Wordmark`). Uses currentColor; the rule is `text-primary` in white surfaces and yellow on the green shell.
- The mark must stay legible at 16px and in one color. No gradients, no container.

## Component recipes

**Page header.** A soft mint panel holds a 34px title, the status/count directly below it, and one primary action on the right. Secondary actions are outline or ghost buttons. No breadcrumbs, taglines, or descriptions. Record counts are plain mono text, never capsules.

**Performance strip.** One band, not four cards. Primary metric sits on deep green with a yellow delta and white label; three supporting metrics sit on white, separated by 1px rules. Label → mono value → delta with arrow and comparison window. No icons, no decorative sparklines.

**Attention queue.** One soft-yellow panel with a bright yellow boundary, dark text, mono counts, and plain row links. Use it for work that needs action, never for general navigation.

**Table.** Use the shared `.ledger-table` treatment: open `border-y` frame, pale-green 40px header, 13px sentence-case column labels, 44px rows, 1px row rules, no vertical lines, no zebra, no enclosing card. Numeric columns right-aligned and mono. First column is the identifier. Status is colored text only, never a pill or tick. Hover tints the row; selected rows use `--accent`.

**Collections.** Use the same dense table, not cards. First column is a consistent green folder tile, collection title, and mono handle. Then status, product count, and last updated. Never repeat long descriptions in list rows.

**Toolbar.** Search keeps a field boundary; filter and sort triggers are transparent ghost controls and only gain weight when active. No row of identical outlined buttons.

**Buttons.** `default` = green fill for the single primary action. `outline` = secondary. `ghost` = tertiary and toolbar icons (always `aria-label`). `destructive` = tinted red, used for irreversible actions after confirmation. Never two primary buttons in one region.

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
- Every interactive element is keyboard reachable. `globals.css` adds a 2px primary green `:focus-visible` outline at 2px offset on every white surface; the green shell uses the yellow sidebar ring.
- Icon-only buttons carry `aria-label`. Decorative icons are `aria-hidden`.
- Form errors are programmatically associated and use `role="alert"` where appropriate.
- Tables use `<th scope>`. Empty states are text, not only an icon.
- No horizontal page scroll at 375px; tables scroll inside their own container.

## Reference route

`/design` renders the token tables, type specimens, control states, data display, overlays, and empty/loading states. It is the sign-off surface for this system and must be checked in both themes at 375, 768, and 1440 before UI work is reported done. It is marked `noindex` and is not part of the dashboard shell.
