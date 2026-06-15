# UIx v2 — Standalone Style Guide (`uix-styleguide`) — Design Spec

**Date:** 2026-06-15 · **Owner:** haris · **Status:** draft (awaiting review)

---

## 1. Overview

A **framework-agnostic, build-free style guide** — plain HTML + CSS + a sprinkle of vanilla JS — that
documents and ships every UI element a typical **CRM / ITSM** product needs, in **light and dark mode**,
as **modular, copy-pasteable** assets. Open `index.html` in any browser to see the whole system; drop the
CSS into any project (HTML, React, Vue, Tailwind, server-rendered — anything) to use it.

It is conceptually **"UIx v2"**: the next generation of the house design system. Where **UIx v1**
(`D:\Development\Projects\UIx`) is a React/Next/shadcn token+composite-registry locked to that stack, v2 is
**stack-neutral** and **standalone**, while deliberately **reusing v1's `--uix-*` token contract** so the two
stay swappable.

### Goals
- One open-in-browser reference showing every component in every state, light + dark.
- Reusable, modular CSS/HTML assets usable in *any* project.
- A coherent visual system **extracted and refined from the "Square UI" template** (the attached
  `square-ui-regate.vercel.app` Régate page and Finance Tracker dashboard).
- Zero build step to *view or consume* the core.

### Non-goals (YAGNI)
- No charting engine — we ship the **palette + container styling + sample SVGs**; projects pair with
  uPlot / Chart.js / ECharts using the `--uix-chart-*` vars.
- No JS component framework, no Storybook, no React. (`app.js` is ~100 lines: theme toggle, copy-to-clipboard, nav.)
- No npm publish / registry plumbing in v1 of this project (that's a later forward-path item).

### Relationship to UIx v1 (and governance)
- **Same token names, new values.** v2 keeps every `--uix-*` contract name from v1's `tokens.json`
  (so a project can swap value sets without renaming). v2 *adds* tokens (allowed as a minor bump under v1's
  semver law): a categorical chart palette + a couple of layout dims.
- **Naming:** `directory-governance.md` bans `v2`/`new`/`copy`/`old` in folder names and mandates
  lowercase-hyphenated. Folder = **`uix-styleguide`** (a new project under `Projects/`, its own git repo,
  `.project-status.json` + README per §2 of governance). "v2-ness" is expressed in git/docs, not the folder name.
- **Supersession path:** if/when v2 replaces v1 in projects, v1 → `_Archive` (the governance-correct way to version).

---

## 2. Architecture

### File layout (modular, build-free)
```
uix-styleguide/
├── index.html                 # the living style guide: section nav + every component, all states
├── styles/
│   ├── tokens.css             # ALL --uix-* custom properties: :root (light) + dark selector
│   ├── base.css               # reset + base element styling (typography, links, focus-visible, ::selection)
│   ├── utilities.css          # a few layout helpers (.uix-stack / .uix-cluster / .uix-visually-hidden)
│   └── components/            # ONE file per component (import order documented)
│       ├── button.css  input.css  select.css  checkbox.css  switch.css  ...
│       ├── card.css  table.css  badge.css  status-pill.css  avatar.css  ...
│       ├── modal.css  drawer.css  popover.css  toast.css  alert.css  tooltip.css ...
│       └── ... (one per component in the inventory, §5)
├── guide/
│   ├── guide.css              # styles for the showcase page chrome ONLY (nav, code blocks, swatches)
│   └── app.js                 # theme toggle, copy-to-clipboard, scrollspy nav, filter/search
├── assets/
│   └── fonts/                 # self-hosted Geist + Geist Mono (woff2) — matches v1 font-sans
└── README.md                  # how to consume in a project; lifecycle; token override recipe
```

### Consumption model
- **View:** open `index.html` (or serve statically). No build.
- **Use in a project:** copy `styles/tokens.css` + `styles/base.css` + the component files you want; or
  link them. Components reference only token vars + their own classes — no cross-file coupling beyond tokens.
- **Theme:** set `data-theme="dark"` (or `.dark`) on `<html>`; default follows `prefers-color-scheme`.

### Class naming convention
- Prefix everything `uix-`; **BEM-lite**: block `.uix-card`, element `.uix-card__header`, modifier
  `.uix-btn--danger`, state via real attributes where possible (`[disabled]`, `[aria-selected]`, `[data-state]`).
- A component's CSS is self-contained and depends only on `--uix-*` tokens (never on another component's classes).
- Class names + token vars map cleanly onto React/Tailwind projects (the same `--uix-*` vars v1 already binds).

---

## 3. Token system — `--uix-*` (v2 values, Square UI-derived)

All names preserved from v1's contract; values refined from the **extracted Square UI palette** (cool
neutrals, larger radii, blue primary accent). Light + dark. Dark declared once under
`:root:where(.dark, [data-theme="dark"])` (mirrors v1, serves both dark conventions).

### Surfaces & neutrals (cool neutral — Square UI `neutral` scale)
| token | light | dark | source |
|---|---|---|---|
| `--uix-bg-app` | `#FAFAFA` | `#0A0A0A` | Square `--background` |
| `--uix-bg-subtle` | `#F5F5F5` | `#171717` | `--secondary`/`--muted` |
| `--uix-bg-hover` | `#EFEFEF` | `#1F1F1F` | derived |
| `--uix-bg-active` | `#E5E5E5` | `#262626` | `--accent` (dark) |
| `--uix-surface` | `#FFFFFF` | `#111111` | `--card` |
| `--uix-surface-2` | `#FFFFFF` | `#171717` | derived |
| `--uix-surface-3` | `#FAFAFA` | `#262626` | derived |
| `--uix-border` | `#E5E5E5` | `rgba(255,255,255,0.08)` | `--border` + v1 hairline |
| `--uix-border-strong` | `#D4D4D4` | `rgba(255,255,255,0.14)` | derived |

### Text
| token | light | dark |
|---|---|---|
| `--uix-text` | `#0A0A0A` | `#FAFAFA` |
| `--uix-text-hushed` | `rgba(10,10,10,0.62)` (~`#525252`) | `rgba(250,250,250,0.64)` |
| `--uix-text-muted` | `#737373` | `#A1A1A1` |
| `--uix-text-reverse` | `#FFFFFF` | — |
| `--uix-text-hushed-reverse` | `rgba(255,255,255,0.62)` | — |

### Accent (BLUE — primary action color; per directive "use its blue")
| token | light | dark | note |
|---|---|---|---|
| `--uix-accent` | `var(--uix-brand, #1447E6)` | `var(--uix-brand, #3080FF)` | Square blue-700 / brighter dark |
| `--uix-accent-dark` | `#0E3AC0` | — | hover/pressed |
| `--uix-accent-light` | `#4D77F0` | — | subtle fills |
| `--uix-accent-fg` | `var(--uix-brand-fg, #FFFFFF)` | — | white text passes AA on `#1447E6` |
| `--uix-link` | `var(--uix-brand, #1447E6)` | `var(--uix-brand, #5B8DEF)` | |
| `--uix-ring` | `var(--uix-brand, #1447E6)` | `var(--uix-brand, #3080FF)` | focus ring |
| `--uix-brand` / `--uix-brand-fg` | *unset (write-only slots)* | | per-project brand override |
| `--uix-brand-muted` | `color-mix(in srgb, var(--uix-accent) 12%, transparent)` | `…16%…` | soft emphasis/selection |

### Status / semantic (each with `-fg` and `-bg`)
| token | light | dark | note |
|---|---|---|---|
| `--uix-success` | `#009767` | `#00D294` | emerald-600 / emerald-400 |
| `--uix-success-fg` | `#FFFFFF` | `#002C22` | |
| `--uix-success-bg` | `#D0FAE5` | `rgba(0,210,148,0.15)` | |
| `--uix-warning` | `#F99C00` | `#FCBB00` | Square signature amber |
| `--uix-warning-fg` | `#1A1A1A` | `#1A1A1A` | **dark fg on amber** (amber + white fails AA) |
| `--uix-warning-bg` | `#FEF3D6` | `rgba(249,156,0,0.16)` | |
| `--uix-info` | `#1447E6` | `#3080FF` | shares accent blue family |
| `--uix-info-fg` | `#FFFFFF` | `#FFFFFF` | |
| `--uix-info-bg` | `#E3EBFF` | `rgba(48,128,255,0.16)` | |
| `--uix-danger` | `#E40014` | `#FF6568` | Square `--destructive` / lighter dark |
| `--uix-danger-fg` | `#FFFFFF` | `#FFFFFF` | |
| `--uix-danger-bg` | `#FFE4E6` | `rgba(255,101,104,0.16)` | |

> **Contrast review is a build task.** Every text/fg-on-bg pair above will be verified to WCAG AA (4.5:1 body,
> 3:1 large/UI) during implementation; values flagged here (notably `warning`) may shift a shade to pass.

### Chart / data-viz palette (NEW — `--uix-chart-1..8`, categorical)
Spans the wheel; all sourced from the files' `oklch` + hex chart vars. Used for charts, category dots, tags.
| token | light | dark | hue |
|---|---|---|---|
| `--uix-chart-1` | `#1447E6` | `#3080FF` | blue |
| `--uix-chart-2` | `#009588` | `#00C2B0` | teal/cyan |
| `--uix-chart-3` | `#009767` | `#00D294` | green/emerald |
| `--uix-chart-4` | `#F99C00` | `#FCBB00` | amber |
| `--uix-chart-5` | `#F05100` | `#FF8B1A` | orange |
| `--uix-chart-6` | `#E40014` | `#FF6568` | red |
| `--uix-chart-7` | `#7F22FE` | `#A685FF` | violet |
| `--uix-chart-8` | `#E70044` | `#FF667F` | pink/rose |
| `--uix-chart-neutral` | `#737373` | `#A1A1A1` | "other"/gray |

### Typography (v1 scale preserved; face = Geist)
`--uix-font-sans` `"Geist", system-ui, sans-serif` · `--uix-font-mono` `"Geist Mono", ui-monospace, monospace`
Scale (size / leading): `display 40/1.05` · `data-hero 34/1.1` · `h2 24/1.15` · `h3 15/1.3` ·
`body 14/1.5` · `meta 12.5/1.4` · `eyebrow 11/1.2` · `tracking-tight -0.02em` · `tracking-eyebrow 0.06em`.

### Radius (refined UP toward Square UI's softer cards)
`--uix-radius-sm 8px` · `--uix-radius-md 12px` (was 8) · **`--uix-radius-lg 16px` (new)** · `--uix-radius-pill 999px`

### Elevation (soft on light; dark leans on borders)
`--uix-shadow-sm 0 1px 2px rgba(0,0,0,.06)` · `--uix-shadow-popover 0 8px 24px rgba(0,0,0,.10), 0 1px 2px rgba(0,0,0,.05)`
· `--uix-shadow-overlay 0 16px 48px rgba(0,0,0,.18)` · `--uix-highlight-top` dark `inset 0 1px 0 rgba(255,255,255,.04)`

### Motion (v1 preserved + extended — see §5.9)
Easing: `--uix-ease-out cubic-bezier(.23,1,.32,1)` (default, entrances) · `--uix-ease-out-strong cubic-bezier(.2,0,0,1)`
· **`--uix-ease-in cubic-bezier(.4,0,1,1)` (new — exits)** · **`--uix-ease-in-out cubic-bezier(.4,0,.2,1)` (new — moves)**
· **`--uix-ease-spring cubic-bezier(.34,1.56,.64,1)` (new — subtle overshoot, used sparingly)**.
Duration: `--uix-dur-fast 120ms` (micro: hover/press) · `--uix-dur 160ms` (standard) ·
**`--uix-dur-slow 240ms` (new — overlays/drawers)** · **`--uix-dur-slower 320ms` (new — large surfaces)**.
Transform offset: **`--uix-lift 4px` (new — subtle rise/slide for popovers)**. Respects `prefers-reduced-motion`.

### Layout dims
`--uix-row-h 56px` · **`--uix-row-h-compact 44px` (new)** · `--uix-control-h 36px` · `--uix-sidebar-w 248px`
· **`--uix-topbar-h 56px` (new)**

### Rows, scrollbars, icons, peek (NEW — added for the feature set in §5.8)
| token | light | dark | use |
|---|---|---|---|
| `--uix-row` | `#FFFFFF` | `#111111` | table row base hue (zebra) |
| `--uix-row-alt` | `#FAFAFA` | `#161616` | zebra alternate hue |
| `--uix-row-pinned-bg` | `#F4F7FF` | `rgba(48,128,255,0.08)` | pinned-group band |
| `--uix-scrollbar-size` | `10px` | `10px` | thin scrollbar thickness |
| `--uix-scrollbar-thumb` | `rgba(10,10,10,0.20)` | `rgba(255,255,255,0.18)` | thumb |
| `--uix-scrollbar-thumb-hover` | `rgba(10,10,10,0.34)` | `rgba(255,255,255,0.30)` | thumb hover |
| `--uix-scrollbar-track` | `transparent` | `transparent` | track |
| `--uix-icon-sm` / `-md` / `-lg` | `16px` / `20px` / `24px` | (same) | icon sizing (lucide) |
| `--uix-peek-w` | `420px` | (same) | side-peek drawer width |

---

## 4. Theming & light/dark mechanism

- `tokens.css` declares light values on `:root`, dark on `:root:where(.dark, [data-theme="dark"])`
  (specificity (0,1,0) so project overrides written later always win — mirrors v1).
- **Default:** `@media (prefers-color-scheme: dark)` applies dark when no explicit choice is set.
- **Manual toggle:** `app.js` flips `data-theme` on `<html>` and persists to `localStorage`; an inline
  no-flash script in `<head>` sets the attribute before paint.
- **Per-project brand:** override the write-only `--uix-brand` / `--uix-brand-fg` slots (accent, link, ring,
  brand-muted all re-chain) — same 3-line recipe as v1.

---

## 5. Component inventory (spec-all; build-all)

Every item ships: the markup pattern, its CSS, all variants/states, light + dark, and a copy-paste snippet in
the showcase. States covered where applicable: **default, hover, focus-visible, active, disabled, loading,
error, selected, read-only**.

### 5.1 Foundations (documented, not "components")
Color palette (semantic + chart swatches w/ values & contrast), typography scale, spacing scale, radii,
elevation, motion, **iconography (lucide, inline SVG; sizing tokens)**, **scrollbar styling**, focus/state model, light/dark.

### 5.2 Form controls
Button (`--primary/secondary/outline/ghost/danger/link`, sizes sm/md/lg, icon-only, with-icon, loading,
disabled) · button-group / split-button · icon-button · text input (label, hint, error, prefix/suffix, sizes) ·
textarea · select (native + styled) · combobox / autocomplete · multi-select / tag-input · checkbox ·
radio + radio-group · switch · slider/range · number stepper · date picker + date-range picker · time picker ·
file upload / dropzone · search input · segmented control · **form layout** (field, fieldset, form-grid,
inline form, validation summary).

### 5.3 Navigation & shell
App shell (sidebar + topbar + content; the Finance/Régate layout) · **sidebar nav** (detailed below) ·
top bar (actions, search, theme toggle, user menu) · breadcrumbs · tabs (line / enclosed / pill) ·
pagination · steps / wizard / stepper · command palette (⌘K) · menu / dropdown menu / context menu ·
page header (title, subtitle, actions, range toggle e.g. `3m/6m/1y`).

**Sidebar nav — detailed requirements:**
- **Items:** leading lucide icon (`--uix-icon-md` 20px) + label, optional trailing badge/count; hover +
  active states (active uses `--uix-brand-muted` fill + accent text); collapsible to an icon-rail width.
- **Collapsible sub-items:** an item may own a nested group toggled by a chevron (`aria-expanded`, animated
  height via `--uix-dur`/`--uix-ease-out`, expansion state persisted). Sub-items indent under the parent,
  no leading icon (small dot marker), with their own active/hover states.
- **Favorites:** a pinned **"Favorites"** section at the top of the sidebar. Set via a star icon revealed on
  item hover (or context-menu "Add to favorites"); filled star = favorited; persisted (localStorage in the
  guide). *(Distinct from table **Pin** — see §5.8.)*
- **Peek:** a sidebar item can trigger the shared **side-peek drawer** (§5.8) to preview an entity without
  navigating away.
- **Sections & dividers:** grouped items under eyebrow labels, separated by a divider.

### 5.4 Data display
Card (header/body/footer) · **KPI / stat tile** (value, trend pill, icon, sparkline) · **data table**
(sortable headers, row selection, sticky header, density toggle, zebra, row actions, expandable rows,
summary row) · table toolbar (search, filters, column-visibility, saved views, export) · list & list-item ·
description / key-value list · **badge / chip / status-pill** (status: open/in-progress/resolved/closed;
priority: low→critical; SLA) · avatar / avatar-group / user-chip · tooltip · progress bar + progress ring ·
meter / utilization bar · timeline / activity feed · tree view · calendar · empty state · skeleton loaders ·
**charts** (area/line, bar, donut, sparkline, horizontal-bar) — palette + containers + sample SVG only.

**Data table — detailed requirements:**
- **Zebra rows:** two hues (`--uix-row` / `--uix-row-alt`) on `:nth-child(even)`; toolbar-toggleable (on by
  default). Hover, `[aria-selected]`, and pinned states override the stripe.
- **Two-row filter bar** (above the table): **Row 1 — Status** (multi-select chips/segmented: All · Open ·
  In Progress · Resolved · Closed, with counts); **Row 2 — Type** (Incident · Request · Problem · Change · …).
  Active filters echo as removable chips; "Clear all" resets. Sits with the toolbar row (search · saved
  views · column visibility · density · export).
- **Pin:** per-row pin toggle (hover-revealed icon + row context menu). Pinned rows lift into a sticky
  **"Pinned"** group at the top (banded with `--uix-row-pinned-bg` + pin glyph) and **stay visible regardless
  of sort/filter**. Multiple pins; order preserved; persisted per saved view.
- **Peek:** row peek affordance (hover icon, or Space on the selected row) opens the shared **side-peek
  drawer** (§5.8); the row's title link still opens the FULL record. ↑/↓ moves peek across rows.
- **Scrollbars:** the body scroll container uses the themed scrollbar tokens; the header stays sticky.
- Plus: sortable headers, row selection (checkbox + select-all), sticky header, density toggle
  (`--uix-row-h` / `--uix-row-h-compact`), row-actions menu, expandable rows, summary/footer row.

### 5.5 Feedback & overlays
Alert / inline banner (info/success/warning/danger) · toast / notification · modal / dialog ·
drawer / side sheet · popover · confirm (destructive) dialog · spinner / progress overlay.

### 5.6 CRM / ITSM patterns (composites)
Ticket / case row + **detail layout** (two-column: record + side meta) · priority/SLA indicators
(breach warning, SLA timer) · assignment / owner chip · comments thread + composer (@mention) ·
**Kanban board / column** (pipeline) · filter bar / saved filters · inbox master-detail (list + detail) ·
notification center · audit-log entry · label / tag taxonomy · contact / customer card (CRM) ·
deal / pipeline-stage · attachment list.

### 5.7 Utility / typography
Headings, text styles, links, `code`/`kbd`, blockquote, lists, dividers, keyboard-shortcut chips,
inline status dots.

### 5.8 Cross-cutting interaction patterns
These behaviors span multiple components and share **one implementation each** (built once, reused).

- **Peek (side-peek drawer):** a right-side drawer (`--uix-peek-w` 420px) that slides in over a dimmed
  backdrop to preview a record without leaving the list/view. Header (title + status + close), scrollable
  body (key fields), footer quick actions. Triggered from **table rows** and **sidebar items**. Keyboard:
  **Space** peeks the selected item, **↑/↓** moves peek to prev/next, **Esc** closes; focus trapped while open.
  Clicking the record title opens the FULL record (navigation) — peek never navigates.
- **Pin (table rows):** lifts selected rows into a sticky top group that ignores sort/filter; per-view,
  persisted. Visual: `--uix-row-pinned-bg` band + filled pin glyph; click to unpin.
- **Favorites (nav entities):** star an item to surface it in the sidebar's top "Favorites" section;
  persisted. A sibling of Pin, kept as a separate word/affordance to avoid confusion.
- **Icons:** lucide, inline SVG, `currentColor`, sized via `--uix-icon-sm/md/lg`. A documented subset ships
  in the guide; projects pull additional lucide glyphs as needed.

### 5.9 Motion & micro-interactions (closes a v1 gap)
Motion is **purposeful, subtle, and fast** — it guides attention, signals state and spatial relationships
(where things come from / go to), and confirms actions; it is never decorative-only and never blocks input.
Defaults err toward restraint. v1 shipped almost no motion; v2 treats it as a first-class layer.

**Principles**
- Animate to *explain* a change (enter/exit, expand/collapse, move) — not to entertain.
- Entrances **decelerate** (`--uix-ease-out`); exits are **faster** and **accelerate** (`--uix-ease-in`,
  ~0.7× the enter duration) so dismissals feel snappy.
- Respect spatial origin — menus grow from their trigger, drawers from their edge; one thing moves at a time.
- Reserve `--uix-ease-spring` overshoot for small confirmations (a toggle, a star) — never for layout.

**Per-interaction choreography**
- **Hover/press:** bg/border/color transition `--uix-dur-fast` `--uix-ease-out`; buttons press to `scale(.98)`.
- **Focus:** ring appears in ≤120ms (or instant); never animates layout.
- **Disclosure** (accordion, sidebar sub-items): height + opacity, `--uix-dur` `--uix-ease-out`.
- **Popover / dropdown / tooltip:** fade + `scale(.96→1)` + `--uix-lift` translate from the trigger,
  `--uix-dur-fast`; built on the **native Popover API + `@starting-style` + `transition-behavior: allow-discrete`** (no JS for enter/exit).
- **Modal `<dialog>`:** backdrop fade + content fade/rise, `--uix-dur-slow`; `@starting-style` entry, allow-discrete exit.
- **Drawer / side-peek:** slide from edge + backdrop fade, `--uix-dur-slow`; `--uix-ease-out` in / `--uix-ease-in` out (Vaul-like).
- **Toast:** slide + fade in from the edge, stack, swipe / auto-dismiss.
- **Tabs:** active indicator slides between tabs (`--uix-ease-out`).
- **Table:** row hover tint; subtle highlight pulse on insert/update; pinned-row lift; reorder via the
  **View Transitions API** where supported (graceful fade fallback).
- **Loading:** skeleton shimmer and spinners are the *only* sanctioned continuous/looping animations.
- **Optional accents:** KPI count-up and value crossfades — off by default, opt-in per project.

**Mechanics (build-free):** prefer CSS `transition` + `@keyframes`; use modern CSS — `@starting-style`,
`transition-behavior: allow-discrete`, the Popover API, `<dialog>`, and the View Transitions API — as
**progressive enhancement** so enter/exit work without JS. `app.js` only covers what CSS can't (focus trap,
peek ↑/↓ navigation, toast queue, persistence).

**Accessibility (mandatory):** under `prefers-reduced-motion: reduce`, drop transforms/slides and fall back to
instant or opacity-only while keeping essential feedback. Implementation will lean on the
`emil-design-eng` / `interaction-design` skills for final polish.

> **Review ask:** trim anything not worth building (YAGNI) or add anything missing before we plan.

---

## 6. The showcase page (`index.html`)

- **Left section nav** mirroring §5 groups, with scrollspy (`app.js`).
- Each component rendered in **all variants + states**, with a **light/dark toggle** (global) and a
  **"copy" button** on every example (copies the HTML snippet).
- **Responsive preview** affordance for layout components (shell, table, kanban).
- Top: a **token reference** — color swatches (value + contrast badge), type scale, radii, shadows, motion.
- Self-documenting: the page *is* the docs; no separate doc site.

---

## 7. Accessibility & best practices
- Semantic HTML first; ARIA only to fill gaps (menus, dialogs, tabs, comboboxes follow APG patterns).
- Visible `:focus-visible` ring on every interactive element using `--uix-ring`.
- WCAG **AA** contrast verified for all token pairs and component text.
- `prefers-reduced-motion` honored; `prefers-color-scheme` as default theme.
- Keyboard operability for overlays (focus trap in modal/drawer, Esc to close, ⌘K palette).
- Hit targets ≥ 24px (UI) / 44px (touch where relevant).

## 8. Tooling & forward path
- **Now:** hand-rolled, zero-dependency, build-free (matches the chosen architecture).
- **Later (README-noted, not built):** a tiny **Style Dictionary** step can emit the same tokens to
  JSON / SCSS / Tailwind `@theme` from one source — the bridge that lets v2 feed v1's Tailwind world and
  other stacks without a rewrite.
- **Explicitly skipped:** Storybook/Ladle (React/build-heavy, fights framework-agnostic + standalone).
- Self-hosted Geist fonts (no CDN dependency); **icons = lucide, inline SVG** (`currentColor`, sized by `--uix-icon-*`).

## 9. Open questions / decisions log
- [x] Role vs UIx v1 → **UIx v2** (framework-agnostic sibling, shared token contract).
- [x] Aesthetic → **extract & refine** Square UI; add a proper light mode.
- [x] Format → **modular, build-free**.
- [x] Tokens → **keep `--uix-*` names**, new values.
- [x] Location → **new sibling folder**, governance name `uix-styleguide`.
- [x] Accent → **blue** (`#1447E6` light / `#3080FF` dark), brand-slot overridable.
- [x] Scope → **spec all, build all**.
- [x] Peek model → **side-peek drawer** (§5.8), keyboard-driven; reused by table + sidebar.
- [x] Icon strategy → **lucide, inline SVG**, `currentColor`, `--uix-icon-*` sizing.
- [x] Table features → zebra (two-hue), two-row status/type filter bar, row pinning, themed scrollbars (§5.4).
- [x] Sidebar features → items, collapsible sub-items, top Favorites section, peek, lucide icons (§5.3).
- [x] Motion → first-class **§5.9** system (purposeful/subtle; extended easing+duration tokens; modern
  build-free CSS: `@starting-style` / allow-discrete / Popover API / View Transitions; reduced-motion).
- [ ] Final folder name confirmation (`uix-styleguide` vs `uix-kit`/`uix-system`/other).
- [ ] Inventory trims/additions (§5 review).
- [ ] Whether to seed `git init` + `.project-status.json` + README now or as the plan's first step.
