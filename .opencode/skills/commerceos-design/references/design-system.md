---
name: CommerceOS Design System
description: Concrete tokens, type scale, spacing, elevation, and component recipes for the CommerceOS "Ledger" visual direction. Read together with the commerceos-design skill before writing UI code.
---

# CommerceOS Design System — "Ledger"

Direction: an operations ledger. Paper-warm neutral surfaces, ink text, thin rules instead of shadows, monospace figures, and exactly one accent reserved for action. It reads as working software: dense, quiet, and specific. It is the deliberate opposite of a dark glass dashboard with purple gradients.

The direction is fixed. Change it only if the user asks, and record the change here so every screen stays consistent.

## Color tokens

Map these into the shadcn CSS variables so components inherit them. Values are light mode; dark mode is a separate designed set, not an inversion.

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#FAF9F6` | Page surface (warm paper, not stark white) |
| `--foreground` | `#17161A` | Ink text |
| `--card` | `#FFFFFF` | Raised surfaces only |
| `--card-foreground` | `#17161A` | |
| `--popover` | `#FFFFFF` | Menus, dialogs |
| `--muted` | `#F1EFEA` | Sunken rows, disabled fills |
| `--muted-foreground` | `#6A675F` | Secondary text, labels |
| `--border` | `#E2DED5` | All rules and dividers |
| `--input` | `#D8D3C8` | Field borders |
| `--primary` | `#17161A` | Primary button = ink |
| `--primary-foreground` | `#FAF9F6` | |
| `--accent` | `#B45309` | Single signal accent: attention, links, active nav |
| `--accent-foreground` | `#FFFDF8` | On accent fills |
| `--destructive` | `#A32A22` | Delete, refund, void |
| `--ring` | `#B45309` | Focus ring |

Semantic status (badges, dots, deltas — always paired with a label):

| State | Text/icon | Fill |
|-------|-----------|------|
| success | `#2F6B4F` | `#E8F0EA` |
| warning | `#8A5A12` | `#F7EEDC` |
| danger | `#A32A22` | `#F7E5E3` |
| neutral | `#5C5950` | `#EFEDE8` |
| info | `#2B5B85` | `#E6EDF4` |

Rules:
- Accent is for action and current location. Never for decoration or large fills.
- Never use accent and destructive side by side without distinct labels.
- Borders carry grouping. One shadow step maximum (`0 1px 2px rgb(23 22 26 / 0.06)`), only on popovers and dialogs.
- No gradients anywhere except a single continuous data-range scale inside a chart.

## Typography

Families:
- UI: **IBM Plex Sans** (400 / 500 / 600)
- Figures, SKUs, order numbers, timestamps, and code: **IBM Plex Mono** (400 / 500)

Use `next/font` with `display: swap`. One family pair project-wide.

| Role | Size / line-height | Weight | Use |
|------|--------------------|--------|-----|
| `display` | 32 / 40 | 600 | Page hero only, max one per screen |
| `h1` | 24 / 32 | 600 | Page title |
| `h2` | 18 / 26 | 600 | Section title |
| `h3` | 15 / 22 | 600 | Card or group title |
| `body` | 14 / 22 | 400 | Default |
| `small` | 13 / 20 | 400 | Table cells, meta |
| `label` | 12 / 16 | 500 | Field labels, column headers |
| `figure` | 28 / 34 | 600 | KPI values, mono, tabular |
| `figure-sm` | 16 / 22 | 500 | Inline metrics, mono, tabular |

Rules:
- `font-variant-numeric: tabular-nums` on every table column of numbers, KPI, and money value.
- Column headers 12px, weight 500, `--muted-foreground`, sentence case.
- No letter-spacing tricks. No all-caps outside status chips.
- Keep header sizes stable between modules so navigation does not jump.

## Spacing, grid, radius

- 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64. No arbitrary values between steps.
- Page padding: 16px mobile, 24px tablet, 32px desktop.
- Content max width 1440px; tables may go full width.
- Vertical rhythm between sections: 32px. Inside a section: 16px. Between label and field: 6px.
- Grid: 12 columns, 24px gutter at desktop.
- Radius: `6px` controls and inputs, `8px` cards and dialogs, `full` for chips only. One radius language — no mixed 2xl pills and 4px squares.
- Control height: 36px default, 32px compact, 28px dense table actions.

## Component recipes

**Page header**
Title (`h1`) left, one primary action right, secondary actions as ghost buttons, optional breadcrumb above. One row, fixed height. No hero banners inside the admin.

**KPI strip**
Up to four metrics in one row, separated by 1px rules rather than cards. Structure: label (12px muted) → value (mono figure) → delta with arrow + comparison window → optional sparkline. No icons, no colored blocks.

**Table**
Header row on `--muted`, 40–44px rows, 1px `--border` row separators, no vertical rules, no zebra striping. Numeric columns right-aligned and mono. First column left-aligned with the primary identifier (order number, product name). Status uses a text chip, not a bare dot. Hover: `--muted` tint. Selected: `--accent` at 6% with a checkbox.

**Status chip**
Small, 12px, 1px border of the semantic color at 25% opacity, semantic fill, semantic text. Sentence case. No dot-plus-word redundancy.

**Empty state**
One sentence naming the object and the reason, one action to resolve it, optional Lucide icon at 20px in `--muted-foreground`. No illustration, no big centered circle.

**Sidebar**
Background `--background`, 1px right border, 240px expanded / 64px collapsed. Section labels in `label` style. Active item: `--muted` fill, `--foreground` text, 2px `--accent` left rule. Icons 18px Lucide, stroke 1.75.

**Chart palette**
Series order: `#17161A`, `#B45309`, `#2B5B85`, `#2F6B4F`. Max four. Gridlines `--border` at 1px, horizontal only. Axis text 12px `--muted-foreground`. Tooltip on `--popover` with 1px border, no shadow.

**Forms**
Two-column max at desktop, stacked at mobile. Section heading (`h3`) + description (`small` muted) + fields. Field = label, control, help or error. Submit row right-aligned with primary + ghost cancel, sticky at the bottom of long forms.

**Toasts (Sonner)**
Bottom-right, 1px border, no color fill except the icon. Success/error copy states what changed and what to do next.

## Copy

- Object-first labels: "Orders", "Refund order", "Mark as fulfilled".
- Numbers always carry scale or unit: `$12,480.00`, `19 of 240 products`, `Updated 4 minutes ago`.
- Never invent trust signals: no "Verified", "Live", "Secure by default" badges.
- Empty-state copy explains the next action, not the feature.

## Dark mode

If dark mode is added, it uses `#141317` background, `#EDEBE6` text, `#1C1A20` cards, and the same accent and semantic hues adjusted for ≥ 4.5:1 contrast. Test every chip and chart series in both modes before shipping. Do not ship dark mode by inverting values.
