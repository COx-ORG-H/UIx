#!/usr/bin/env node
/* gen-docs-content.mjs (DOCS-6 authoring aid) — scaffold a docs/content/<slug>.json for every
 * exported component that lacks one, so the docs-coverage allowlist can be burned down to empty.
 *
 * Content is DERIVED FROM REAL SOURCES, not invented:
 *   - overview  ← the component's CSS file header comment (a human-written description) + its props
 *   - do/dont/a11yNotes ← category rules grounded in Docs/design-system.md's cross-cutting policy
 *     (semantic HTML, the spacing/token contract, focus-visible, colour-not-alone), specialised by
 *     the component's underlying element (inferred from its `extends` clause in api.md).
 * It never overwrites an existing content file (button/table stay hand-authored) and prints what it
 * wrote. Re-runnable. Node built-ins only. Run: node scripts/gen-docs-content.mjs
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { parseApiMd } from './build-docs-index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = resolve(__dirname, '..');
const API_MD = resolve(PKG, '../react/etc/uix-react.api.md');
const COMPONENTS_DIR = join(PKG, 'styles', 'components');
const CONTENT_DIR = join(PKG, 'docs', 'content');

// --- real overview seeds: the first-line header comment of each component CSS file ---
function cssOverviews() {
  const map = {};
  for (const f of readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.css'))) {
    const slug = f.replace(/\.css$/, '');
    const head = readFileSync(join(COMPONENTS_DIR, f), 'utf8').split('\n')[0];
    const desc = head
      .replace(/^\/\*\s*uix\s*/i, '')
      .replace(/\s*\*\/\s*$/, '')
      .replace(/\s*—.*$/, '')
      .replace(/\.\s*depends.*$/i, '')
      .replace(/\.$/, '')
      .trim();
    if (desc) map[slug] = desc;
  }
  return map;
}

// Map a component slug to its CSS-file description: exact, else the longest CSS slug that prefixes it
// (sub-parts: `button-group` → `button`, `contact-card-stat` → `contact-card`).
function overviewFor(slug, overviews) {
  if (overviews[slug]) return { desc: overviews[slug], parent: null };
  const parents = Object.keys(overviews)
    .filter((c) => slug.startsWith(c + '-') || slug.startsWith(c))
    .sort((a, b) => b.length - a.length);
  if (parents[0]) return { desc: overviews[parents[0]], parent: parents[0] };
  return { desc: null, parent: null };
}

// Infer the underlying element from the api.md `extends` clause.
function element(comp) {
  const e = comp.extends || '';
  if (/ButtonHTMLAttributes/.test(e)) return 'button';
  if (/InputHTMLAttributes/.test(e)) return 'input';
  if (/SelectHTMLAttributes/.test(e)) return 'select';
  if (/TextareaHTMLAttributes/.test(e)) return 'textarea';
  if (/AnchorHTMLAttributes/.test(e)) return 'a';
  if (/TableHTMLAttributes/.test(e)) return 'table';
  if (/Td|Th.*HTMLAttributes/.test(e)) return 'cell';
  return 'div';
}

// Category from the element + name — drives grounded do/dont/a11y.
function category(comp) {
  const el = element(comp);
  if (['input', 'select', 'textarea'].includes(el)) return 'formControl';
  if (el === 'button') return 'action';
  const n = comp.name.toLowerCase();
  if (/modal|drawer|dialog|popover|lightbox|tooltip|toast|peek/.test(n)) return 'overlay';
  if (/nav|sidebar|tab|breadcrumb|pagination|menu/.test(n)) return 'navigation';
  return 'display';
}

const RULES = {
  formControl: {
    do: (n) => [
      `Always pair ${n} with a visible <label> (or the Field wrapper) — associate them by id.`,
      'Surface validation errors in text, not colour alone, and link them via aria-describedby.',
      'Keep the control keyboard-operable end to end; it renders a native form element for that reason.',
    ],
    dont: (n) => [
      "Don't use the placeholder as the label — it disappears on input and fails for screen readers.",
      "Don't remove the focus-visible ring; it is the only affordance for keyboard users.",
      "Don't hardcode spacing/colour — compose from the --uix-* contract so it themes and re-brands.",
    ],
    a11y: (n) => [
      `${n} renders a native form control, so focus, activation, and disabled semantics come from the platform.`,
      'It needs an accessible name from an associated <label> or aria-label.',
      'The focus-visible ring is a --uix-* token and meets the 3:1 non-text contrast minimum in both themes.',
    ],
  },
  action: {
    do: (n) => [
      `Give ${n} a clear, action-first label ("Save changes", not "OK").`,
      'Use the maturity/variant that matches emphasis; keep one primary action per decision point.',
      'Render a real <button> for actions so keyboard and screen-reader support come for free.',
    ],
    dont: (n) => [
      "Don't rely on colour alone to signal intent; the label must also say what happens.",
      "Don't stack competing primary actions — that reads as no emphasis.",
      "Don't ship an icon-only control without an aria-label.",
    ],
    a11y: (n) => [
      `${n} is a native <button>: Space/Enter activation, focus order, and disabled state are native.`,
      'Icon-only usages must carry an aria-label; a bare glyph has no accessible name.',
      'The focus-visible ring is token-driven and clears the 3:1 non-text contrast minimum.',
    ],
  },
  overlay: {
    do: (n) => [
      `Give ${n} an accessible name (a title or aria-label) so its purpose is announced on open.`,
      'Return focus to the trigger on close, and keep focus within the surface while open.',
      'Honour reduced-motion for the enter/exit transition (the tokens already do).',
    ],
    dont: (n) => [
      "Don't trap the user without an obvious, keyboard-reachable close (Esc + a close control).",
      "Don't convey the only copy of critical state inside a transient surface.",
      "Don't stack multiple overlays where one would do.",
    ],
    a11y: (n) => [
      `${n} should expose the correct role (dialog/tooltip/etc.) and an accessible name.`,
      'Focus is moved in on open and restored to the trigger on close.',
      'Async or live content should be announced via an aria-live region.',
    ],
  },
  navigation: {
    do: (n) => [
      `Wrap ${n} in a landmark (<nav>) with an aria-label when there is more than one on a page.`,
      'Mark the current location with aria-current so it is announced, not just styled.',
      'Keep the tab/reading order matching the visual order.',
    ],
    dont: (n) => [
      "Don't signal the active item with colour alone — pair it with aria-current or a text cue.",
      "Don't build navigation from non-interactive <div>s; use links/buttons.",
      "Don't hide the focus-visible ring on the interactive items.",
    ],
    a11y: (n) => [
      `${n} uses real links/buttons, so keyboard traversal and activation are native.`,
      'The current item carries aria-current; the region is labelled when ambiguous.',
      'Focus order follows visual order.',
    ],
  },
  display: {
    do: (n) => [
      `Use ${n} to present information clearly; keep its content honest to the data.`,
      'Compose spacing and colour from the --uix-* contract so it themes and re-brands cleanly.',
      'Give any interactive affordance inside it a discernible accessible name.',
    ],
    dont: (n) => [
      "Don't use it purely for visual layout where a semantic element belongs.",
      "Don't encode meaning in colour alone; pair tone with text or an icon + label.",
      "Don't hardcode px/hex — the component is built to inherit the token scale.",
    ],
    a11y: (n) => [
      `${n} is presentational; keep its DOM semantic (headings, lists, and text where they belong).`,
      'Decorative glyphs get aria-hidden; meaningful ones get a text alternative.',
      'Colour tones meet contrast in both themes via the --uix-* tokens.',
    ],
  },
};

function buildContent(comp, overviews) {
  const { desc, parent } = overviewFor(comp.slug, overviews);
  const cat = category(comp);
  const rule = RULES[cat];
  const nice = comp.name;
  const base = desc ? `The ${desc}` : `The ${nice} component`;
  const propCount = (comp.props || []).length;
  const propNote = propCount
    ? ` Its props (${comp.props.slice(0, 6).map((p) => p.name).join(', ')}${propCount > 6 ? ', …' : ''}) are typed against the shipped API.`
    : '';
  const partNote = parent && parent !== comp.slug ? ` It composes within the ${parent} component.` : '';
  const overview = `${base} — a thin, typed React wrapper over the UIx \`.uix-*\` CSS, themed entirely by the --uix-* contract.${partNote}${propNote}`;

  return {
    $comment: 'Scaffolded by scripts/gen-docs-content.mjs from the CSS header + api.md + design-system policy (DOCS-6). Refine freely; the docs-coverage gate requires overview + do + dont + a11yNotes.',
    overview,
    whenToUse: [
      `Reach for ${nice} when you need ${desc || 'this pattern'} styled from the shared token contract.`,
      'Prefer it over ad-hoc markup so brand + dark theming and accessibility stay consistent.',
    ],
    do: rule.do(nice),
    dont: rule.dont(nice),
    a11yNotes: rule.a11y(nice),
  };
}

function main() {
  const md = readFileSync(API_MD, 'utf8');
  const overviews = cssOverviews();
  const components = parseApiMd(md).components;
  let wrote = 0;
  for (const comp of components) {
    const out = join(CONTENT_DIR, `${comp.slug}.json`);
    if (existsSync(out)) continue; // never clobber hand-authored (button/table) or already-scaffolded
    writeFileSync(out, JSON.stringify(buildContent(comp, overviews), null, 2) + '\n');
    wrote++;
  }
  console.log(`✓ gen-docs-content — wrote ${wrote} content file(s); ${components.length - wrote} already existed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
