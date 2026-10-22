/* HAR-1576 — no text character stands in for an icon.
 *   1. the guard (scripts/glyph-icons.mjs) finds nothing outside its allowlist in the React
 *      components, the stylesheets and the docs markup, and the allowlist has no stale entry;
 *   2. it can fail, with file and line, on a × in a button and a ▾ in a CSS `content:`;
 *   3. Toast, Pagination, MetricInput, SavedViewMenu and Steps render the icon set's SVGs where
 *      they rendered × « ‹ › + − ★ and !;
 *   4. every CSS mask in the stylesheets is the named Lucide glyph (scripts/glyph-mask.mjs), so a
 *      mask cannot drift from the icon set.
 * Centring and forced colours are measured in Chromium by tests/a11y/glyph-icons.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { collect, readAllow, scan } from '../scripts/glyph-icons.mjs';
import { maskUrl } from '../scripts/glyph-mask.mjs';
import { MetricInput, Pagination, SavedViewMenu, Step, Steps, Toast } from '../dist/index.js';

test('the guard finds no glyph outside the allowlist, and no stale allowlist entry', async () => {
  const all = await collect();
  const allow = readAllow();
  const allowed = new Set(allow.map((a) => a.key));
  assert.deepEqual(all.filter((hit) => !allowed.has(hit.key)).map((hit) => `${hit.file}:${hit.line} ${hit.rule} ${hit.glyph}`), []);
  const live = new Set(all.map((hit) => hit.key));
  assert.deepEqual(allow.filter((a) => !live.has(a.key)).map((a) => a.key), [], 'the allowlist only shrinks');
  for (const a of allow) assert.ok(a.why && a.why.length > 20, `${a.key} says why`);
});

test('the guard fails, with the line, on a × button and a ▾ in CSS content', () => {
  assert.deepEqual(scan('<div>\n  <button type="button" aria-label="Close">×</button>\n</div>', 'react'), [{ line: 2, rule: 'jsx-text', glyph: '×' }]);
  assert.deepEqual(scan(".a { color: red; }\n.b::after { content: \"▾\"; }", 'css'), [{ line: 2, rule: 'css-content', glyph: '▾' }]);
  assert.deepEqual(scan('<span class="uix-step__marker">✓</span>', 'docs'), [{ line: 1, rule: 'docs-slot', glyph: '✓' }]);
  assert.deepEqual(scan("render({ content: '‹' })", 'react'), [{ line: 1, rule: 'string', glyph: '‹' }]);
  // prose and a Kbd-style legend inside a sentence are not flagged
  assert.deepEqual(scan('<p>Press ↑ to move up.</p>', 'docs'), []);
});

const svgOnly = (html, cls) => {
  const re = new RegExp(`<(button|a|span)[^>]*class="(?:[^"]* )?${cls}(?: [^"]*)?"[^>]*>(.*?)</\\1>`, 'g');
  const found = [...html.matchAll(re)].map((m) => m[2]);
  assert.ok(found.length > 0, `${cls} rendered`);
  for (const inner of found) {
    assert.match(inner, /^<svg [^>]*class="uix-icon"/, `${cls} holds an icon: ${inner}`);
    assert.doesNotMatch(inner.replace(/<[^>]+>/g, ''), /\S/, `${cls} holds no text`);
  }
  return found;
};

test('Toast, Pagination, MetricInput, SavedViewMenu and Steps draw the icon set, not text', () => {
  svgOnly(renderToStaticMarkup(h(Toast, { title: 'Saved', onClose() {} })), 'uix-toast__close');
  const pages = renderToStaticMarkup(h(Pagination, { page: 3, pageCount: 9, onChange() {} }));
  // page numbers are text by right; every other pagination button holds only an icon
  svgOnly(pages.replace(/>\d+</g, '><svg class="uix-icon"></svg><'), 'uix-pagination__btn');
  assert.match(pages, /aria-label="Previous page"><svg[^>]*><path d="m15 18-6-6 6-6"><\/path><\/svg>/);
  assert.match(pages, /aria-label="Next page"><svg[^>]*><path d="m9 18 6-6-6-6"><\/path><\/svg>/);
  const cursor = renderToStaticMarkup(h(Pagination, { mode: 'cursor', hasPrevious: true, hasNext: true, onFirst() {}, onPrevious() {}, onNext() {} }));
  assert.match(cursor, /aria-label="First page"><svg[^>]*><path d="m11 17-5-5 5-5"><\/path><path d="m18 17-5-5 5-5"><\/path><\/svg>/);
  const metric = renderToStaticMarkup(h(MetricInput, { label: 'Threshold', value: 5, onValueChange() {} }));
  assert.deepEqual(svgOnly(metric, 'uix-metric-input__step').map((s) => s.match(/d="([^"]+)"/g).join(' ')), ['d="M5 12h14" d="M12 5v14"', 'd="M5 12h14"']);
  svgOnly(renderToStaticMarkup(h(SavedViewMenu, { items: [{ id: 'a', label: 'Mine', pinned: true }], onSelect() {}, onPinChange() {} })), 'uix-saved-views__pin');
  const steps = renderToStaticMarkup(h(Steps, { label: 'Import' }, h(Step, { title: 'Upload', state: 'error' })));
  assert.match(steps, /<span class="uix-step__marker"[^>]*><svg [^>]*class="uix-icon"[^>]*><path d="M18 6 6 18"><\/path><path d="m6 6 12 12"><\/path><\/svg><\/span>/);
});

test('every CSS mask is the named glyph of the icon set', () => {
  const dir = new URL('../../tokens/styles/components/', import.meta.url);
  const css = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(new URL(f, dir), 'utf8')]));
  const expected = [
    ['table.css', 'arrow-up-down'], ['table.css', 'arrow-up'], ['table.css', 'arrow-down'], ['select.css', 'chevron-down'],
    ['icon.css', 'chevron-down'], ['icon.css', 'arrow-up'], ['icon.css', 'arrow-down'], ['icon.css', 'arrow-up-down'], ['icon.css', 'x'],
  ];
  for (const [file, glyph] of expected) assert.ok(css[file].includes(maskUrl(glyph)), `${file} masks ${glyph}`);
  // and no stylesheet carries a mask that is not one of the icon set's glyphs
  const known = new Set(expected.map(([, g]) => maskUrl(g)));
  for (const [file, text] of Object.entries(css)) {
    for (const m of text.matchAll(/mask(?:-image)?:\s*(url\("data:image\/svg\+xml,[^"]+"\))/g)) assert.ok(known.has(m[1]), `${file}: a mask that is not an icon-set glyph`);
  }
});
