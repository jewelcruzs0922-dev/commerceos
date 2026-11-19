---
name: CommerceOS Design
description: Anti-slop interface design rules for CommerceOS. Load before designing or restyling any page, dashboard, table, form, chart, or component, and when reviewing a UI for generic or AI-generated looks. Covers visual direction, typography, color, spacing, data density, motion, accessibility, and browser-based visual verification.
---

# CommerceOS Design

CommerceOS must look like software a real store pays for — dense, calm, specific. It must not look like a generated demo.

Read `references/design-system.md` for the token values and component recipes before writing UI code.

## Rule zero

A choice is slop when it was made by reflex rather than for this product. Test every visual decision:

1. Could this be pasted into an unrelated SaaS demo unchanged? If yes, it is slop.
2. Does it encode information (state, hierarchy, category, action) or only decorate?
3. Does it match the local design system, or does it invent a second one?
4. Would a store operator work faster because of it? If not, cut it.

Technique is not slop in isolation. A gradient, a card, or a shadow is fine when it carries meaning. The problem is reflex and repetition.

## Process

Do not start writing markup until steps 1–3 are done.

1. **Inventory.** Read the existing pages, `globals.css`, `tailwind.config.*`, `components.json`, and the closest existing component. Reuse before inventing.
2. **State one thesis per screen.** One sentence: what the operator must decide or do here, and what the single focal point is. Example: "The overview answers 'what needs attention today' — one exception list, then trend context."
3. **Assign roles.** For this screen, decide: primary action, secondary actions, status colors in use, density level (compact/comfortable), and which data is the hero.
4. **Build with system primitives.** shadcn components, design tokens, existing patterns. No one-off CSS for things tokens already cover.
5. **Inspect in the browser.** Run the app, screenshot at 375/768/1440, critique against the checklist, fix, re-render.
6. **Run the sign-off checklist** at the bottom.

## Banned defaults

Never ship these unless the brief explicitly asks and you record why:

| Tell | Why it fails | Do instead |
|------|--------------|------------|
| Purple/indigo gradient hero or gradient buttons | The single strongest "AI made this" signal | Solid ink surfaces; one accent used for meaning |
| Glassmorphism / backdrop-blur panels | Blur behind dashboard text hurts legibility | Opaque surfaces, one border + one shadow step |
| Inter / Roboto as the default pick | Signals no decision was made | The project type scale in `design-system.md` |
| Three equal feature cards in a row | Landing-page reflex inside an app | A table, a list, or asymmetric proportions |
| Every block in a rounded card | Removes hierarchy; everything competes | Cards only for discrete objects; use dividers and spacing |
| Colored left accent bars on cards | Decorates instead of informing | Status badge with label + meaning |
| A different hue per KPI / chart series | Color stops carrying meaning | One accent + neutrals; color only for semantic state |
| Emoji as UI iconography | Inconsistent rendering, unprofessional | Lucide icons at one consistent size and stroke |
| Pulsing / "Live" / "Verified" badges | Implies data that may not exist | Static state that is true and sourced |
| "Elevate / Seamless / Supercharge / Unleash" copy | Generic marketing voice | Concrete nouns and verbs: "Refund order", "3 items low" |
| Numbers without units or context | Unreadable for operators | `$12,480`, `+8.2% vs. last 7 days`, `19 low stock` |
| Decorative `01 / 02 / 03` markers | Numbering implies sequence that does not exist | Numbering only for real ordered steps |
| Fade-and-slide on every section | Generic entrance theater | Motion only for state change or feedback |

## Layout and hierarchy

- Every screen has exactly one focal point. Two competing "hero" areas means no hierarchy.
- Dashboards are information tools, not posters. Prefer list/table density over tall card stacks above the fold.
- Use a 12-column grid; align content to column edges. Nothing floats between columns.
- Group with proximity and spacing before reaching for borders. A border is the last resort for grouping.
- Asymmetry is allowed and useful: a wide primary table with a narrow secondary column beats two equal halves.
- Page skeleton: page title + contextual actions on one row, filters below, content, then pagination. Keep header height stable across modules.
- Sidebar navigation: one active state, clear section grouping, text labels always visible at desktop; icon-only at collapsed widths with tooltips.

## Typography

- One family, two cuts (sans for UI, mono for figures and identifiers). Maximum two families.
- Use the scale in `design-system.md`. Do not hand-pick arbitrary px values.
- Numerals in tables, KPIs, and money: `font-variant-numeric: tabular-nums`.
- Line length under 80 characters for prose. Tables and dense lists are exempt.
- No all-caps tracked labels as a decorative eyebrow. Uppercase is allowed only for immutable status chips and table column headers at small size.
- Never accent a single word in a heading with italic, color, or a different weight.
- Truncate with ellipsis and expose full text via `title` or a popover — never let a name break row alignment.

## Color

- Restrained palette: neutral surfaces, ink text, one accent, plus semantic status colors only.
- Apply roughly 70% neutral / 20% ink / 10% accent by area.
- Color always pairs with a label, icon, or position — never color alone to convey state (accessibility).
- Status semantics are fixed project-wide: success, warning, danger, neutral, info. Do not invent a sixth.
- Borders do the work shadows would. Use one elevation step, not five.
- Dark mode, if built, is a designed mode with its own tested contrast — not an inverted filter.

## Data density and tables

- Tables are the primary surface of this product. Design them deliberately:
  - Right-align numeric columns; left-align text; keep headers aligned with cells.
  - Row height 40–44px compact, 52px comfortable. Pick one per screen.
  - Hover only tints the row; selection uses a checkbox + tinted row, never a border jump.
  - Sticky header on scroll; column widths stable across pages and filters.
  - Sort state visible. Filter state visible and individually removable.
  - Bulk actions appear only when rows are selected, in a persistent bar that does not shift layout.
- Pagination over infinite scroll for operational data. Show total count and page size.
- Show `—` for missing values. Never blank cells that look like zero.

## Charts

- A chart must answer a question stated by its title. If it has no question, delete it.
- No 3D, no bevels, no drop shadows on series. No gradient area fills unless encoding a single continuous scale.
- Max 4 series. Label directly on the series; legends are a fallback.
- Axis labels formatted like the underlying data (`$1.2k`, `Nov 12`), units in the title.
- Zero-baseline for bars. Truncated axes must be labeled.
- Empty and partial data states are designed, not blank frames.

## Forms

- Labels above fields, always visible. Placeholders are examples, never labels.
- Validate on blur and on submit; never validate while the user is still typing the first characters.
- Errors sit under the field, in danger color, with an icon; the message says how to fix it.
- Group related fields with a section heading and generous spacing, not a box for every pair.
- Destructive actions use a confirm dialog that names the object and states the consequence.

## Motion

- Motion communicates change: row enters after creation, panel expands, toast confirms.
- 120–200ms for state changes, 200–300ms for panels. Ease out.
- No entrance animations on page load. No hover transforms that move targets under the cursor.
- Respect `prefers-reduced-motion` everywhere; disable transforms, keep instant state changes.

## Accessibility gates

Every UI change must pass:

- Text contrast ≥ 4.5:1; large text ≥ 3:1; UI borders and focus rings ≥ 3:1 against adjacent colors.
- Keyboard: every interactive element reachable in DOM order; `:focus-visible` ring visible on all surfaces.
- Icon-only buttons have `aria-label`. Decorative icons have `aria-hidden="true"`.
- Form fields have programmatically associated labels and described errors.
- Tables have `<th scope>`. Empty states are announced, not only visual.
- Status is never conveyed by color alone.
- No horizontal page scroll at 375px; tables scroll inside their own container.

## Browser verification loop

Required for any non-trivial visual change.

1. Start the dev server and confirm the route compiles.
2. Capture the actual rendered page — use the Playwright browser tools, not the source. Screenshot at 1440×900, 768×1024, 375×812.
3. Read the screenshot and answer, in order:
   - What is the focal point? Is it the right one?
   - Can I scan the important numbers in under three seconds?
   - Does any element repeat a banned tell?
   - Is anything misaligned, cramped, or touching an edge?
   - Does the empty/loading/error state exist and look intentional?
4. Fix the worst three issues. Re-screenshot. Repeat once.
5. Check the console for hydration errors, overflow warnings, and failed requests.

Do not claim a UI is finished from code alone.

## Sign-off checklist

- [ ] One thesis per screen, one focal point.
- [ ] Typography from the project scale; figures use tabular numerals.
- [ ] Palette limited to neutrals + one accent + semantic status.
- [ ] No banned tells present.
- [ ] Table alignment, sorting, filtering, and pagination behave.
- [ ] Loading, empty, error, and filtered-empty states exist.
- [ ] Keyboard path and focus rings verified.
- [ ] Contrast checked for every text/background pair used.
- [ ] 375 / 768 / 1440 screenshots reviewed.
- [ ] Copy is specific and free of hype words.
- [ ] The screen would survive being shown next to a real commercial admin product.
