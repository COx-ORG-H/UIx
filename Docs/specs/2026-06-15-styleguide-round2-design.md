# UIx v2 Style Guide — Round 2 (dashboard, view-menu, conventions, fixes) — Design Spec

**Date:** 2026-06-15 · **Owner:** haris · **Status:** draft (awaiting review)

---

## 1. Overview

A second batch of work on the standalone `uix-styleguide`, layered on top of the existing component
catalog ([index.html](../../index.html)) and `--uix-*` token contract. It adds a realistic **example
dashboard**, consolidates the many per-table view controls into one **View menu**, fills in the missing
**convention sections** (icons, emoji, images, prose), and fixes two defects found during review.

Everything stays **build-free** (plain HTML + CSS + vanilla JS, no npm to view/consume) and **offline**
(no external image/emoji services). New CSS lives in `styles/components/*.css` behind the `uix.components`
cascade layer; new behavior extends the existing page-agnostic `guide/app.js`.

### Decisions locked in (from brainstorming)
1. **Dashboard domain:** blended service + account **workspace** (maximizes components interacting).
2. **Dashboard delivery:** **standalone `dashboard.html`** built on the real app-shell, linked from the guide.
3. **Table view controls:** **one consolidated "View" menu**, with density as a 3-way segmented control.
4. **Emoji scope:** **convention + reactions** — a documented curated set *and* an interactive reaction picker.

### Non-goals (YAGNI)
- No build step, no bundler, no framework.
- No online image services (Picsum/Unsplash) — local SVG placeholders only.
- No full emoji keyboard/search — a small curated set only.
- No backend; all interactions are client-side demo state.
- No new design tokens beyond what the work strictly needs (one row-height tier).

---

## 2. Work items

Each item lists **goal → approach → files → acceptance**.

### 2.1 Fix: overlay enter-transition (modal + drawer + peek)

**Goal.** All three overlays must animate *in and out* again. Currently they open broken: the side-peek and
drawer park off-screen at `translateX(100%)`, and the modal opens at `opacity:0` (invisible).

**Root cause (confirmed live).** The uncommitted asymmetric-transition refactor re-declares the full
`transition` *shorthand* on **both** the base rule and the `[open]` rule. Re-declaring the shorthand on
`[open]` breaks the `@starting-style` entrance, so the element never leaves its starting (closed) transform/
opacity. Proof: with transitions disabled the open peek lands correctly at its open position
(`transform:none`, on-screen) and `.uix-peek[open]` matches — so layout/cascade are fine; only the
transition is broken.

**Approach.** Keep one `transition` (property list + `allow-discrete` behavior) on the **base** rule. In the
`[open]` rule override **only** `transition-duration` and `transition-timing-function` (longhands) to get the
slower decelerate-in; the base values give the faster accelerate-out. This preserves the intended asymmetry
without re-declaring the shorthand. Verify in the live preview that modal, drawer, and peek each animate
**in and out**. If the longhand-asymmetry still misbehaves in the target browser, fall back to the
symmetric single-transition form that worked prior to this branch (asymmetry is a nice-to-have, correctness is not).

**Files.** `styles/components/peek.css`, `styles/components/drawer.css`, `styles/components/modal.css`.

**Acceptance.** Opening each overlay slides/fades it into its correct position over `--uix-dur-slow` with
`--uix-ease-out`; closing animates out over `--uix-dur` with `--uix-ease-in`; `prefers-reduced-motion` still
makes them instant (motion.css guard); no `transform:none`-stuck or `opacity:0`-stuck states.

### 2.2 Fix: contact-card button sizing

**Goal.** Remove the incidental width mismatch between "Message" and "View".

**Approach.** In `.uix-contact__actions`, give the buttons `flex:1` (equal width, full row). Both remain
`uix-btn--sm`. This reads as an intentional balanced pair.

**Files.** `styles/components/contact-card.css`.

**Acceptance.** The two action buttons are equal width and fill the card's action row at all card widths.

### 2.3 Table "View" menu + 3-tier density

**Goal.** Collapse the four toolbar view buttons (Freeze / Columns / Density / Zebra) into one compact,
intuitive control that scales across the many tables in the system, and add the missing
**Comfortable** density tier.

**Approach.**
- New `.uix-view-menu` pattern: a single toolbar button `View ▾` (sliders icon) using the existing Popover
  API + `.uix-menu`/`.uix-popover` styling, anchored under the button (CSS anchor positioning, as the
  existing Columns popover already does).
- Menu contents, top to bottom:
  - **Density** — a `.uix-segmented` 3-way control: Compact / Standard / Comfortable.
  - **Zebra striping** — a `.uix-switch`.
  - **Freeze first column** — a `.uix-switch`.
  - **Columns** — the existing per-column show/hide checklist, nested as a labelled group.
- **Density model:** replace the 2-state `.uix-table--compact` toggle with `data-density="compact|standard|
  comfortable"` on `.uix-table`. Add token `--uix-row-h-comfortable`; `td` height becomes
  `var(--uix-row-h)` (standard) overridden by `[data-density="compact"]` / `[data-density="comfortable"]`.
  Keep `.uix-table--compact` as a thin back-compat alias mapping to compact so existing markup/tests don't break.
- **Persistence:** one object per table id in `localStorage` under `uix-view-<id>`
  `{ density, zebra, freeze, hiddenCols:number[] }`, superseding the current `uix-cols-<id>` key (migrate on read).
- Search input + filter chips stay in the toolbar (content filters, not view options).
- The guide's Data-display table is migrated to the View menu so the pattern is documented once and is the
  single source of truth.

**Files.** new `styles/components/view-menu.css`; edits to `styles/components/table.css` (density tiers,
back-compat alias), `styles/tokens.css` (+`--uix-row-h-comfortable`), `guide/app.js`
(`setupViewMenu`, fold into `initTable`; pure helpers for density cycling + view-pref read/write/migrate),
`index.html` (toolbar swap), `styles/main.css` (import).

**Acceptance.** One `View ▾` button replaces the four; density has three working tiers; zebra/freeze/columns
toggles work from inside the menu; choices persist across reload per table; legacy `uix-cols-<id>` values are
read once and migrated; the old `.uix-table--compact` class still yields compact rows.

### 2.4 Icons section (#5)

**Goal.** Document how icons are used, and surface the available set.

**Approach.** New guide section "Icons":
- **Usage guidance:** lucide glyphs as inline SVG; `currentColor`; sizing via `--uix-icon-sm/md/lg`;
  `stroke-width:2`, round caps; icon-only controls require an `aria-label` (or visible tooltip); decorative
  icons get `aria-hidden="true"` (as `icon()` already emits); the `icon(name,size)` helper and where to add
  new glyphs.
- **Inventory grid:** auto-rendered from `iconNames()` — each glyph at standard size with its name and
  click-to-copy.
- Add the extra lucide glyphs the rest of this work needs (e.g. `sliders-horizontal`, `rows`, `image`,
  `camera`, `smile-plus`, `laptop`/`monitor`, `eye`, `message-square`, `paperclip`, `trash`).

**Files.** `assets/icons.js` (+glyphs, reuse `iconNames()`), `index.html` (new section + nav link),
`guide/app.js` (`buildIconInventory`), possibly small `guide/guide.css` additions for the grid.

**Acceptance.** Section renders every glyph in `PATHS`, names are copyable, guidance covers sizing +
a11y; light/dark correct.

### 2.5 Emoji + reactions section (#6)

**Goal.** A documented, work-appropriate emoji convention plus a real reactions component.

**Approach.**
- **Convention copy:** a curated set with intended meaning — ✅ done/approved, ⚠️ caution, 🚀 shipped,
  👍 acknowledged, 👀 reviewing, 🎉 win, 🔥 urgent, ❓ question, 🚫 blocked, 📌 pinned. State allowed
  contexts (comments, reactions, light status signaling) and the a11y rule: emoji are never the *sole* carrier
  of meaning (always paired with text/label), and decorative emoji get `aria-hidden` while meaningful ones get
  an accessible label.
- **`.uix-reactions` component:** a row of reaction pills (`emoji + count`, "mine" highlighted) plus an
  "add reaction" button that opens a small picker popover containing the curated set. Selecting toggles the
  current user's reaction and updates the count. Pure-helper `toggleReaction(state, emoji)` for the count/mine
  math (unit-tested); `setupReactions` wires the DOM.
- Demonstrated on a comment in both the guide and the dashboard.

**Files.** new `styles/components/reactions.css`; `guide/app.js` (`setupReactions` + helper);
`index.html` (section + a reactions instance on the comments demo); `styles/main.css` (import);
`assets/icons.js` (`smile-plus`); `guide/app.test.js` (toggleReaction).

**Acceptance.** Picker opens from the add button, shows the curated set; clicking an emoji adds/removes the
user's reaction and increments/decrements the count; existing reactions render with counts; keyboard +
`aria-label`s present; works in the comments demo and on the dashboard.

### 2.6 Image patterns section (#7)

**Goal.** Patterns for profile images (incl. change/empty), device/asset images, and images in comments.

**Approach.** New guide section "Images", four patterns:
- **Editable avatar:** extend `.uix-avatar` to accept an `<img>` (not just initials). Add `.uix-avatar--editable`
  with a hover overlay (camera icon) and an **empty/upload** state (dashed ring + plus) tied to the existing
  file-upload component for the "new profile image" flow.
- **Device / asset media card:** `.uix-media` — image (or icon placeholder) + name + meta (e.g. "MacBook Pro
  14\" · Asset #A-1043 · assigned to Maya"). Used in CMDB/asset contexts and on the dashboard.
- **Image in a comment:** `.uix-comment__image` thumbnail inside `.uix-comment`.
- **Lightbox:** minimal `.uix-lightbox` reusing native `<dialog>` (`showModal`) — clicking a comment/media
  thumbnail opens the larger image; Esc/backdrop close. `setupLightbox` delegates clicks from
  `[data-uix-lightbox]` thumbnails.
- **Assets:** local SVG placeholders in `assets/img/` (avatar, device, screenshot) — offline, theme-neutral.

**Files.** new `styles/components/media.css`, `styles/components/lightbox.css`; edits to
`styles/components/avatar.css`, `styles/components/comments.css`; new `assets/img/*.svg`;
`guide/app.js` (`setupLightbox`); `index.html` (section + instances); `styles/main.css` (imports);
`assets/icons.js` (`camera`, `image`).

**Acceptance.** Editable avatar shows hover-to-change and an empty upload state; media card renders device
image + meta; a comment shows an inline image thumbnail; clicking a thumbnail opens the lightbox and closes
on Esc/backdrop; all offline; light/dark correct.

### 2.7 Prose / text cards + nested composition (#2)

**Goal.** A content/prose card pattern and explicit examples of nested elements.

**Approach.**
- **`.uix-prose`:** a content card with proper vertical rhythm and a readable max measure (~66ch) for
  headings, paragraphs, lists (ul/ol), inline links/code, and blockquotes — for KB articles, descriptions,
  release notes.
- **`.uix-note` callouts:** info / success / warning / danger boxes for longer-form inline notes (distinct
  from the terse single-line `.uix-alert`).
- **Composition subsection:** explicit examples of cards nesting other components — a card containing a table,
  a card containing a stat row + list, a card containing prose + attachments — to document nesting patterns.
  These patterns are reused on the dashboard.

**Files.** new `styles/components/prose.css` (covers `.uix-prose` + `.uix-note`); `index.html`
(section + composition examples); `styles/main.css` (import).

**Acceptance.** Prose card renders rich text with correct rhythm and capped measure; the four note tones
render; composition examples show real nested components; light/dark correct.

### 2.8 Example dashboard — standalone `dashboard.html` (#1)

**Goal.** A complex, realistic screen where most components sit side-by-side and interact, for testing.

**Approach.** New top-level `dashboard.html` mirroring `index.html`'s `<head>` (no-flash theme script, Google
Fonts, `styles/main.css`), built on the real **app-shell** (`.uix-shell` + `.uix-sidebar` + topbar +
content), as a **blended service + account workspace**:
- **Top KPI row** — four `.uix-stat` tiles (Open tickets, SLA at-risk, ARR, CSAT) with trends + a heartbeat
  indicator.
- **Main column** — the ticket **queue table** using the new View menu; filter chips that filter the rows;
  **clicking a row opens the side-peek** (now fixed).
- **Right rail** — account/contact card, deal pipeline, notification center, SLA widget.
- **Lower band** — activity feed / comments **with reactions**, charts (tickets/day bars + resolution-trend
  area), a `.uix-prose` "release notes" card, and a `.uix-media` device/asset card.
- **Wired interactions** (the core ask): chips→table, row→peek, ⌘K command palette, action→toast, reactions,
  theme toggle, density via View menu, live heartbeat.

Reuses `guide/app.js` as-is (it selects by data-attributes and no-ops on absent nodes) plus the new
`setupViewMenu` / `setupReactions` / `setupLightbox`. No bespoke per-page JS. Linked from the guide nav and a
header link; the dashboard links back to the guide.

**Files.** new `dashboard.html`; `index.html` (nav/header link to it); reuses all component CSS + `app.js`.

**Acceptance.** `dashboard.html` opens standalone in a browser, light + dark; the shell, KPI row, queue
table + View menu, right rail, and lower band all render; filter chips filter; a row click opens the peek;
⌘K opens the palette; reactions and theme toggle work; no console errors.

---

## 3. Cross-cutting

### 3.1 New tokens
- `--uix-row-h-comfortable` (taller row height), declared alongside `--uix-row-h` / `--uix-row-h-compact` in
  `styles/tokens.css` for both themes if theme-dependent (it is not expected to be).

### 3.2 `guide/app.js` additions
Keep the existing structure (pure exported helpers + a `typeof document` guarded DOM block). Add:
- Pure helpers (unit-tested): `cycleDensity` / density resolver, `toggleReaction`, `readViewPrefs` /
  `writeViewPrefs` (+ legacy `uix-cols-<id>` migration).
- DOM setups: `setupViewMenu` (or fold into `initTable`), `setupReactions`, `setupLightbox`, `buildIconInventory`.
- All new setups are called from `init()` and are safe to run on pages where their targets are absent.

### 3.3 Testing
Extend `guide/app.test.js` (node:test, importing the pure helpers) with cases for `toggleReaction`, density
cycling/resolution, and view-pref read/write/migrate shape. DOM wiring remains manually verified in the live
preview (per the project's existing approach).

### 3.4 Load order / imports
New component CSS files are added to `styles/main.css` in the components layer; cascade layers keep order
robust. No change to the tokens→base→utilities→motion→components sequence.

---

## 4. Build order

1. **Fixes** — overlay transitions (2.1), contact buttons (2.2). Small, unblock the dashboard's peek.
2. **View menu + density** (2.3) — needed by the guide table and the dashboard.
3. **Convention sections** — icons (2.4), emoji+reactions (2.5), images (2.6), prose (2.7). Independent; any order.
4. **Dashboard** (2.8) — last; it consumes the View menu, reactions, media, prose, and the fixed peek.

Each step is verified in the live preview (light + dark) before moving on.

---

## 5. Acceptance summary

- Modal, drawer, and side-peek animate in and out correctly; reduced-motion still instant.
- Contact-card actions are balanced/equal-width.
- Every table's view options live behind one `View ▾` menu; density has 3 tiers; prefs persist per table.
- Guide has new Icons, Emoji, Images, and Prose sections; icon inventory is auto-generated.
- Reactions component works (curated picker, toggle, counts) in the guide and dashboard.
- Image patterns (editable avatar, media card, comment image, lightbox) work offline.
- `dashboard.html` is a working, interactive, blended workspace on the app-shell, light + dark, no console errors.
- New pure helpers are unit-tested; nothing breaks the existing `app.test.js` suite.
