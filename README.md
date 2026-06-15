# uix-styleguide — UIx v2

A **framework-agnostic, build-free style guide** for CRM/ITSM products. Plain HTML + CSS + a little vanilla
JS — open `index.html` in any browser to see every component in light and dark mode; drop the CSS into any
project (HTML, React, Vue, Tailwind, server-rendered — anything) to use it.

It's "UIx v2": the next generation of the house design system. Where **UIx v1** (`../UIx`) is a
React/Next/shadcn token + composite registry locked to that stack, v2 is **stack-neutral** and **standalone**,
while deliberately **reusing v1's `--uix-*` token contract** so the two stay swappable.

## View it

Open `index.html` directly, or serve the folder:

```powershell
# any static server works, e.g.
npx serve .
```

No build step.

## Use it in a project

1. Copy `styles/tokens.css` + `styles/base.css` (+ `styles/motion.css` for animations) and the
   `styles/components/*.css` files you need.
2. Link them in load order: `tokens.css` → `base.css` → `utilities.css` → `motion.css` → `components/*`.
   (Cascade layers make order robust regardless.)
3. Theme: set `data-theme="dark"` (or class `.dark`) on `<html>`. Default follows `prefers-color-scheme`.
   The no-flash snippet in `index.html`'s `<head>` shows how to apply the stored theme before paint.

## Brand a project (override the theme)

The house accent is blue. Override the write-only brand slots; accent, link, ring and brand-muted re-chain:

```css
:root {
  --uix-brand: #16A34A;       /* your accent */
  --uix-brand-fg: #FFFFFF;    /* text on accent fills */
}
:root:where(.dark,[data-theme="dark"]) { --uix-brand: #22C55E; }
```

Override **values** freely; reuse the `--uix-*` **names** (never invent new ones — that's the contract).

## Tokens

All design decisions live in `styles/tokens.css` as `--uix-*` custom properties (surfaces, text, accent,
status, an 8-hue chart palette, type scale, radii, elevation, motion, layout dims, scrollbars, peek width),
declared light on `:root` and dark on `:root:where(.dark,[data-theme="dark"])`. Values are derived from the
"Square UI" template; names match UIx v1.

## Relationship to UIx v1 & versioning

This is a separate project (its own git repo) that shares the token contract — **not** a `-v2` folder copy.
Per the workspace directory-governance, versions live in git, not folder suffixes; if v2 supersedes v1 in
projects, v1 moves to `_Archive`.

## Forward path (not built yet)

A small [Style Dictionary](https://styledictionary.com) step can later emit the same tokens to
JSON / SCSS / Tailwind `@theme` from one source — the bridge back to v1's Tailwind world and other stacks.

## Fonts & icons

Fonts: **Inter** (body) + **IBM Plex Sans** (headings) + **IBM Plex Mono**, loaded via Google Fonts
(`<link>` in `index.html`). Icons are **lucide**, inline SVG, `currentColor`, sized via `--uix-icon-*`.
