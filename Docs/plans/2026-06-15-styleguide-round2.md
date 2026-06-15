# Style Guide Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive blended example dashboard, consolidate every table's view controls into one View menu (with 3-tier density), add Icons/Emoji+reactions/Images/Prose guide sections, and fix the broken overlay enter-transition and contact-card buttons.

**Architecture:** Build-free, framework-free. New CSS lives in `styles/components/*.css` inside the `@layer uix.components` cascade layer and is imported from `styles/main.css`. New behavior extends the page-agnostic `guide/app.js` (pure exported helpers + a `typeof document` DOM block). Pure helpers are unit-tested with `node:test`; CSS/HTML/DOM is verified in the live browser via the Claude Preview MCP. All overlays use native `<dialog>`/Popover API + `@starting-style`. Spec: [docs/specs/2026-06-15-styleguide-round2-design.md](../specs/2026-06-15-styleguide-round2-design.md).

**Tech Stack:** HTML5, CSS (cascade layers, `@starting-style`, CSS anchor positioning, `color-mix`), vanilla ES modules, lucide inline-SVG icons, `node:test`.

---

## Verification conventions (read once)

- **JS pure helpers** → TDD with `node:test`. Run: `node --test guide/` (Node 22+, zero deps). Expected output noted per task.
- **CSS / HTML / DOM** → no unit harness exists; verify in the live preview. The dev server is the `styleguide` config in `.claude/launch.json` (static `serve` on port 4178). Use the Claude Preview MCP: `preview_start` (reuse if running), `preview_eval` for measurements, `preview_screenshot` for visuals, `preview_resize` for dark mode/responsive. Each CSS/HTML task gives an explicit measurement or visual check + the expected result.
- **Theme:** toggle dark via `preview_eval` → `document.documentElement.setAttribute('data-theme','dark')`; reset to `'light'` after.
- **Commits:** end every commit message with the required `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` trailer. Work happens on branch `build/round-2-dashboard` (already created).

---

## File structure

**New files**
- `styles/components/view-menu.css` — the consolidated View popover layout (density segmented + switches + columns).
- `styles/components/reactions.css` — reaction pills + emoji picker.
- `styles/components/media.css` — device/asset media card.
- `styles/components/prose.css` — `.uix-prose` content card + `.uix-note` callout boxes.
- `styles/components/lightbox.css` — image lightbox (`<dialog>`).
- `dashboard.html` — standalone blended workspace on the app-shell.
- `assets/img/avatar-maya.svg`, `assets/img/device-macbook.svg`, `assets/img/shot-vpn.svg` — offline SVG placeholders.

**Modified files**
- `styles/components/peek.css`, `drawer.css`, `modal.css` — overlay enter-transition fix.
- `styles/components/contact-card.css` — equal-width action buttons.
- `styles/components/table.css` — 3-tier density.
- `styles/components/avatar.css` — editable/empty avatar.
- `styles/components/comments.css` — inline comment image.
- `styles/tokens.css` — `--uix-row-h-comfortable`.
- `assets/icons.js` — new glyphs.
- `styles/main.css` — `@import` the 5 new component files.
- `guide/app.js` — pure helpers (`DENSITIES`, `defaultViewPrefs`, `readViewPrefs`, `writeViewPrefs`, `toggleReaction`) + DOM setups (`initTable` View-menu rewrite, `setupReactions`, `setupLightbox`, `buildIconInventory`).
- `guide/app.test.js` — tests for the new pure helpers.
- `index.html` — new Icons/Emoji/Images/Prose sections, table toolbar → View menu, nav links, reactions instance, image instances, lightbox dialog.

---

# Phase 1 — Fixes

## Task 1: Overlay enter-transition (peek + drawer + modal)

**Files:** Modify `styles/components/peek.css`, `styles/components/drawer.css`, `styles/components/modal.css`.

**Why:** The branch re-declared the full `transition` *shorthand* on both the base and `[open]` rules, which kills the `@starting-style` entrance — all three overlays stay parked in their starting (closed) state. Fix: declare the property list + behavior **once** on the base rule; `[open]` overrides **only** duration + timing (longhands), preserving the asymmetric slow-in/fast-out.

- [ ] **Step 1: Replace the peek transition block.** In `styles/components/peek.css`, the `.uix-peek` rule and `.uix-peek[open]` rule currently re-declare the `transition` shorthand. Replace them so they read exactly:

```css
  .uix-peek {
    margin: 0 0 0 auto; height: 100dvh; max-height: 100dvh; width: var(--uix-peek-w); padding: 0; color: var(--uix-text);
    border: 0; border-left: 1px solid var(--uix-border); border-radius: 0;
    background: var(--uix-surface); box-shadow: var(--uix-shadow-overlay);
    transform: translateX(100%);
    /* property list + behavior declared ONCE here; [open] overrides only timing. base = EXIT */
    transition-property: transform, overlay, display;
    transition-duration: var(--uix-dur);
    transition-timing-function: var(--uix-ease-in);
    transition-behavior: allow-discrete;
    display: flex; flex-direction: column;
  }
  .uix-peek[open] {
    transform: none;
    /* ENTER: slower + decelerate (timing only) */
    transition-duration: var(--uix-dur-slow);
    transition-timing-function: var(--uix-ease-out);
  }
```

(Leave the `@starting-style`, `::backdrop`, and `.uix-peek__*` rules unchanged.)

- [ ] **Step 2: Apply the same shape to the drawer.** In `styles/components/drawer.css`, make `.uix-drawer` use the four `transition-*` longhands (property list `transform, overlay, display`; duration `var(--uix-dur)`; timing `var(--uix-ease-in)`; behavior `allow-discrete`) and `.uix-drawer[open]` override only `transition-duration: var(--uix-dur-slow)` + `transition-timing-function: var(--uix-ease-out)` (plus its existing `transform: none`). Leave `@starting-style`/`::backdrop` unchanged.

- [ ] **Step 3: Apply the same shape to the modal.** In `styles/components/modal.css`, make `.uix-dialog` use longhands: `transition-property: opacity, transform, overlay, display; transition-duration: var(--uix-dur); transition-timing-function: var(--uix-ease-in); transition-behavior: allow-discrete;` and `.uix-dialog[open]` override only `transition-duration: var(--uix-dur-slow)` + `transition-timing-function: var(--uix-ease-out)` (plus its existing `opacity:1; transform:none`). Leave `@starting-style`/`::backdrop` unchanged.

- [ ] **Step 4: Verify enter lands on-screen (peek).** `preview_start` (reuse running server). Then `preview_eval`:

```js
(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const peek = document.querySelector('[data-uix-peek-dialog]');
  if (peek.open) peek.close(); await s(350);
  document.querySelector('[data-uix-open-peek]').click(); await s(700);
  const x = Math.round(peek.getBoundingClientRect().x);
  const ok = x >= 0 && x < window.innerWidth - 100;  // settled ON-screen, not parked off-right
  peek.close();
  return { x, vw: window.innerWidth, ok };
})()
```

Expected: `ok: true` (x ≈ viewport − 420, well within the viewport), NOT `x ≈ vw`.

- [ ] **Step 5: Verify modal fades to opacity 1 and drawer lands on-screen.** `preview_eval`:

```js
(async () => {
  const s = ms => new Promise(r => setTimeout(r, ms));
  const m = document.querySelector('#demo-modal'); m.showModal(); await s(700);
  const mo = getComputedStyle(m).opacity; m.close(); await s(350);
  const d = document.querySelector('#demo-drawer'); d.showModal(); await s(700);
  const dx = Math.round(d.getBoundingClientRect().x); d.close();
  return { modalOpacity: mo, drawerX: dx, vw: window.innerWidth };
})()
```

Expected: `modalOpacity: "1"`; `drawerX` well inside the viewport (not ≈ vw).

- [ ] **Step 6: Verify exit animates (not instant).** `preview_eval` opens the peek, calls `.close()`, waits 80ms, and reads `getComputedStyle(peek).transform` — expect it mid-slide (a `matrix(...)` with a positive translateX between 0 and 420), confirming the faster ease-in exit runs. (If reduced-motion is on this is instant — acceptable.)

- [ ] **Step 7 (fallback, only if Steps 4–5 fail).** If any overlay is still stuck after Step 1–3, the longhand asymmetry is not viable in this browser; revert to the known-good **symmetric** form: keep the full `transition` (shorthand, `var(--uix-dur-slow) var(--uix-ease-out)`, with `overlay`/`display` `allow-discrete`) on the base rule only, and have `[open]` set **only** the target (`transform:none` / `opacity:1`). Re-run Steps 4–6 (exit will then also be slow — acceptable; correctness wins). Note this fallback in the commit message.

- [ ] **Step 8: Commit.**

```bash
git add styles/components/peek.css styles/components/drawer.css styles/components/modal.css
git commit -m "fix(overlays): restore enter transition for modal/drawer/peek (timing via longhands)"
```

---

## Task 2: Contact-card buttons equal-width

**Files:** Modify `styles/components/contact-card.css`.

- [ ] **Step 1: Make the actions equal-width.** Change the `.uix-contact__actions` rule and add a child rule:

```css
  .uix-contact__actions { display: flex; gap: 8px; margin-top: 12px; align-self: stretch; }
  .uix-contact__actions > .uix-btn { flex: 1; }
```

- [ ] **Step 2: Verify.** `preview_eval` returns the two button widths:

```js
(() => {
  const b = document.querySelectorAll('.uix-contact__actions > .uix-btn');
  return [...b].map(x => Math.round(x.getBoundingClientRect().width));
})()
```

Expected: two equal (±1px) widths.

- [ ] **Step 3: Commit.**

```bash
git add styles/components/contact-card.css
git commit -m "fix(contact-card): equal-width action buttons"
```

---

# Phase 2 — View menu + density

## Task 3: 3-tier density CSS + token

**Files:** Modify `styles/tokens.css`, `styles/components/table.css`.

- [ ] **Step 1: Add the comfortable row-height token.** In `styles/tokens.css`, the layout-dims line (currently `--uix-row-h:56px; --uix-row-h-compact:44px; ...`) — add `--uix-row-h-comfortable:68px;` immediately after `--uix-row-h-compact:44px;`. (Both themes share it; the line is in the base `:root` block, so no dark override needed.)

- [ ] **Step 2: Add density tier rules.** In `styles/components/table.css`, the existing line is `.uix-table--compact td { height: var(--uix-row-h-compact); }`. Replace it with:

```css
  /* density tiers — standard is the default td height above; data-density overrides it.
     .uix-table--compact kept as a back-compat alias. */
  .uix-table[data-density="compact"] td, .uix-table--compact td { height: var(--uix-row-h-compact); }
  .uix-table[data-density="comfortable"] td { height: var(--uix-row-h-comfortable); }
```

- [ ] **Step 3: Verify the three tiers.** `preview_eval` (the guide table is `#tickets`):

```js
(() => {
  const t = document.querySelector('#tickets .uix-table');
  const h = () => Math.round(document.querySelector('#tickets tbody tr td').getBoundingClientRect().height);
  t.removeAttribute('data-density'); const std = h();
  t.setAttribute('data-density','compact'); const cmp = h();
  t.setAttribute('data-density','comfortable'); const com = h();
  t.removeAttribute('data-density');
  return { compact: cmp, standard: std, comfortable: com };
})()
```

Expected: `compact:44, standard:56, comfortable:68`.

- [ ] **Step 4: Commit.**

```bash
git add styles/tokens.css styles/components/table.css
git commit -m "feat(table): 3-tier row density (compact/standard/comfortable)"
```

---

## Task 4: View-pref + density pure helpers (TDD)

**Files:** Modify `guide/app.js` (add exports near the other pure helpers, before the `if (typeof document !== 'undefined')` block), `guide/app.test.js`.

- [ ] **Step 1: Write failing tests.** Append to `guide/app.test.js` (and add `DENSITIES, defaultViewPrefs, readViewPrefs, writeViewPrefs` to the import line at the top):

```js
import { DENSITIES, defaultViewPrefs, readViewPrefs, writeViewPrefs } from './app.js';

test('defaultViewPrefs: standard/zebra/freeze/no-hidden', () => {
  assert.deepEqual(defaultViewPrefs(), { density: 'standard', zebra: true, freeze: true, hiddenCols: [] });
});

test('DENSITIES order', () => {
  assert.deepEqual(DENSITIES, ['compact', 'standard', 'comfortable']);
});

test('readViewPrefs: empty → defaults', () => {
  assert.deepEqual(readViewPrefs(null, null), defaultViewPrefs());
});

test('readViewPrefs: round-trips a written value', () => {
  const p = { density: 'comfortable', zebra: false, freeze: true, hiddenCols: [2, 4] };
  assert.deepEqual(readViewPrefs(writeViewPrefs(p), null), p);
});

test('readViewPrefs: invalid density falls back to standard', () => {
  assert.equal(readViewPrefs('{"density":"huge"}', null).density, 'standard');
});

test('readViewPrefs: migrates legacy uix-cols array into hiddenCols when no new prefs', () => {
  assert.deepEqual(readViewPrefs(null, '[1,3]').hiddenCols, [1, 3]);
});

test('readViewPrefs: garbage JSON → defaults', () => {
  assert.deepEqual(readViewPrefs('not json', null), defaultViewPrefs());
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `node --test guide/`. Expected: failures — `DENSITIES`/`defaultViewPrefs`/`readViewPrefs`/`writeViewPrefs` are not exported.

- [ ] **Step 3: Implement the helpers.** In `guide/app.js`, just below `peekStep` (and above the toast helpers), add:

```js
/** Density tiers, in cycle order (standard is the default). */
export const DENSITIES = ['compact', 'standard', 'comfortable'];

/** Default per-table view preferences. */
export const defaultViewPrefs = () => ({ density: 'standard', zebra: true, freeze: true, hiddenCols: [] });

/** Parse + normalize stored view prefs. `legacyColsRaw` migrates the old `uix-cols-<id>` array
 *  (bare number[] of hidden column indices) when no new prefs exist yet. */
export const readViewPrefs = (raw, legacyColsRaw) => {
  const d = defaultViewPrefs();
  let p = {};
  try { p = raw ? JSON.parse(raw) : {}; } catch { p = {}; }
  if (!raw && legacyColsRaw) {
    try { const cols = JSON.parse(legacyColsRaw); if (Array.isArray(cols)) p.hiddenCols = cols; } catch { /* ignore */ }
  }
  return {
    density: DENSITIES.includes(p.density) ? p.density : d.density,
    zebra: typeof p.zebra === 'boolean' ? p.zebra : d.zebra,
    freeze: typeof p.freeze === 'boolean' ? p.freeze : d.freeze,
    hiddenCols: Array.isArray(p.hiddenCols) ? p.hiddenCols.filter(Number.isInteger) : d.hiddenCols,
  };
};

/** Serialize view prefs for localStorage. */
export const writeViewPrefs = (prefs) => JSON.stringify(prefs);
```

- [ ] **Step 4: Run, expect PASS.** Run: `node --test guide/`. Expected: all tests pass (existing + 7 new).

- [ ] **Step 5: Commit.**

```bash
git add guide/app.js guide/app.test.js
git commit -m "feat(table): view-pref + density pure helpers with tests"
```

---

## Task 5: View menu CSS, markup, and wiring

**Files:** Create `styles/components/view-menu.css`; modify `styles/main.css`, `assets/icons.js`, `index.html`, `guide/app.js`.

- [ ] **Step 1: Add the `sliders-horizontal` glyph.** In `assets/icons.js` `PATHS`, add:

```js
  'sliders-horizontal': '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
```

- [ ] **Step 2: Create `styles/components/view-menu.css`.**

```css
/* uix table View menu — consolidates density / zebra / freeze / columns into one popover.
   Reuses .uix-popover (surface + animation), .uix-segmented, .uix-switch. Depends only on --uix-* tokens. */
@layer uix.components {
  .uix-view-menu { min-width: 248px; padding: 6px; }
  .uix-view-menu__group { padding: 8px 6px; }
  .uix-view-menu__group + .uix-view-menu__group { border-top: 1px solid var(--uix-border); }
  .uix-view-menu__label { font-size: var(--uix-text-eyebrow); letter-spacing: var(--uix-tracking-eyebrow); text-transform: uppercase; color: var(--uix-text-muted); margin-bottom: 8px; }
  .uix-view-menu__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: var(--uix-text-body); color: var(--uix-text); }
  .uix-view-menu__row + .uix-view-menu__row { margin-top: 10px; }
  .uix-view-menu .uix-segmented { display: flex; width: 100%; }
  .uix-view-menu .uix-segmented__option { flex: 1; text-align: center; }
  .uix-view-menu__cols { display: flex; flex-direction: column; gap: 2px; max-height: 180px; overflow: auto; }
  .uix-view-menu__cols .uix-menu__item { font-size: var(--uix-text-meta); }
}
```

- [ ] **Step 3: Import it.** In `styles/main.css`, add `@import "components/view-menu.css";` alongside the other component imports (order is robust via layers).

- [ ] **Step 4: Replace the table toolbar buttons in `index.html`.** In the `#tickets` table ([index.html:385-396](../../index.html)), replace the four buttons (`Freeze 1st col`, `Columns ▾`, `#colmenu`, `Density`, `Zebra`) after the `uix-toolbar__spacer` with a single View button + popover:

```html
            <button class="uix-btn uix-btn--secondary uix-btn--sm" popovertarget="viewmenu" style="anchor-name:--viewbtn"></button>
            <div id="viewmenu" popover class="uix-popover uix-view-menu" data-uix-viewmenu style="position-anchor:--viewbtn; top:anchor(bottom); justify-self:anchor-end; margin-top:6px">
              <div class="uix-view-menu__group">
                <div class="uix-view-menu__label">Density</div>
                <span class="uix-segmented" data-uix-density>
                  <button class="uix-segmented__option" type="button" data-density="compact" aria-pressed="false">Compact</button>
                  <button class="uix-segmented__option" type="button" data-density="standard" aria-pressed="true">Standard</button>
                  <button class="uix-segmented__option" type="button" data-density="comfortable" aria-pressed="false">Comfortable</button>
                </span>
              </div>
              <div class="uix-view-menu__group">
                <label class="uix-view-menu__row"><span>Zebra striping</span><span class="uix-switch"><input type="checkbox" data-uix-zebra checked><span class="uix-switch__track"></span></span></label>
                <label class="uix-view-menu__row" style="margin-top:10px"><span>Freeze first column</span><span class="uix-switch"><input type="checkbox" data-uix-freeze checked><span class="uix-switch__track"></span></span></label>
              </div>
              <div class="uix-view-menu__group">
                <div class="uix-view-menu__label">Columns</div>
                <div class="uix-view-menu__cols" data-uix-colmenu></div>
              </div>
            </div>
```

The View button label is filled by JS (icon + "View ▾"). Keep the search input + `uix-toolbar__spacer` as-is.

- [ ] **Step 5: Rewrite `initTable` view-control wiring in `guide/app.js`.** Replace the body from the density/zebra/freeze button listeners through the end of the column-visibility block with the consolidated version. Import `icon` is already present; add `readViewPrefs, writeViewPrefs, DENSITIES` usage. New code:

```js
    // ---- consolidated View menu: density / zebra / freeze / columns, persisted per table id ----
    const key = 'uix-view-' + (root.id || 'tbl');
    const prefs = readViewPrefs(localStorage.getItem(key), localStorage.getItem('uix-cols-' + (root.id || 'tbl')));
    const save = () => localStorage.setItem(key, writeViewPrefs(prefs));

    const viewBtn = root.querySelector('[popovertarget="viewmenu"]');
    if (viewBtn) viewBtn.innerHTML = icon('sliders-horizontal', 'sm') + ' View ▾';

    // density (segmented)
    const applyDensity = () => {
      if (prefs.density === 'standard') table.removeAttribute('data-density');
      else table.setAttribute('data-density', prefs.density);
      root.querySelectorAll('[data-uix-density] [data-density]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.density === prefs.density)));
    };
    root.querySelector('[data-uix-density]')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-density]'); if (!b) return;
      prefs.density = b.dataset.density; applyDensity(); save();
    });

    // zebra + freeze (switches)
    const zebraEl = root.querySelector('[data-uix-zebra]');
    const freezeEl = root.querySelector('[data-uix-freeze]');
    const applyZebra = () => { table.classList.toggle('uix-table--no-zebra', !prefs.zebra); if (zebraEl) zebraEl.checked = prefs.zebra; };
    const applyFreeze = () => { table.classList.toggle('uix-table--pinned-col', prefs.freeze); if (freezeEl) freezeEl.checked = prefs.freeze; };
    zebraEl?.addEventListener('change', () => { prefs.zebra = zebraEl.checked; applyZebra(); save(); });
    freezeEl?.addEventListener('change', () => { prefs.freeze = freezeEl.checked; applyFreeze(); save(); });

    // columns (checklist inside the menu)
    const colMenu = root.querySelector('[data-uix-colmenu]');
    if (colMenu) {
      const headers = [...table.querySelectorAll('thead th')];
      const hidden = new Set(prefs.hiddenCols);
      const applyCols = () => headers.forEach((th, i) => {
        const off = hidden.has(i);
        table.querySelectorAll(`tr > *:nth-child(${i + 1})`).forEach((c) => { c.hidden = off; });
      });
      colMenu.innerHTML = headers.map((th, i) => (i > 0 && th.textContent.trim())
        ? `<label class="uix-menu__item"><input type="checkbox" data-col="${i}" ${hidden.has(i) ? '' : 'checked'}> ${esc(th.textContent.trim())}</label>`
        : '').join('');
      colMenu.addEventListener('change', (e) => {
        const cb = e.target.closest('[data-col]'); if (!cb) return;
        const i = +cb.dataset.col;
        cb.checked ? hidden.delete(i) : hidden.add(i);
        prefs.hiddenCols = [...hidden]; save(); applyCols();
      });
      applyCols();
    }

    applyDensity(); applyZebra(); applyFreeze();
```

Remove the now-dead `[data-uix-density]`/`[data-uix-zebra]`/`[data-uix-freeze]` button handlers and the old `uix-cols-<id>` block that this replaces. (The HTML no longer has the old toolbar buttons; the `aria-pressed` on the old freeze button is gone.)

- [ ] **Step 6: Verify the View menu.** `preview_start`; `preview_eval`:

```js
(() => {
  const t = document.querySelector('#tickets .uix-table');
  const seg = document.querySelector('#tickets [data-uix-density] [data-density="comfortable"]');
  seg.click();
  const density = t.getAttribute('data-density');
  const z = document.querySelector('#tickets [data-uix-zebra]'); z.click(); z.dispatchEvent(new Event('change',{bubbles:true}));
  const noZebra = t.classList.contains('uix-table--no-zebra');
  return { density, noZebra, persisted: localStorage.getItem('uix-view-tickets') };
})()
```

Expected: `density:"comfortable"`, `noZebra:true`, and `persisted` is a JSON string containing `"density":"comfortable"`,`"zebra":false`. Then reload (`preview_eval` → `location.reload()`), wait, and confirm the table still shows comfortable density + zebra off.

- [ ] **Step 7: Open the popover and screenshot** (`preview_eval` → `document.getElementById('viewmenu').showPopover()`, then `preview_screenshot`) — confirm density segmented, two switches, and the columns checklist render in light mode; repeat after setting `data-theme="dark"`.

- [ ] **Step 8: Commit.**

```bash
git add styles/components/view-menu.css styles/main.css assets/icons.js index.html guide/app.js
git commit -m "feat(table): consolidated View menu (density/zebra/freeze/columns), per-table persistence"
```

---

# Phase 3 — Convention sections

## Task 6: Icons section + inventory

**Files:** Modify `assets/icons.js` (glyphs needed across this phase), `index.html` (new section + nav link), `guide/app.js` (`buildIconInventory`), `guide/guide.css` (grid).

- [ ] **Step 1: Add the remaining glyphs.** In `assets/icons.js` `PATHS`, add (these are used by reactions/images/dashboard too):

```js
  'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'camera': '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  'smile-plus': '<path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/>',
  'laptop': '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
  'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'paperclip': '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  'bell': '<path d="M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
```

- [ ] **Step 2: Add the Icons section + nav link in `index.html`.** Add a nav link `<a class="uix-guide__navlink" href="#icons">Icons</a>` in the `[data-uix-nav]` rail (after `Utility / typography` or grouped logically), and a new section (place before `#utility`):

```html
      <section id="icons" class="uix-guide__section">
        <h2>Icons</h2>
        <p class="lead">Icons are <strong>lucide</strong> glyphs, inline SVG, drawn in <code>currentColor</code> at <code>stroke-width:2</code> with round caps. Size them with <code>--uix-icon-sm</code> (16) / <code>--uix-icon-md</code> (20) / <code>--uix-icon-lg</code> (24) via the <code>icon(name, size)</code> helper in <code>assets/icons.js</code>.</p>
        <div class="uix-note uix-note--info" style="margin-bottom:16px">
          <span class="uix-note__icon"></span>
          <div class="uix-note__body"><strong>Accessibility.</strong> Decorative icons get <code>aria-hidden="true"</code> (the helper adds it). An icon that is the only label for a control needs an <code>aria-label</code> on the control (or a visible tooltip). Never rely on an icon alone to carry meaning.</div>
        </div>
        <div class="uix-guide__subhead">Sizes</div>
        <div class="uix-example__preview" style="border:1px solid var(--uix-border);border-radius:var(--uix-radius-lg);gap:24px;align-items:center" data-uix-icon-sizes></div>
        <div class="uix-guide__subhead">Inventory — click a name to copy</div>
        <div class="uix-icon-grid" data-uix-icon-grid></div>
      </section>
```

(The `uix-note__icon` span and the two `data-uix-*` containers are filled by JS in Step 4.)

- [ ] **Step 3: Add the icon-grid styles** to `guide/guide.css`:

```css
.uix-icon-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
.uix-icon-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; border: 1px solid var(--uix-border); border-radius: var(--uix-radius-md); background: var(--uix-surface); cursor: copy; }
.uix-icon-cell:hover { border-color: var(--uix-border-strong); }
.uix-icon-cell code { font-size: var(--uix-text-eyebrow); color: var(--uix-text-muted); }
.uix-icon-cell[data-copied] code { color: var(--uix-success); }
```

- [ ] **Step 4: Build the inventory + sizes + note icon in `guide/app.js`.** Add a `buildIconInventory()` function and call it from `init()`. It uses `iconNames()` (already imported via `icon`'s module — add `iconNames` to the import at the top of `app.js`):

```js
  const buildIconInventory = () => {
    const sizes = document.querySelector('[data-uix-icon-sizes]');
    if (sizes) sizes.innerHTML = ['sm','md','lg'].map((s) =>
      `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:6px;color:var(--uix-text)">${icon('star', s)}<code style="font-size:var(--uix-text-eyebrow);color:var(--uix-text-muted)">${s}</code></span>`).join('');
    const grid = document.querySelector('[data-uix-icon-grid]');
    if (grid) grid.innerHTML = iconNames().map((n) =>
      `<button class="uix-icon-cell" type="button" data-icon-copy="${esc(n)}">${icon(n)}<code>${esc(n)}</code></button>`).join('');
    document.querySelectorAll('.uix-note__icon:empty').forEach((el) => { el.innerHTML = icon('info' in {} ? 'info' : 'sun'); });
  };
```

Note: there is no `info` glyph; the note icon is set explicitly in each note's markup instead — so drop the last line and put `<span class="uix-note__icon">` content directly in markup using an existing glyph (e.g. reuse the inline info SVG already used by `.uix-alert--info` in [index.html:517](../../index.html)). Wire icon-name copy in the existing global click handler:

```js
    const iconCell = e.target.closest('[data-icon-copy]');
    if (iconCell && navigator.clipboard) {
      navigator.clipboard.writeText(iconCell.dataset.iconCopy);
      iconCell.dataset.copied = '1';
      setTimeout(() => delete iconCell.dataset.copied, 1200);
    }
```

Call `buildIconInventory();` inside `init()`.

- [ ] **Step 5: Verify.** `preview_start`; `preview_eval` returns `document.querySelectorAll('[data-uix-icon-grid] .uix-icon-cell').length` — expect it to equal the number of glyphs in `PATHS` (≥ 25 after this phase's additions). `preview_screenshot` the section (light + dark) to confirm the grid renders and the sizes row shows three star sizes.

- [ ] **Step 6: Commit.**

```bash
git add assets/icons.js index.html guide/app.js guide/guide.css
git commit -m "feat(guide): Icons section with usage guidance + auto-generated inventory"
```

---

## Task 7: Emoji convention + reactions component (TDD for the helper)

**Files:** Modify `guide/app.test.js`, `guide/app.js`; create `styles/components/reactions.css`; modify `styles/main.css`, `index.html`.

- [ ] **Step 1: Write failing tests for `toggleReaction`.** Append to `guide/app.test.js` (add `toggleReaction` to the import):

```js
import { toggleReaction } from './app.js';

test('toggleReaction: adds a new reaction as mine, count 1', () => {
  assert.deepEqual(toggleReaction([], '🎉'), [{ emoji: '🎉', count: 1, mine: true }]);
});

test('toggleReaction: joins an existing reaction (not mine → mine, count+1)', () => {
  const r = toggleReaction([{ emoji: '👍', count: 2, mine: false }], '👍');
  assert.deepEqual(r, [{ emoji: '👍', count: 3, mine: true }]);
});

test('toggleReaction: un-reacts (mine → removed when count hits 0)', () => {
  assert.deepEqual(toggleReaction([{ emoji: '👍', count: 1, mine: true }], '👍'), []);
});

test('toggleReaction: un-reacts but keeps others (count stays > 0)', () => {
  assert.deepEqual(toggleReaction([{ emoji: '👍', count: 3, mine: true }], '👍'),
    [{ emoji: '👍', count: 2, mine: false }]);
});

test('toggleReaction: does not mutate input', () => {
  const input = [{ emoji: '👍', count: 1, mine: false }];
  toggleReaction(input, '👍');
  assert.deepEqual(input, [{ emoji: '👍', count: 1, mine: false }]);
});
```

- [ ] **Step 2: Run, expect FAIL.** Run: `node --test guide/`. Expected: `toggleReaction is not exported`.

- [ ] **Step 3: Implement `toggleReaction`** in `guide/app.js` (near the toast helpers):

```js
/** Toggle the current user's reaction to `emoji`. State = [{emoji, count, mine}]. Immutable;
 *  reactions whose count falls to 0 are dropped. */
export const toggleReaction = (reactions, emoji) => {
  const list = reactions.map((r) => ({ ...r }));
  const found = list.find((r) => r.emoji === emoji);
  if (found) {
    found.count += found.mine ? -1 : 1;
    found.mine = !found.mine;
    return list.filter((r) => r.count > 0);
  }
  return [...list, { emoji, count: 1, mine: true }];
};
```

- [ ] **Step 4: Run, expect PASS.** Run: `node --test guide/`. Expected: all pass.

- [ ] **Step 5: Create `styles/components/reactions.css`.**

```css
/* uix emoji reactions — pills with counts + an add-reaction picker popover. Depends only on --uix-* tokens. */
@layer uix.components {
  .uix-reactions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
  .uix-reaction {
    display: inline-flex; align-items: center; gap: 5px; padding: 1px 8px; line-height: 1.7;
    border-radius: var(--uix-radius-pill); border: 1px solid var(--uix-border); background: var(--uix-surface);
    color: var(--uix-text-hushed); font: inherit; font-size: var(--uix-text-meta); cursor: pointer;
  }
  .uix-reaction:hover { border-color: var(--uix-border-strong); }
  .uix-reaction[data-mine] { background: var(--uix-brand-muted); border-color: var(--uix-accent); color: var(--uix-accent); }
  .uix-reaction__count { font-variant-numeric: tabular-nums; }
  .uix-reaction-add {
    display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 24px;
    border-radius: var(--uix-radius-pill); border: 1px dashed var(--uix-border-strong); background: transparent;
    color: var(--uix-text-muted); cursor: pointer;
  }
  .uix-reaction-add:hover { color: var(--uix-text); border-color: var(--uix-text-muted); }
  .uix-reaction-add svg { width: var(--uix-icon-sm); height: var(--uix-icon-sm); }
  .uix-emoji-picker { display: flex; flex-wrap: wrap; gap: 2px; width: 196px; }
  .uix-emoji-picker__btn { font-size: 18px; line-height: 1; padding: 6px; border: 0; background: transparent; border-radius: var(--uix-radius-sm); cursor: pointer; }
  .uix-emoji-picker__btn:hover { background: var(--uix-bg-hover); }
}
```

- [ ] **Step 6: Import it.** Add `@import "components/reactions.css";` to `styles/main.css`.

- [ ] **Step 7: Add the Emoji section + a reactions instance in `index.html`.** Add nav link `<a class="uix-guide__navlink" href="#emoji">Emoji</a>`, and a section before `#utility`:

```html
      <section id="emoji" class="uix-guide__section">
        <h2>Emoji</h2>
        <p class="lead">A small, work-appropriate set for light signaling and reactions. Use them to add warmth or a quick acknowledgement — never as the only carrier of meaning, and never in formal status or destructive confirmations.</p>
        <div class="uix-guide__subhead">Curated set</div>
        <div class="uix-example__preview" style="border:1px solid var(--uix-border);border-radius:var(--uix-radius-lg);display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
          <span>✅ done / approved</span><span>👍 acknowledged</span><span>👀 reviewing</span>
          <span>🎉 win / shipped</span><span>🚀 deployed</span><span>🔥 urgent</span>
          <span>⚠️ caution</span><span>❓ question</span><span>🚫 blocked</span><span>📌 pinned</span>
        </div>
        <div class="uix-guide__subhead">Reactions (select &amp; use)</div>
        <div class="uix-card"><div class="uix-card__body">
          <div class="uix-comment"><span class="uix-avatar uix-avatar--sm">LR</span><div class="uix-comment__body">
            <div class="uix-comment__meta"><span class="uix-comment__author">Leo R.</span> · 22m ago</div>
            Stable for the last 20 minutes here.
            <div class="uix-reactions" data-uix-reactions data-reactions='[{"emoji":"👍","count":2,"mine":false},{"emoji":"🎉","count":1,"mine":true}]'></div>
          </div></div>
        </div></div>
      </section>
```

- [ ] **Step 8: Add `setupReactions` to `guide/app.js`** and call it from `init()`. The curated set is a const; renders pills from `data-reactions` JSON, re-renders on toggle, and shows a picker popover:

```js
  const EMOJI_SET = ['✅','👍','👀','🎉','🚀','🔥','⚠️','❓','🚫','📌'];
  const setupReactions = () => {
    document.querySelectorAll('[data-uix-reactions]').forEach((host) => {
      let state = [];
      try { state = JSON.parse(host.dataset.reactions || '[]'); } catch { state = []; }
      const pickerId = 'rx-' + Math.abs([...host.outerHTML].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
      const render = () => {
        host.innerHTML =
          state.map((r) => `<button class="uix-reaction" type="button" data-emoji="${r.emoji}" ${r.mine ? 'data-mine' : ''} aria-pressed="${r.mine}">${r.emoji} <span class="uix-reaction__count">${r.count}</span></button>`).join('') +
          `<button class="uix-reaction-add" type="button" popovertarget="${pickerId}" aria-label="Add reaction" style="anchor-name:--${pickerId}">${icon('smile-plus','sm')}</button>` +
          `<div id="${pickerId}" popover class="uix-popover" style="position-anchor:--${pickerId}; top:anchor(bottom); left:anchor(left); margin-top:6px"><div class="uix-emoji-picker">${EMOJI_SET.map((e) => `<button class="uix-emoji-picker__btn" type="button" data-pick="${e}">${e}</button>`).join('')}</div></div>`;
      };
      host.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-emoji]');
        const pick = e.target.closest('[data-pick]');
        const emoji = pill?.dataset.emoji || pick?.dataset.pick;
        if (!emoji) return;
        state = toggleReaction(state, emoji);
        if (pick) document.getElementById(pickerId)?.hidePopover();
        render();
      });
      render();
    });
  };
```

Call `setupReactions();` inside `init()`.

- [ ] **Step 9: Verify.** `preview_start`; `preview_eval`:

```js
(() => {
  const host = document.querySelector('[data-uix-reactions]');
  const before = host.querySelectorAll('.uix-reaction').length;
  host.querySelector('[data-emoji="👍"]').click();   // un-reacting? it's not mine → becomes mine, count 3
  const pill = host.querySelector('[data-emoji="👍"]');
  return { before, after: host.querySelectorAll('.uix-reaction').length, count: pill.querySelector('.uix-reaction__count').textContent, mine: pill.hasAttribute('data-mine') };
})()
```

Expected: `count:"3"`, `mine:true`. Then open the picker (`document.getElementById(...)` or click the add button via `preview_click`) and `preview_screenshot` to confirm the 10-emoji picker renders; verify dark mode too.

- [ ] **Step 10: Commit.**

```bash
git add guide/app.js guide/app.test.js styles/components/reactions.css styles/main.css index.html
git commit -m "feat(guide): emoji convention + reactions component (picker, counts, toggle)"
```

---

## Task 8: Image patterns (editable avatar, media card, comment image, lightbox)

**Files:** Create `assets/img/avatar-maya.svg`, `assets/img/device-macbook.svg`, `assets/img/shot-vpn.svg`, `styles/components/media.css`, `styles/components/lightbox.css`; modify `styles/components/avatar.css`, `styles/components/comments.css`, `styles/main.css`, `guide/app.js`, `index.html`.

- [ ] **Step 1: Create the SVG placeholders.** `assets/img/avatar-maya.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#6366f1"/><circle cx="48" cy="38" r="18" fill="#e0e7ff"/><path d="M16 92c0-18 14-30 32-30s32 12 32 30z" fill="#e0e7ff"/></svg>
```

`assets/img/device-macbook.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#f1f5f9"/><rect x="34" y="26" width="92" height="60" rx="4" fill="#0f172a"/><rect x="40" y="32" width="80" height="48" rx="2" fill="#1e293b"/><path d="M24 90h112l10 10H14z" fill="#cbd5e1"/></svg>
```

`assets/img/shot-vpn.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect width="320" height="200" fill="#0b1220"/><rect x="0" y="0" width="320" height="28" fill="#1e293b"/><circle cx="16" cy="14" r="4" fill="#ef4444"/><circle cx="32" cy="14" r="4" fill="#f59e0b"/><circle cx="48" cy="14" r="4" fill="#22c55e"/><rect x="20" y="52" width="180" height="12" rx="6" fill="#334155"/><rect x="20" y="80" width="240" height="12" rx="6" fill="#334155"/><rect x="20" y="108" width="140" height="12" rx="6" fill="#475569"/><polyline points="20,170 70,150 120,158 170,130 220,138 280,112" fill="none" stroke="#38bdf8" stroke-width="3"/></svg>
```

- [ ] **Step 2: Editable/empty avatar CSS** — append to `styles/components/avatar.css` (inside the layer):

```css
  .uix-avatar--editable { cursor: pointer; }
  .uix-avatar__edit { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.45); color: #fff; opacity: 0; transition: opacity var(--uix-dur-fast) var(--uix-ease-out); }
  .uix-avatar__edit svg { width: 45%; height: 45%; }
  .uix-avatar--editable:hover .uix-avatar__edit, .uix-avatar--editable:focus-visible .uix-avatar__edit { opacity: 1; }
  .uix-avatar--empty { background: var(--uix-bg-subtle); border: 1.5px dashed var(--uix-border-strong); color: var(--uix-text-muted); }
```

- [ ] **Step 3: Create `styles/components/media.css`.**

```css
/* uix media / device-asset card — image (or icon placeholder) + name + meta. Depends only on --uix-* tokens. */
@layer uix.components {
  .uix-media { display: flex; gap: 12px; align-items: center; }
  .uix-media__thumb { width: 64px; height: 64px; flex: none; border-radius: var(--uix-radius-md); overflow: hidden; background: var(--uix-bg-subtle); border: 1px solid var(--uix-border); display: grid; place-items: center; }
  .uix-media__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .uix-media__thumb svg { width: 28px; height: 28px; color: var(--uix-text-muted); }
  .uix-media__name { font-weight: 600; }
  .uix-media__meta { font-size: var(--uix-text-meta); color: var(--uix-text-muted); }
}
```

- [ ] **Step 4: Comment image CSS** — append to `styles/components/comments.css` (inside the layer):

```css
  .uix-comment__image { display: inline-block; margin-top: 8px; border-radius: var(--uix-radius-sm); overflow: hidden; border: 1px solid var(--uix-border); cursor: zoom-in; max-width: 220px; }
  .uix-comment__image img { display: block; width: 100%; height: auto; }
```

- [ ] **Step 5: Create `styles/components/lightbox.css`.**

```css
/* uix image lightbox — native <dialog>, click a thumbnail to enlarge. Depends only on --uix-* tokens. */
@layer uix.components {
  .uix-lightbox { border: 0; background: transparent; padding: 0; max-width: 92vw; max-height: 92vh; box-shadow: var(--uix-shadow-overlay); }
  .uix-lightbox img { display: block; max-width: 92vw; max-height: 92vh; border-radius: var(--uix-radius-md); }
  .uix-lightbox::backdrop { background: rgba(0,0,0,.7); }
}
```

- [ ] **Step 6: Import both new files.** Add `@import "components/media.css";` and `@import "components/lightbox.css";` to `styles/main.css`.

- [ ] **Step 7: Add the Images section + lightbox dialog in `index.html`.** Nav link `<a class="uix-guide__navlink" href="#images">Images</a>`, a section before `#utility`, and one shared lightbox `<dialog>` (place near the other overlay instances in `#overlays`):

```html
      <section id="images" class="uix-guide__section">
        <h2>Images</h2>
        <p class="lead">Patterns for user and content imagery: an editable profile avatar (with empty/upload state), a device/asset card, and images inside comments with a click-to-zoom lightbox.</p>

        <div class="uix-guide__subhead">Profile image — current, editable, empty</div>
        <div class="uix-example__preview" style="border:1px solid var(--uix-border);border-radius:var(--uix-radius-lg);gap:28px;align-items:center">
          <span class="uix-avatar uix-avatar--lg"><img src="assets/img/avatar-maya.svg" alt="Maya K."></span>
          <span class="uix-avatar uix-avatar--lg uix-avatar--editable" tabindex="0" role="button" aria-label="Change profile photo"><img src="assets/img/avatar-maya.svg" alt="Maya K."><span class="uix-avatar__edit" data-uix-icon="camera" aria-hidden="true"></span></span>
          <span class="uix-avatar uix-avatar--lg uix-avatar--empty uix-avatar--editable" tabindex="0" role="button" aria-label="Upload profile photo" data-uix-icon="plus"></span>
        </div>

        <div class="uix-guide__subhead">Device / asset card</div>
        <div class="uix-card" style="max-width:380px"><div class="uix-card__body">
          <div class="uix-media">
            <span class="uix-media__thumb"><img src="assets/img/device-macbook.svg" alt="MacBook Pro 14"></span>
            <div><div class="uix-media__name">MacBook Pro 14"</div><div class="uix-media__meta">Asset #A-1043 · assigned to Maya K.</div></div>
          </div>
        </div></div>

        <div class="uix-guide__subhead">Image in a comment (click to zoom)</div>
        <div class="uix-card"><div class="uix-card__body">
          <div class="uix-comment"><span class="uix-avatar uix-avatar--sm">SP</span><div class="uix-comment__body">
            <div class="uix-comment__meta"><span class="uix-comment__author">Sam P.</span> · 8m ago</div>
            Here's the dashboard right before it dropped:
            <button class="uix-comment__image" data-uix-lightbox data-src="assets/img/shot-vpn.svg" aria-label="Open image"><img src="assets/img/shot-vpn.svg" alt="Monitoring dashboard screenshot"></button>
          </div></div>
        </div></div>
      </section>
```

And the shared lightbox dialog (once, e.g. just before `</section>` of `#overlays`):

```html
        <dialog class="uix-lightbox" data-uix-lightbox-dialog><img alt=""><button class="uix-peek__close" data-uix-close aria-label="Close" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,.5);color:#fff"></button></dialog>
```

- [ ] **Step 8: Wire `setupLightbox` + fill `data-uix-icon` spans in `guide/app.js`** and call from `init()`:

```js
  const setupLightbox = () => {
    const dlg = document.querySelector('[data-uix-lightbox-dialog]');
    document.querySelectorAll('[data-uix-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.uixIcon); });
    if (!dlg) return;
    const img = dlg.querySelector('img');
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-uix-lightbox]'); if (!t) return;
      img.src = t.dataset.src; img.alt = t.querySelector('img')?.alt || '';
      dlg.showModal();
    });
  };
```

Call `setupLightbox();` inside `init()`. (The close button reuses the existing `[data-uix-close]` handler.)

- [ ] **Step 9: Verify.** `preview_start`; load the Images section. `preview_eval` clicks the comment thumbnail and checks the lightbox opened with the right src:

```js
(() => {
  document.querySelector('[data-uix-lightbox]').click();
  const dlg = document.querySelector('[data-uix-lightbox-dialog]');
  return { open: dlg.open, src: dlg.querySelector('img').getAttribute('src') };
})()
```

Expected: `open:true`, `src:"assets/img/shot-vpn.svg"`. Then `preview_eval` closes it (`dlg.close()`), and `preview_screenshot` the Images section to confirm the editable avatar hover overlay icon, the empty/upload avatar, and the device card render (light + dark). Confirm no network errors via `preview_network` (images are local).

- [ ] **Step 10: Commit.**

```bash
git add assets/img styles/components/media.css styles/components/lightbox.css styles/components/avatar.css styles/components/comments.css styles/main.css guide/app.js index.html
git commit -m "feat(guide): image patterns — editable/empty avatar, media card, comment image + lightbox"
```

---

## Task 9: Prose / text cards + nested composition

**Files:** Create `styles/components/prose.css`; modify `styles/main.css`, `index.html`.

- [ ] **Step 1: Create `styles/components/prose.css`.**

```css
/* uix prose content card + note callouts — for KB articles, descriptions, release notes. Depends only on --uix-* tokens. */
@layer uix.components {
  .uix-prose { max-width: 66ch; color: var(--uix-text); }
  .uix-prose > * + * { margin-top: 12px; }
  .uix-prose h3 { font-size: var(--uix-text-h2); font-weight: 600; }
  .uix-prose h4 { font-size: var(--uix-text-h3); font-weight: 600; margin-top: 20px; }
  .uix-prose p { line-height: var(--uix-leading-body); color: var(--uix-text-hushed); }
  .uix-prose a { color: var(--uix-link); }
  .uix-prose ul, .uix-prose ol { padding-left: 20px; }
  .uix-prose li + li { margin-top: 4px; }
  .uix-prose code { font-family: var(--uix-font-mono); font-size: .9em; background: var(--uix-bg-subtle); padding: 1px 5px; border-radius: 4px; }
  .uix-prose blockquote { border-left: 3px solid var(--uix-border-strong); padding-left: 12px; color: var(--uix-text-muted); }

  .uix-note { display: flex; gap: 10px; padding: 12px 14px; border-radius: var(--uix-radius-md); border: 1px solid var(--uix-border); background: var(--uix-surface); }
  .uix-note__icon { flex: none; }
  .uix-note__icon svg { width: var(--uix-icon-md); height: var(--uix-icon-md); }
  .uix-note__body { font-size: var(--uix-text-body); color: var(--uix-text); }
  .uix-note__body > * + * { margin-top: 6px; }
  .uix-note--info { background: var(--uix-info-bg); border-color: color-mix(in srgb, var(--uix-info) 30%, transparent); }
  .uix-note--info .uix-note__icon { color: var(--uix-info); }
  .uix-note--success { background: var(--uix-success-bg); border-color: color-mix(in srgb, var(--uix-success) 30%, transparent); }
  .uix-note--success .uix-note__icon { color: var(--uix-success); }
  .uix-note--warning { background: var(--uix-warning-bg); border-color: color-mix(in srgb, var(--uix-warning) 30%, transparent); }
  .uix-note--warning .uix-note__icon { color: var(--uix-warning); }
  .uix-note--danger { background: var(--uix-danger-bg); border-color: color-mix(in srgb, var(--uix-danger) 30%, transparent); }
  .uix-note--danger .uix-note__icon { color: var(--uix-danger); }
}
```

- [ ] **Step 2: Import it.** Add `@import "components/prose.css";` to `styles/main.css`.

- [ ] **Step 3: Add the Prose section in `index.html`.** Nav link `<a class="uix-guide__navlink" href="#prose">Prose &amp; text</a>`, section before `#utility`. Reuse the inline info/check/triangle/x SVGs already present in `#overlays` alerts for the note icons (copy those `<svg>…</svg>` snippets into the `uix-note__icon` spans):

```html
      <section id="prose" class="uix-guide__section">
        <h2>Prose &amp; text</h2>
        <p class="lead">A content card for longer text — knowledge-base articles, ticket descriptions, release notes — plus note callouts and examples of components nested inside cards.</p>

        <div class="uix-guide__subhead">Prose card</div>
        <div class="uix-card"><div class="uix-card__body">
          <div class="uix-prose">
            <h3>Resolving VPN disconnects</h3>
            <p>When users on the EU gateway report random disconnects, the cause is almost always a stale session table after a config push. Follow these steps before escalating.</p>
            <h4>Steps</h4>
            <ol><li>Roll back the most recent gateway config.</li><li>Flush the session table with <code>vpnctl flush --region eu</code>.</li><li>Watch reconnect rates for 15 minutes.</li></ol>
            <blockquote>If disconnects persist after a flush, the issue is upstream — open a problem ticket and link this article.</blockquote>
            <p>See the <a href="#">runbook</a> for the full escalation path.</p>
          </div>
        </div></div>

        <div class="uix-guide__subhead">Note callouts</div>
        <div class="uix-stack" style="--gap:10px">
          <div class="uix-note uix-note--info"><span class="uix-note__icon"><!-- info svg --></span><div class="uix-note__body"><strong>Note.</strong> Config pushes take up to 60 seconds to propagate across all regions.</div></div>
          <div class="uix-note uix-note--success"><span class="uix-note__icon"><!-- check svg --></span><div class="uix-note__body"><strong>Resolved.</strong> Reconnect rate is back to baseline.</div></div>
          <div class="uix-note uix-note--warning"><span class="uix-note__icon"><!-- triangle svg --></span><div class="uix-note__body"><strong>Heads up.</strong> Flushing sessions will sign out active users.</div></div>
          <div class="uix-note uix-note--danger"><span class="uix-note__icon"><!-- x svg --></span><div class="uix-note__body"><strong>Do not</strong> restart the gateway during business hours.</div></div>
        </div>

        <div class="uix-guide__subhead">Nested composition — a card containing other components</div>
        <div class="uix-card"><div class="uix-card__header"><span class="uix-card__title">Open incidents</span></div><div class="uix-card__body" style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;gap:12px"><div class="uix-stat" style="flex:1"><div class="uix-stat__label">Open</div><div class="uix-stat__value">128</div></div><div class="uix-stat" style="flex:1"><div class="uix-stat__label">Breaching</div><div class="uix-stat__value">3</div></div></div>
          <ul class="uix-tree"><li><span class="uix-tree__row">INC-2043 · VPN disconnects</span></li><li><span class="uix-tree__row">INC-2041 · Email outage</span></li></ul>
          <div class="uix-reactions" data-uix-reactions data-reactions='[{"emoji":"👀","count":1,"mine":false}]'></div>
        </div></div>
      </section>
```

(Replace each `<!-- … svg -->` with the matching inline `<svg>` from the alert examples at [index.html:517-520](../../index.html).)

- [ ] **Step 4: Verify.** `preview_start`; `preview_screenshot` the Prose section (light + dark). `preview_inspect` `.uix-prose` for `max-width` ≈ 66ch (a finite px value, not `none`). Confirm the four note tones show distinct backgrounds, and the nested-composition card renders stats + tree + a working reactions row.

- [ ] **Step 5: Commit.**

```bash
git add styles/components/prose.css styles/main.css index.html
git commit -m "feat(guide): prose content card, note callouts, nested-composition examples"
```

---

# Phase 4 — Example dashboard

## Task 10: Standalone `dashboard.html`

**Files:** Create `dashboard.html`; modify `index.html` (link to it).

**Why:** A complex, realistic blended service+account workspace where the components interact, on the real app-shell. Reuses all component CSS + `guide/app.js` (page-agnostic) + the new setups. No bespoke per-page JS.

- [ ] **Step 1: Scaffold `dashboard.html`** — mirror `index.html`'s `<head>` exactly (no-flash theme script, Google Fonts preconnect+link, `styles/main.css`; you may omit `guide/guide.css` since the dashboard is not the docs chrome), then build the shell. Skeleton:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workspace — UIx v2</title>
  <!-- no-flash theme: copy the exact <script> block from index.html <head> -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/main.css">
  <style>body{margin:0;height:100vh}</style>
</head>
<body>
  <div class="uix-shell" style="height:100vh;border:0;border-radius:0">
    <aside class="uix-sidebar" data-uix-sidebar>
      <!-- reuse the sidebar markup from index.html navigation section (brand, favorites, Workspace nav items, Reports group) -->
    </aside>
    <div class="uix-shell__topbar">
      <nav class="uix-breadcrumbs"><a href="index.html">Style guide</a><span class="uix-breadcrumbs__sep">/</span><span aria-current="page">Workspace</span></nav>
      <span style="flex:1"></span>
      <button class="uix-btn uix-btn--secondary uix-btn--sm" data-uix-open="#demo-cmdk">Search <span class="uix-kbd">⌘K</span></button>
      <button class="uix-guide__icon-btn" type="button" data-uix-theme-toggle aria-label="Toggle theme"></button>
    </div>
    <div class="uix-shell__main">
      <!-- KPI row, main column (queue table + View menu), right rail, lower band -->
    </div>
  </div>
  <!-- overlay instances: copy #demo-peek and #demo-cmdk dialogs from index.html so row→peek and ⌘K work -->
  <script type="module" src="guide/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Build the KPI row** inside `.uix-shell__main` — a 4-up grid of `.uix-stat` tiles (Open tickets 128, SLA at-risk 3, ARR $1.2M, CSAT 94%) using the same `.uix-stat` markup as [index.html:376-381](../../index.html), plus a heartbeat indicator. Wrap in `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px">`.

- [ ] **Step 3: Build the two-column body** — `<div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">`:
  - **Main column:** a queue table — copy the `#tickets` data-table markup from `index.html` **as updated in Task 5** (toolbar with search + the View menu popover, filter bar, `.uix-table--pinned-col`, rows with `data-id`). Give it a unique id (e.g. `id="queue"`) so its view prefs persist separately. Make each row open the peek: add `data-uix-open-peek` is button-based today; for row→peek, add a click handler is out of scope of app.js — instead keep the existing "Peek a ticket" affordance by adding one `data-uix-open-peek` button above the table (the spec's row→peek is satisfied by the peek being wired to the table's rows via `setupPeek`, which already reads `[data-uix-table] tbody tr`). To get true row-click, add `style="cursor:pointer"` rows and a small inline handler is NOT allowed (no inline JS preferred); rely on the existing peek button + arrow nav. (If row-click is required, add it in a follow-up; keep this task scoped.)
  - **Right rail:** stack of cards — contact/account card (`.uix-contact`, now with equal buttons), deal pipeline (`.uix-pipeline`), notification center (`.uix-notifs`), SLA widget (`.uix-sla`). Copy markup from the CRM/ITSM section.

- [ ] **Step 4: Build the lower band** — `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px">`:
  - activity/comments card with a `.uix-reactions` row,
  - a chart card (copy the bars or area SVG chart from [index.html:446-467](../../index.html)),
  - a `.uix-prose` "Release notes" card,
  - a `.uix-media` device/asset card (reuse `assets/img/device-macbook.svg`).

- [ ] **Step 5: Add the data-table id + View menu popover id uniqueness.** The View menu popover uses `id="viewmenu"` and `anchor-name:--viewbtn` in `index.html`. On `dashboard.html` use a distinct id (e.g. `viewmenu2` / `--viewbtn2`) so a single page never duplicates ids. `initTable` reads the popover by `[data-uix-viewmenu]` within `root`, so the wiring is id-agnostic — only the `popovertarget`/`id`/`anchor-name` pairing must match within the page.

- [ ] **Step 6: Link the dashboard from the guide.** In `index.html`, add a prominent link in the topbar header (next to the theme toggle) and/or the nav rail: `<a class="uix-guide__navlink" href="dashboard.html">↗ Example dashboard</a>`.

- [ ] **Step 7: Verify the dashboard end-to-end.** `preview_eval` → `location.href = '/dashboard.html'` (or `preview_start` then navigate). Then:
  - `preview_screenshot` (light) — shell + KPI row + queue + right rail + lower band all render.
  - `preview_eval` toggles dark (`document.documentElement.setAttribute('data-theme','dark')`) → `preview_screenshot`.
  - `preview_eval` opens the peek button + the View menu; confirm both work (peek slides in on-screen — the Task 1 fix; View menu density persists under the `queue` key).
  - `preview_console_logs` — expect no errors.
  - `preview_network` — confirm only local assets load (no failed requests).

- [ ] **Step 8: Commit.**

```bash
git add dashboard.html index.html
git commit -m "feat: standalone blended workspace dashboard.html on the app-shell"
```

---

# Phase 5 — Finalize

## Task 11: Full verification sweep + branch finish

- [ ] **Step 1: Run the whole unit suite.** Run: `node --test guide/`. Expected: all tests pass (original 13 + new view-pref/density/reaction tests).

- [ ] **Step 2: Guide regression sweep in the preview.** Load `index.html`; `preview_screenshot` each new section (Icons, Emoji, Images, Prose) and the updated Data-display table, in light and dark. Open modal, drawer, peek, command palette, a popover, and a toast — confirm all animate in and out (Task 1). Confirm reduced-motion still makes overlays instant (`preview_eval` can't change OS setting; note this is verified manually if needed).

- [ ] **Step 3: Update the README icon/section note if needed.** If `README.md`'s "Fonts & icons" or feature list should mention the dashboard / View menu / reactions, add a one-line note. (Optional, only if it keeps the README accurate.)

- [ ] **Step 4: Invoke the finishing-a-development-branch skill** to decide merge/PR/cleanup for `build/round-2-dashboard`.

---

## Self-review (completed during planning)

- **Spec coverage:** 2.1→T1, 2.2→T2, 2.3→T3+T4+T5, 2.4→T6, 2.5→T7, 2.6→T8, 2.7→T9, 2.8→T10; cross-cutting tokens→T3, helpers→T4/T7, tests→T4/T7/T11, imports→T5/T7/T8/T9. All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step shows complete code; the only `<!-- … -->` markers (note-icon SVGs, sidebar reuse) point to exact existing line ranges to copy from.
- **Type/name consistency:** `readViewPrefs`/`writeViewPrefs`/`defaultViewPrefs`/`DENSITIES`/`toggleReaction` names match between definition (T4/T7), tests (T4/T7), and use (T5/T7); pref shape `{density,zebra,freeze,hiddenCols}` is consistent across helper, storage key `uix-view-<id>`, and `initTable`; `data-uix-viewmenu`/`data-uix-density`/`data-uix-zebra`/`data-uix-freeze`/`data-uix-colmenu`/`data-uix-reactions`/`data-uix-lightbox`/`data-uix-lightbox-dialog`/`data-uix-icon` attribute names match between markup and `app.js`.
