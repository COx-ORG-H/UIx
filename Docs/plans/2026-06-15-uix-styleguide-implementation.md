# UIx Styleguide (UIx v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a framework-agnostic, build-free, light/dark style guide (`uix-styleguide`) that documents and ships every CRM/ITSM UI component as modular, copy-pasteable HTML + CSS + vanilla JS, reusing the `--uix-*` token contract with Square-UI-derived values.

**Architecture:** Pure static assets — no bundler, no framework. A single `index.html` showcase links modular CSS (`tokens.css` → `base.css` → per-component files) and one ES-module `app.js`. Components are self-contained CSS keyed only on `--uix-*` tokens, named `uix-` BEM-lite. Interactivity uses modern native CSS/HTML (Popover API, `<dialog>`, `@starting-style`, View Transitions) as progressive enhancement; `app.js` covers only what CSS can't (theme persistence, copy, scrollspy, peek navigation, focus trap, toast queue).

**Tech Stack:** HTML5, modern CSS (custom properties, `@starting-style`, `transition-behavior: allow-discrete`, Popover API, View Transitions API, container queries where useful), vanilla ES modules, self-hosted Geist fonts, lucide inline SVG icons. Tests: `node:test` (built into Node 22, zero deps) for pure JS logic; documented manual/visual verification for CSS+DOM. Optional Playwright smoke pass in the polish phase.

**Spec:** [`Docs/specs/2026-06-15-uix-v2-style-guide-design.md`](../specs/2026-06-15-uix-v2-style-guide-design.md)

---

## Conventions (defined once; every task obeys these)

**CSS class naming:** `uix-` prefix, BEM-lite — block `.uix-card`, element `.uix-card__header`, modifier `.uix-btn--danger`. Prefer real attributes for state: `[disabled]`, `[aria-selected]`, `[aria-expanded]`, `[data-state]`, `:hover`, `:focus-visible`.

**Component CSS file template** (every `styles/components/<name>.css` starts like this):
```css
/* uix <name> — depends only on --uix-* tokens. No cross-component selectors. */
@layer uix.components {
  .uix-<name> { /* … */ }
}
```
All component rules live in the `uix.components` cascade layer; tokens/base live in earlier layers so component rules always win predictably and project overrides (unlayered) beat everything.

**Per-component verification checklist** (the "test" for CSS components — a task is not done until all pass):
1. Renders in the showcase in **light AND dark** (toggle the theme).
2. **Every variant + state** present (default, hover, focus-visible, active, disabled, loading, error, selected, read-only — whichever apply).
3. **Tokens resolve** — no element falls back to transparent/black (i.e. no typo'd `var(--uix-…)`).
4. **AA contrast** — text/fg-on-bg ≥ 4.5:1 (body) / 3:1 (large/UI), verified with the contrast helper (Task 0.6).
5. **Keyboard + focus** — interactive parts reachable by Tab, visible `:focus-visible` ring.
6. **Reduced motion** — with `prefers-reduced-motion: reduce` emulated, no transform/slide animation runs.

**Commit convention:** Conventional Commits, one commit per completed task. Every commit message ends with:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
Branch first (never commit straight to the default branch on shared work); this is a fresh repo so Phase 0 establishes `main` then work proceeds on `build/<phase>` branches.

**Definition of done for a phase:** all its tasks' checkboxes ticked, `index.html` shows the group in both themes, `node --test` green, committed.

---

## File Structure

```
uix-styleguide/
├── index.html                     # showcase: <head> no-flash script, nav, one <section> per component group
├── styles/
│   ├── tokens.css                 # @layer uix.tokens — all --uix-* (light :root + dark selector)
│   ├── base.css                   # @layer uix.base — reset, element defaults, typography, focus-visible, scrollbars, ::selection
│   ├── utilities.css              # @layer uix.util — .uix-stack/.uix-cluster/.uix-visually-hidden/.uix-truncate
│   ├── motion.css                 # @layer uix.motion — shared keyframes, reduced-motion guard, enter/exit helpers
│   └── components/                # @layer uix.components — one file per component (§5 of spec)
│       └── *.css
├── guide/
│   ├── guide.css                  # showcase chrome ONLY (nav rail, code blocks, swatch grid) — not shipped to projects
│   └── app.js                     # ES module: theme, copy, scrollspy, peek, focus-trap, toast, persistence
│   └── app.test.js                # node:test unit suite for pure logic in app.js helpers
├── assets/
│   ├── fonts/                     # Geist + Geist Mono woff2 + @font-face (in base.css)
│   └── icons.js                   # lucide inline-SVG map used by the showcase (string templates)
├── .project-status.json
├── .gitignore
└── README.md
```

**CSS load order** (in `index.html`, and the order projects copy): `tokens.css` → `base.css` → `utilities.css` → `motion.css` → `components/*`. Cascade layers make order robust regardless.

---

## Phase 0 — Project scaffold & foundation harness

### Task 0.1: Initialise repo & governance files

**Files:**
- Create: `.gitignore`, `.project-status.json`, `README.md`

- [ ] **Step 1: Init git + first branch**

```bash
cd /d/Development/Projects/uix-styleguide
git init
git add Docs   # the spec + this plan already exist
git commit -m "docs: add UIx v2 style guide spec and implementation plan

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git checkout -b build/phase-0-foundation
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# caches / OS (global gitignore also covers these)
node_modules/
.DS_Store
Thumbs.db
*.log
```

- [ ] **Step 3: Write `.project-status.json`** (governance §2)

```json
{ "status": "active", "purpose": "UIx v2 — framework-agnostic, build-free CRM/ITSM style guide (HTML/CSS/JS); shares the --uix-* token contract with UIx", "lastTouched": "2026-06-15", "owner": "haris" }
```

- [ ] **Step 4: Write `README.md`** — sections: What this is; How to view (open `index.html`); How to consume in a project (copy `styles/tokens.css` + `base.css` + chosen `components/*`; set `data-theme`); Token override recipe (the `--uix-brand` slot); Relationship to UIx v1 + governance note (versions via git/_Archive, not folder suffixes); Forward path (optional Style Dictionary). Keep ≤ 120 lines.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .project-status.json README.md
git commit -m "chore: scaffold uix-styleguide project (governance files, readme)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 0.2: Fonts

**Files:** Create `assets/fonts/` (Geist + Geist Mono woff2), `@font-face` block goes in `base.css` (Task 0.4).

- [ ] **Step 1:** Download Geist + Geist Mono variable woff2 (OFL, self-hosted — no CDN) into `assets/fonts/`. Source: official Geist release. Record the version in `README.md`.
- [ ] **Step 2: Commit** `chore: add self-hosted Geist + Geist Mono fonts`.

### Task 0.3: `tokens.css` — the full contract

**Files:** Create `styles/tokens.css`

- [ ] **Step 1: Write the token layer** — transcribe §3 of the spec verbatim into CSS custom properties. Structure:

```css
@layer uix.tokens {
  :root {
    /* surfaces */
    --uix-bg-app:#FAFAFA; --uix-bg-subtle:#F5F5F5; --uix-bg-hover:#EFEFEF; --uix-bg-active:#E5E5E5;
    --uix-surface:#FFFFFF; --uix-surface-2:#FFFFFF; --uix-surface-3:#FAFAFA;
    --uix-border:#E5E5E5; --uix-border-strong:#D4D4D4;
    /* text */
    --uix-text:#0A0A0A; --uix-text-hushed:rgba(10,10,10,.62); --uix-text-muted:#737373;
    --uix-text-reverse:#FFFFFF; --uix-text-hushed-reverse:rgba(255,255,255,.62);
    /* accent (blue) — brand slots unset, accent/link/ring chain through them */
    --uix-accent:var(--uix-brand,#1447E6); --uix-accent-dark:#0E3AC0; --uix-accent-light:#4D77F0;
    --uix-accent-fg:var(--uix-brand-fg,#FFFFFF);
    --uix-link:var(--uix-brand,#1447E6); --uix-ring:var(--uix-brand,#1447E6);
    --uix-brand-muted:color-mix(in srgb, var(--uix-accent) 12%, transparent);
    /* status */
    --uix-success:#009767; --uix-success-fg:#FFFFFF; --uix-success-bg:#D0FAE5;
    --uix-warning:#F99C00; --uix-warning-fg:#1A1A1A; --uix-warning-bg:#FEF3D6;
    --uix-info:#1447E6;    --uix-info-fg:#FFFFFF;    --uix-info-bg:#E3EBFF;
    --uix-danger:#E40014;  --uix-danger-fg:#FFFFFF;  --uix-danger-bg:#FFE4E6;
    /* chart */
    --uix-chart-1:#1447E6; --uix-chart-2:#009588; --uix-chart-3:#009767; --uix-chart-4:#F99C00;
    --uix-chart-5:#F05100; --uix-chart-6:#E40014; --uix-chart-7:#7F22FE; --uix-chart-8:#E70044;
    --uix-chart-neutral:#737373;
    /* type */
    --uix-font-sans:"Geist",system-ui,sans-serif; --uix-font-mono:"Geist Mono",ui-monospace,monospace;
    --uix-text-display:40px;  --uix-leading-display:1.05; --uix-text-data-hero:34px; --uix-leading-data-hero:1.1;
    --uix-text-h2:24px; --uix-leading-h2:1.15; --uix-text-h3:15px; --uix-leading-h3:1.3;
    --uix-text-body:14px; --uix-leading-body:1.5; --uix-text-meta:12.5px; --uix-leading-meta:1.4;
    --uix-text-eyebrow:11px; --uix-leading-eyebrow:1.2; --uix-tracking-tight:-0.02em; --uix-tracking-eyebrow:0.06em;
    /* radius */
    --uix-radius-sm:8px; --uix-radius-md:12px; --uix-radius-lg:16px; --uix-radius-pill:999px;
    /* elevation */
    --uix-shadow-sm:0 1px 2px rgba(0,0,0,.06);
    --uix-shadow-popover:0 8px 24px rgba(0,0,0,.10),0 1px 2px rgba(0,0,0,.05);
    --uix-shadow-overlay:0 16px 48px rgba(0,0,0,.18);
    --uix-highlight-top:inset 0 1px 0 rgba(255,255,255,0);
    /* motion */
    --uix-ease-out:cubic-bezier(.23,1,.32,1); --uix-ease-out-strong:cubic-bezier(.2,0,0,1);
    --uix-ease-in:cubic-bezier(.4,0,1,1); --uix-ease-in-out:cubic-bezier(.4,0,.2,1);
    --uix-ease-spring:cubic-bezier(.34,1.56,.64,1);
    --uix-dur-fast:120ms; --uix-dur:160ms; --uix-dur-slow:240ms; --uix-dur-slower:320ms; --uix-lift:4px;
    /* layout */
    --uix-row-h:56px; --uix-row-h-compact:44px; --uix-control-h:36px; --uix-sidebar-w:248px; --uix-topbar-h:56px;
    /* rows / scrollbars / icons / peek */
    --uix-row:#FFFFFF; --uix-row-alt:#FAFAFA; --uix-row-pinned-bg:#F4F7FF;
    --uix-scrollbar-size:10px; --uix-scrollbar-thumb:rgba(10,10,10,.20); --uix-scrollbar-thumb-hover:rgba(10,10,10,.34); --uix-scrollbar-track:transparent;
    --uix-icon-sm:16px; --uix-icon-md:20px; --uix-icon-lg:24px; --uix-peek-w:420px;
  }
  :root:where(.dark,[data-theme="dark"]) {
    --uix-bg-app:#0A0A0A; --uix-bg-subtle:#171717; --uix-bg-hover:#1F1F1F; --uix-bg-active:#262626;
    --uix-surface:#111111; --uix-surface-2:#171717; --uix-surface-3:#262626;
    --uix-border:rgba(255,255,255,.08); --uix-border-strong:rgba(255,255,255,.14);
    --uix-text:#FAFAFA; --uix-text-hushed:rgba(250,250,250,.64); --uix-text-muted:#A1A1A1;
    --uix-accent:var(--uix-brand,#3080FF); --uix-link:var(--uix-brand,#5B8DEF); --uix-ring:var(--uix-brand,#3080FF);
    --uix-brand-muted:color-mix(in srgb, var(--uix-accent) 16%, transparent);
    --uix-success:#00D294; --uix-success-fg:#002C22; --uix-success-bg:rgba(0,210,148,.15);
    --uix-warning:#FCBB00; --uix-warning-fg:#1A1A1A; --uix-warning-bg:rgba(249,156,0,.16);
    --uix-info:#3080FF; --uix-info-fg:#FFFFFF; --uix-info-bg:rgba(48,128,255,.16);
    --uix-danger:#FF6568; --uix-danger-fg:#FFFFFF; --uix-danger-bg:rgba(255,101,104,.16);
    --uix-chart-1:#3080FF; --uix-chart-2:#00C2B0; --uix-chart-3:#00D294; --uix-chart-4:#FCBB00;
    --uix-chart-5:#FF8B1A; --uix-chart-6:#FF6568; --uix-chart-7:#A685FF; --uix-chart-8:#FF667F;
    --uix-chart-neutral:#A1A1A1;
    --uix-highlight-top:inset 0 1px 0 rgba(255,255,255,.04);
    --uix-row:#111111; --uix-row-alt:#161616; --uix-row-pinned-bg:rgba(48,128,255,.08);
    --uix-scrollbar-thumb:rgba(255,255,255,.18); --uix-scrollbar-thumb-hover:rgba(255,255,255,.30);
  }
}
```

- [ ] **Step 2: Verify** — create a scratch `index.html` linking only `tokens.css` with a few `<div style="background:var(--uix-…)">`, open it, toggle `data-theme` on `<html>` in devtools; confirm light/dark values flip. (Scratch file discarded; real `index.html` is Task 0.5.)
- [ ] **Step 3: Commit** `feat(tokens): add full --uix-* token contract (Square-UI values, light+dark)`.

### Task 0.4: `base.css` — reset, typography, focus, scrollbars

**Files:** Create `styles/base.css`

- [ ] **Step 1: Write it** — in `@layer uix.base`: modern reset (box-sizing, margin 0, `img{max-width:100%}`), `@font-face` for Geist/Geist Mono (Task 0.2 files), `html`/`body` use `--uix-font-sans`, `--uix-text`, `--uix-bg-app`; base `--uix-text-body`/`--uix-leading-body`; heading defaults from the type scale; `a{color:var(--uix-link)}`; global `:focus-visible{outline:2px solid var(--uix-ring);outline-offset:2px}`; `::selection{background:var(--uix-brand-muted)}`; themed scrollbars:

```css
@layer uix.base {
  * { scrollbar-width: thin; scrollbar-color: var(--uix-scrollbar-thumb) var(--uix-scrollbar-track); }
  ::-webkit-scrollbar { width: var(--uix-scrollbar-size); height: var(--uix-scrollbar-size); }
  ::-webkit-scrollbar-track { background: var(--uix-scrollbar-track); }
  ::-webkit-scrollbar-thumb { background: var(--uix-scrollbar-thumb); border-radius: var(--uix-radius-pill);
    border: 2px solid transparent; background-clip: content-box; }
  ::-webkit-scrollbar-thumb:hover { background: var(--uix-scrollbar-thumb-hover); background-clip: content-box; }
  /* default theme follows OS until JS sets data-theme */
  @media (prefers-color-scheme: dark) { :root:not([data-theme]) { color-scheme: dark; } }
}
```

- [ ] **Step 2: Verify** typography + scrollbar styling in both themes. **Commit** `feat(base): reset, typography, focus-visible, themed scrollbars`.

### Task 0.5: `utilities.css`

- [ ] Create `styles/utilities.css` in `@layer uix.util`: `.uix-visually-hidden` (a11y clip), `.uix-stack`/`.uix-cluster` (flex gap helpers using a `--gap` var), `.uix-truncate`. Verify, commit `feat(util): layout/a11y utilities`.

### Task 0.6: Showcase harness — `index.html` + `guide.css` + `app.js` core

**Files:** Create `index.html`, `guide/guide.css`, `guide/app.js`, `guide/app.test.js`, `assets/icons.js`

- [ ] **Step 1 (TDD): Write failing tests for app.js pure helpers** in `guide/app.test.js` using `node:test`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTheme, nextTheme } from './app.js';

test('resolveTheme: stored value wins over OS', () => {
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme(null, true), 'dark');   // null stored, OS dark
  assert.equal(resolveTheme(null, false), 'light');
});
test('nextTheme toggles', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});
```

- [ ] **Step 2: Run, expect FAIL** — `node --test guide/` → fails (functions not exported).
- [ ] **Step 3: Write `app.js`** as an ES module exporting pure helpers + a DOM init guarded by `typeof document`:

```js
export const resolveTheme = (stored, osDark) => stored ?? (osDark ? 'dark' : 'light');
export const nextTheme = (t) => (t === 'dark' ? 'light' : 'dark');

if (typeof document !== 'undefined') {
  const root = document.documentElement;
  const KEY = 'uix-theme';
  // no-flash already applied the attr in <head>; wire the toggle:
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-uix-theme-toggle]');
    if (t) { const next = nextTheme(root.getAttribute('data-theme') || 'light');
      root.setAttribute('data-theme', next); localStorage.setItem(KEY, next); }
    const c = e.target.closest('[data-uix-copy]');           // copy-to-clipboard
    if (c) { navigator.clipboard.writeText(c.closest('[data-uix-example]').querySelector('template').innerHTML.trim());
      c.dataset.copied = '1'; setTimeout(() => delete c.dataset.copied, 1200); }
  });
  // scrollspy nav (IntersectionObserver) — wired in Task 0.7
}
```

- [ ] **Step 4: Run tests, expect PASS** — `node --test guide/`.
- [ ] **Step 5: Write `index.html`** — `<!doctype html>`, `<html lang="en">`, `<head>` with the **no-flash inline script** (`document.documentElement.setAttribute('data-theme', localStorage.getItem('uix-theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'))`), the CSS links in load order, `<script type="module" src="guide/app.js">`. Body = app-shell layout: left **nav rail** (section links, scrollspy targets), top bar with the **theme toggle** button (`data-uix-theme-toggle`), main scroll area with one empty `<section id="…">` placeholder per spec group (§5.1–5.9). Each component example will use the pattern: `<div data-uix-example><div class="uix-example__preview">…live…</div><template>…copyable HTML…</template><button data-uix-copy>Copy</button></div>`.
- [ ] **Step 6: Write `guide/guide.css`** — chrome only: nav rail, sticky top bar, `[data-uix-example]` preview frame + code block styling, swatch grid for the token reference. Uses `--uix-*` tokens.
- [ ] **Step 7: Write `assets/icons.js`** — export a map of the lucide glyphs the showcase needs (chevron, star, pin, x, search, filter, more-horizontal, check, sun, moon, panel-left, …) as inline-SVG strings sized via `width/height:var(--uix-icon-md)` and `stroke="currentColor"`.
- [ ] **Step 8: Verify** — open `index.html`: theme toggle flips + persists (reload keeps it), no FOUC, nav scrollspy stub present, copy button works on a hand-added sample. **Commit** `feat(harness): showcase shell, theme toggle, copy, icons + app.js tests`.

### Task 0.7: Token-reference section + scrollspy

- [ ] Populate the §5.1 Foundations `<section>` with: color **swatch grid** (every semantic + chart token, showing the resolved value and a computed **contrast badge** vs its `-fg`/bg using a small `getContrast()` helper added to `app.js` — TDD it first: `test('contrast ratio black/white ≈ 21', …)`), the type scale, radii, shadow, and motion samples. Finish the IntersectionObserver scrollspy so the nav highlights the active section. Verify in both themes; **commit** `feat(foundations): token reference + scrollspy + contrast helper`.

**End of Phase 0:** open `index.html` → themed shell, working light/dark toggle, full token reference. `node --test` green. Merge `build/phase-0-foundation` → `main`.

---

## Phase 1 — Motion mechanics (shared)

### Task 1.1: `styles/motion.css`

- [ ] Create in `@layer uix.motion`: the **reduced-motion guard** first —
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration:.001ms!important; transition-duration:.001ms!important; animation-iteration-count:1!important; }
}
```
shared `@keyframes` (`uix-fade-in`, `uix-slide-in-right`, `uix-pop-in` = fade+`scale(.96→1)`, `uix-shimmer`), and reusable enter/exit helper classes used by overlays (`.uix-anim-pop`, `.uix-anim-drawer`) that pair with `@starting-style`. Document the `@starting-style` + `transition-behavior:allow-discrete` pattern in a comment block (overlays in Phase 5 reference it). Verify a sample fade respects reduced-motion. **Commit** `feat(motion): shared keyframes, reduced-motion guard, enter/exit helpers`.

---

## Phase 2 — Form controls (spec §5.2)

Each component = one task = one `styles/components/<name>.css` + a showcase example block in the §5.2 section, following the **component CSS template** and passing the **verification checklist**. **Exemplar (Task 2.1) shows full code; later tasks specify exactly what to build.**

### Task 2.1: Button (EXEMPLAR — full code)

**Files:** Create `styles/components/button.css`; add example to `index.html` §5.2.

- [ ] **Step 1: Write `button.css`**
```css
/* uix button — depends only on --uix-* tokens. */
@layer uix.components {
  .uix-btn {
    display:inline-flex; align-items:center; justify-content:center; gap:.5em;
    height:var(--uix-control-h); padding:0 14px; border:1px solid transparent;
    border-radius:var(--uix-radius-md); font:inherit; font-size:var(--uix-text-body); font-weight:500;
    line-height:1; cursor:pointer; user-select:none; white-space:nowrap;
    transition: background-color var(--uix-dur-fast) var(--uix-ease-out),
                border-color var(--uix-dur-fast) var(--uix-ease-out),
                color var(--uix-dur-fast) var(--uix-ease-out),
                transform var(--uix-dur-fast) var(--uix-ease-out);
  }
  .uix-btn:active { transform: scale(.98); }
  .uix-btn:disabled, .uix-btn[aria-disabled="true"] { opacity:.5; pointer-events:none; }
  .uix-btn:focus-visible { outline:2px solid var(--uix-ring); outline-offset:2px; }
  /* variants */
  .uix-btn--primary   { background:var(--uix-accent); color:var(--uix-accent-fg); }
  .uix-btn--primary:hover   { background:var(--uix-accent-dark); }
  .uix-btn--secondary { background:var(--uix-bg-subtle); color:var(--uix-text); border-color:var(--uix-border); }
  .uix-btn--secondary:hover { background:var(--uix-bg-hover); }
  .uix-btn--outline   { background:transparent; color:var(--uix-text); border-color:var(--uix-border-strong); }
  .uix-btn--outline:hover   { background:var(--uix-bg-hover); }
  .uix-btn--ghost     { background:transparent; color:var(--uix-text); }
  .uix-btn--ghost:hover     { background:var(--uix-bg-hover); }
  .uix-btn--danger    { background:var(--uix-danger); color:var(--uix-danger-fg); }
  .uix-btn--link      { background:transparent; color:var(--uix-link); height:auto; padding:0; }
  .uix-btn--link:hover { text-decoration:underline; }
  /* sizes */
  .uix-btn--sm { height:28px; padding:0 10px; font-size:var(--uix-text-meta); }
  .uix-btn--lg { height:44px; padding:0 18px; }
  .uix-btn--icon { width:var(--uix-control-h); padding:0; }
  /* loading */
  .uix-btn[data-loading] { color:transparent; position:relative; pointer-events:none; }
  .uix-btn[data-loading]::after { content:""; position:absolute; width:1em; height:1em;
    border:2px solid currentColor; border-right-color:transparent; border-radius:50%;
    color:var(--uix-accent-fg); animation:uix-spin .6s linear infinite; }
  @keyframes uix-spin { to { transform:rotate(1turn); } }
}
```
- [ ] **Step 2: Add showcase example** — all variants × sizes, icon-only, loading, disabled, in a `[data-uix-example]` block with a `<template>` of the markup.
- [ ] **Step 3: Verify** against the checklist (light/dark, states, contrast of each filled variant's text, focus ring, reduced-motion stops the press transition). Confirm primary `#1447E6`+white ≥ 4.5:1 and danger `#E40014`+white ≥ 4.5:1 via the contrast helper.
- [ ] **Step 4: Commit** `feat(button): all variants, sizes, states`.

### Tasks 2.2–2.16 (one per component; build to the same template + checklist)

For each: create `styles/components/<name>.css`, add a showcase example covering the listed variants/states, pass the checklist, commit `feat(<name>): …`.

- [ ] **2.2 button-group / split-button** — segmented attached buttons; split = primary + dropdown caret. States: hover/active/focus per segment.
- [ ] **2.3 input** — `.uix-field` wrapper (label, control, hint, error); sizes sm/md; `--uix-control-h`; prefix/suffix slots; states: focus (ring), error (`--uix-danger` border + `aria-invalid`), disabled, read-only.
- [ ] **2.4 textarea** — same field wrapper; auto-min-height; resize-vertical.
- [ ] **2.5 select (native + styled)** — native `<select>` themed + a styled variant built on the Popover API listbox; chevron icon; states.
- [ ] **2.6 checkbox** — custom box via `appearance:none`; check glyph; indeterminate; focus; disabled.
- [ ] **2.7 radio + radio-group** — dot; group layout; keyboard arrow semantics noted.
- [ ] **2.8 switch** — track+thumb; `[aria-checked]`; `--uix-dur-fast` `--uix-ease-out` thumb slide; spring optional.
- [ ] **2.9 segmented control** — pill container, sliding active indicator (transform), `role=tablist`-like.
- [ ] **2.10 slider / range** — themed track + filled portion + thumb; focus ring on thumb.
- [ ] **2.11 number stepper** — input + −/+ buttons (reuse button styles).
- [ ] **2.12 search input** — input variant with leading search icon + clear button.
- [ ] **2.13 combobox / autocomplete** — input + Popover listbox; active-descendant highlight; loading; empty.
- [ ] **2.14 multi-select / tag-input** — chips inside the field; remove-chip; overflow count.
- [ ] **2.15 file upload / dropzone** — button + drag-over state (`--uix-brand-muted` wash); file list rows.
- [ ] **2.16 date picker + date-range + time** — calendar grid popover (reuse Phase 3 calendar), range highlight, time list.
- [ ] **2.17 form layout** — `.uix-form-grid`, `fieldset`, inline form, **validation summary** banner (links to fields).

**End of Phase 2:** §5.2 section fully populated, both themes, tests green. Merge.

---

## Phase 3 — Navigation & shell (spec §5.3) — includes the Sidebar exemplar

### Task 3.1: App shell

- [ ] `styles/components/app-shell.css` — CSS grid: `--uix-sidebar-w` rail | `1fr`; top bar `--uix-topbar-h`; scroll regions; collapsed-rail modifier. Example mirrors the Finance/Régate layout. Checklist; commit.

### Task 3.2: Sidebar nav (EXEMPLAR — full code; implements §5.3 detailed reqs + Favorites + collapsible sub-items; peek wired in Phase 5)

**Files:** Create `styles/components/sidebar.css`; add example + interaction to `app.js`.

- [ ] **Step 1 (TDD): favorites/expansion persistence helpers** in `app.test.js`:
```js
import { toggleSet } from './app.js';
test('toggleSet adds then removes an id', () => {
  assert.deepEqual([...toggleSet(new Set(), 'inc-1')], ['inc-1']);
  assert.deepEqual([...toggleSet(new Set(['inc-1']), 'inc-1')], []);
});
```
Run (FAIL) → add `export const toggleSet = (set, id) => { const s = new Set(set); s.has(id) ? s.delete(id) : s.add(id); return s; };` → run (PASS).

- [ ] **Step 2: Write `sidebar.css`**
```css
@layer uix.components {
  .uix-sidebar { width:var(--uix-sidebar-w); background:var(--uix-bg-subtle); border-right:1px solid var(--uix-border);
    display:flex; flex-direction:column; overflow-y:auto; padding:8px; gap:2px; }
  .uix-sidebar__eyebrow { font-size:var(--uix-text-eyebrow); letter-spacing:var(--uix-tracking-eyebrow);
    text-transform:uppercase; color:var(--uix-text-muted); padding:10px 10px 4px; }
  .uix-navitem { display:flex; align-items:center; gap:10px; height:36px; padding:0 10px;
    border-radius:var(--uix-radius-sm); color:var(--uix-text-hushed); cursor:pointer; text-decoration:none;
    transition: background-color var(--uix-dur-fast) var(--uix-ease-out), color var(--uix-dur-fast) var(--uix-ease-out); }
  .uix-navitem:hover { background:var(--uix-bg-hover); color:var(--uix-text); }
  .uix-navitem[aria-current="page"] { background:var(--uix-brand-muted); color:var(--uix-accent); font-weight:500; }
  .uix-navitem__icon { width:var(--uix-icon-md); height:var(--uix-icon-md); flex:none; }
  .uix-navitem__badge { margin-left:auto; font-size:var(--uix-text-meta); color:var(--uix-text-muted); }
  .uix-navitem__star { margin-left:auto; opacity:0; transition:opacity var(--uix-dur-fast) var(--uix-ease-out); }
  .uix-navitem:hover .uix-navitem__star, .uix-navitem__star[data-on] { opacity:1; }
  .uix-navitem__star[data-on] { color:var(--uix-warning); }
  /* collapsible group */
  .uix-navgroup__chevron { margin-left:auto; transition:transform var(--uix-dur) var(--uix-ease-out); }
  .uix-navgroup[aria-expanded="false"] .uix-navgroup__chevron { transform:rotate(-90deg); }
  .uix-navgroup__panel { display:grid; grid-template-rows:1fr; transition:grid-template-rows var(--uix-dur) var(--uix-ease-out); }
  .uix-navgroup[aria-expanded="false"] + .uix-navgroup__panel { grid-template-rows:0fr; }
  .uix-navgroup__panel > div { overflow:hidden; }
  .uix-subitem { padding-left:34px; } /* indent; dot marker via ::before */
  .uix-subitem::before { content:""; width:4px; height:4px; border-radius:50%; background:var(--uix-text-muted);
    display:inline-block; margin-right:8px; }
  /* collapsed rail */
  .uix-sidebar[data-collapsed] { width:56px; }
  .uix-sidebar[data-collapsed] .uix-navitem__label, .uix-sidebar[data-collapsed] .uix-navitem__badge { display:none; }
}
```
- [ ] **Step 3: Wire interaction in `app.js`** — click `[data-uix-fav]` → `toggleSet` favorites, persist, mirror into the Favorites section + set `data-on`; click `.uix-navgroup` → flip `aria-expanded`, persist; click rail toggle → flip `data-collapsed`.
- [ ] **Step 4: Add showcase example** — Favorites section (top), grouped items with icons + badges, one expandable group with sub-items, collapsed-rail toggle.
- [ ] **Step 5: Verify** checklist + grid-rows collapse animates (and is instant under reduced-motion) + favorite star persists across reload. **Commit** `feat(sidebar): items, favorites, collapsible sub-items, collapsed rail`.

### Tasks 3.3–3.10 (specified)
- [ ] **3.3 top bar** — actions cluster, search, theme toggle, user menu trigger.
- [ ] **3.4 breadcrumbs** — separators, truncation, current page.
- [ ] **3.5 tabs** — line/enclosed/pill; sliding active indicator (transform, `--uix-ease-out`); `role=tablist`, arrow keys.
- [ ] **3.6 pagination** — page buttons, prev/next, ellipsis, current.
- [ ] **3.7 steps / wizard** — horizontal + vertical; states done/active/upcoming; connector line.
- [ ] **3.8 command palette (⌘K)** — `<dialog>`-based overlay + Popover; input + grouped results + active highlight; open via ⌘K (app.js); enter/exit animation per Phase 5 pattern.
- [ ] **3.9 menu / dropdown / context menu** — Popover-API anchored menu; items, separators, checkbox/radio items, submenu; `pop-in` animation from trigger.
- [ ] **3.10 page header** — title/subtitle/actions + a range segmented control (`3m/6m/1y`).

**End of Phase 3:** §5.3 populated. Merge.

---

## Phase 4 — Data display (spec §5.4) — includes the Data-table exemplar

### Task 4.1: Card + KPI stat tile
- [ ] `card.css` (header/body/footer, `--uix-surface`, `--uix-radius-lg`, `--uix-shadow-sm`) and `stat-tile.css` (value `--uix-text-data-hero`, trend pill tone success/danger, icon, optional inline sparkline slot). Checklist; commit.

### Task 4.2: Badge / chip / status-pill
- [ ] `status-pill.css` — `tone` API (`--tone-bg`/`--tone-fg` set per modifier from status/`*-bg`/`*-fg` tokens): status (open/in-progress/resolved/closed) + priority (low→critical) + SLA. Dot variant. Checklist; commit `feat(status-pill): status/priority/SLA tones`.

### Task 4.3: Data table (EXEMPLAR — full code; zebra, sticky header, selection, sort, density, row actions)

**Files:** `styles/components/table.css`; example + sort/select logic in `app.js`.

- [ ] **Step 1 (TDD): sort + filter helpers** in `app.test.js`:
```js
import { sortRows, filterRows } from './app.js';
const rows = [{id:1,status:'open',type:'incident',title:'B'},{id:2,status:'closed',type:'request',title:'A'}];
test('sortRows by title asc', () => assert.deepEqual(sortRows(rows,'title','asc').map(r=>r.id), [2,1]));
test('filterRows by status set', () => assert.deepEqual(filterRows(rows,{status:new Set(['open'])}).map(r=>r.id), [1]));
test('filterRows empty set = no filter', () => assert.equal(filterRows(rows,{status:new Set()}).length, 2));
```
Run (FAIL) → implement pure `sortRows`/`filterRows` → run (PASS).

- [ ] **Step 2: Write `table.css`** — `.uix-table` (width:100%, border-collapse:separate, `--uix-text-body`); sticky `thead` (`position:sticky;top:0;background:var(--uix-surface);box-shadow:0 1px 0 var(--uix-border)`); `tbody tr` height `--uix-row-h`; **zebra** `tbody tr:nth-child(even){background:var(--uix-row-alt)}` with base `--uix-row`; `tr:hover{background:var(--uix-bg-hover)}`; `tr[aria-selected]{background:var(--uix-brand-muted)}`; density modifier `.uix-table--compact tbody tr{height:var(--uix-row-h-compact)}`; sortable `th[aria-sort]` caret; **pinned group** `.uix-table__pinned{position:sticky;top:var(--uix-row-h);background:var(--uix-row-pinned-bg)}`; row-actions cell (reveal on hover); selection checkbox column; scroll container uses themed scrollbars (inherited). Full rule set written out.
- [ ] **Step 3: Wire `app.js`** — header click → `sortRows` + update `aria-sort`; select-all + per-row selection; density toggle; zebra toggle (class).
- [ ] **Step 4: Showcase example** — an incidents table (id/title/status/type/assignee/SLA) with zebra on, sortable headers, selection, density toggle.
- [ ] **Step 5: Verify** checklist + sticky header on scroll + zebra/selected/hover precedence correct in both themes. **Commit** `feat(table): sortable, selectable, zebra, sticky, density, row actions`.

### Task 4.4: Table toolbar + two-row filter bar + pinning
- [ ] **Step 1 (TDD):** extend `app.test.js` — `togglePin` keeps order; pinned rows always present after `filterRows`+pin merge (write `mergePinned(rows, pinnedIds)` returning pinned-first, deduped). FAIL → implement → PASS.
- [ ] **Step 2:** `table-toolbar.css` + filter-bar markup — toolbar row (search · saved-views select · column-visibility menu · density · export) and **two filter rows** (Status chips row, Type chips row) using multi-select chips with counts; active filters echoed as removable chips + "Clear all".
- [ ] **Step 3:** `app.js` — chip multi-select → `filterRows`; **pin toggle** per row → `mergePinned` → render Pinned group; persist pinned set + active filters to localStorage.
- [ ] **Step 4: Verify** — filtering by status/type narrows rows; pinned incident stays in the top band even when filtered out; persists across reload. **Commit** `feat(table): two-row status/type filter bar + row pinning + persistence`.

### Tasks 4.5–4.15 (specified)
- [ ] **4.5 list & list-item** — entity rows (icon, title, meta, trailing action); selectable.
- [ ] **4.6 description / key-value list** — two-column record fields; responsive stack.
- [ ] **4.7 avatar / avatar-group / user-chip** — sizes, initials fallback, status dot, overflow `+N`.
- [ ] **4.8 tooltip** — Popover-API anchored; `pop-in`; delay; arrow.
- [ ] **4.9 progress bar + ring** — determinate/indeterminate; ring via SVG `stroke-dasharray`.
- [ ] **4.10 meter / utilization bar** — segments + threshold tones (success/warning/danger) like the spec's rate bars.
- [ ] **4.11 timeline / activity feed** — connector line, event nodes, actor + timestamp.
- [ ] **4.12 tree view** — nested disclosure (reuse navgroup grid-rows pattern), guide lines, `aria-expanded`.
- [ ] **4.13 calendar** — month grid, today/selected/range, weekday header (shared by date pickers 2.16).
- [ ] **4.14 empty state + skeleton loaders** — empty (icon, title, action); skeleton (`uix-shimmer`, sized blocks); skeleton table rows.
- [ ] **4.15 charts** — `chart.css` container styling + **sample SVGs** for area/line (income-vs-expenses), bar (net-savings), donut (spending-by-category), sparkline, horizontal-bar — colored from `--uix-chart-*`; legend component. No JS charting engine; document pairing with uPlot/Chart.js/ECharts via the chart vars.

**End of Phase 4:** §5.4 populated incl. the full incident table experience. Merge.

---

## Phase 5 — Feedback & overlays (spec §5.5) — includes the Peek drawer exemplar

### Task 5.1: Overlay enter/exit pattern + alert + toast
- [ ] `alert.css` (inline banner, 4 tones, icon, dismiss). `toast.css` + `app.js` toast queue (TDD `pushToast`/`dismissToast` queue logic first): stack, `slide-in-right`+fade, swipe/auto-dismiss, `aria-live`. Commit each.

### Task 5.2: Modal `<dialog>` + popover + confirm
- [ ] `modal.css` using native `<dialog>` + `::backdrop`; enter via `@starting-style` (opacity 0 + `translateY(8px)`/`scale(.98)`), exit via `transition-behavior:allow-discrete`, `--uix-dur-slow`; focus trap is native to `<dialog>`. `confirm-dialog` variant (destructive). `popover.css` generic anchored surface. Verify reduced-motion + Esc close + focus return. Commit.

### Task 5.3: Drawer + Side-Peek (EXEMPLAR — full code; the §5.8 peek pattern, reused by table rows + sidebar items)

**Files:** `styles/components/drawer.css`, `styles/components/peek.css`; peek navigation in `app.js`.

- [ ] **Step 1 (TDD): peek index navigation** in `app.test.js`:
```js
import { peekStep } from './app.js';
test('peekStep clamps at ends', () => {
  assert.equal(peekStep(0, +1, 3), 1);
  assert.equal(peekStep(2, +1, 3), 2);   // clamp at last
  assert.equal(peekStep(0, -1, 3), 0);   // clamp at first
});
```
FAIL → `export const peekStep = (i, d, n) => Math.min(n-1, Math.max(0, i+d));` → PASS.

- [ ] **Step 2: Write `peek.css`** — right-anchored panel `width:var(--uix-peek-w)`, `background:var(--uix-surface)`, `box-shadow:var(--uix-shadow-overlay)`, header (title+status+close), scrollable body, footer actions; dimmed `::backdrop`; built on `<dialog>` (or Popover) with `@starting-style { transform:translateX(100%) }` enter and `allow-discrete` exit, `--uix-dur-slow` `--uix-ease-out` in / `--uix-ease-in` out.
- [ ] **Step 3: `app.js`** — open peek from `[data-uix-peek]` (table row affordance / Space on selected row / sidebar item); `↑/↓` calls `peekStep` to load prev/next record into the same panel; Esc closes; title link navigates (does NOT peek).
- [ ] **Step 4: Showcase** — peek an incident from the Phase-4 table and from a sidebar item; show keyboard hints.
- [ ] **Step 5: Verify** checklist + slide animation + reduced-motion fallback (opacity only) + ↑/↓ moves peek + focus trapped. **Commit** `feat(peek): side-peek drawer reused by table + sidebar`.

### Task 5.4: Spinner / progress overlay
- [ ] `spinner.css` (reuse `uix-spin`) + full-surface progress overlay. Commit.

**End of Phase 5:** §5.5 populated; peek works from table + sidebar. Merge.

---

## Phase 6 — CRM/ITSM composites (spec §5.6)

Each composite reuses Phase 2–5 components; task = layout CSS + showcase + checklist.

- [ ] **6.1 detail layout** — two-column record (main + side meta panel); responsive collapse.
- [ ] **6.2 ticket/case row** — list-item specialization: id, title, status-pill, priority, assignee, SLA, peek affordance.
- [ ] **6.3 priority/SLA indicators** — SLA timer + breach state (`--uix-danger`), priority glyphs.
- [ ] **6.4 assignment / owner chip** — user-chip + assign menu.
- [ ] **6.5 comments thread + composer** — entries, @mention highlight, composer with actions.
- [ ] **6.6 kanban board / column** — columns with counts, draggable cards (HTML drag + View-Transition reorder fallback), WIP styling.
- [ ] **6.7 filter bar / saved filters** — promote the table filter bar as a standalone + saved-view chips.
- [ ] **6.8 inbox master-detail** — list pane + detail pane (peek's persistent sibling).
- [ ] **6.9 notification center** — popover panel, grouped/read-unread, mark-all.
- [ ] **6.10 audit-log entry** — actor, action, diff, timestamp (relative-time).
- [ ] **6.11 label / tag taxonomy** — colored labels (chart palette), label picker.
- [ ] **6.12 contact / customer card (CRM)** — avatar, fields, quick actions.
- [ ] **6.13 deal / pipeline stage** — stage bar + value; reuse steps/meter.
- [ ] **6.14 attachment list** — file rows (type icon, size, download/remove).

**End of Phase 6:** §5.6 populated. Merge.

---

## Phase 7 — Utility/typography + polish, a11y & motion tuning

- [ ] **7.1 §5.7 utility** — `code`/`kbd`, blockquote, lists, dividers, keyboard-shortcut chips, inline status dots. Commit.
- [ ] **7.2 Accessibility audit** — run the `ui-design:accessibility-audit` skill / `chrome-devtools-mcp:a11y-debugging` over `index.html`: every interactive element keyboard-reachable, roles/labels correct (menus/tabs/dialog/combobox per APG), focus order, contrast pass for ALL token pairs (fix any failing shade — esp. `warning`). Fix findings; commit.
- [ ] **7.3 Motion tuning** — invoke `anthropic-skills:emil-design-eng` + `ui-design:interaction-design`: review every transition for purpose/duration/easing, remove anything decorative, confirm exits faster than entrances, verify reduced-motion across all overlays. Commit.
- [ ] **7.4 Cross-browser scrollbars + overlay support** — verify themed scrollbars (WebKit + Firefox) and that `@starting-style`/`allow-discrete`/Popover/`<dialog>` degrade gracefully where unsupported (overlays still open/close, just without the transition). Commit.
- [ ] **7.5 Optional Playwright smoke** — using the playwright MCP, screenshot `index.html` in light+dark and assert no console errors; capture per-section screenshots for the README. Commit.
- [ ] **7.6 README finalize + manifest** — fill the consumption guide with real copy-paste examples; add the project's row to `D:\Development\Projects\README.md` manifest (governance §2). Commit.

**End of Phase 7:** full style guide, audited, both themes, motion-polished. Merge `main`; tag `v2.0.0`.

---

## Self-Review (completed against the spec)

**Spec coverage:** §3 tokens → 0.3; §4 theming → 0.4/0.6 (no-flash + dual selector); §5.1 → 0.7; §5.2 → Phase 2 (2.1–2.17); §5.3 → Phase 3 (incl. sidebar 3.2); §5.4 → Phase 4 (table 4.3–4.4, charts 4.15); §5.5 → Phase 5 (peek 5.3); §5.6 → Phase 6; §5.7 → 7.1; §5.8 peek/pin/favorites/icons → 3.2 (fav) + 4.4 (pin) + 5.3 (peek) + 0.6 (icons); §5.9 motion → Phase 1 + per-component + 7.3; §6 showcase → 0.6/0.7; §7 a11y → checklist + 7.2; §8 tooling → README (0.1/7.6). No gaps.

**Placeholder scan:** foundation + exemplars carry full code; component tasks specify exact files/variants/states/tokens/markup + the shared verification checklist (not "handle edge cases"). Acceptable for a repetitive UI library where the pattern is shown in full by the exemplars.

**Type/name consistency:** JS helpers referenced consistently — `resolveTheme`, `nextTheme`, `getContrast`, `toggleSet`, `sortRows`, `filterRows`, `mergePinned`, `pushToast`/`dismissToast`, `peekStep`. CSS layer names consistent (`uix.tokens/base/util/motion/components`). Token names match the spec's §3 verbatim.
