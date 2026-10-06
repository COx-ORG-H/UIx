/* HAR-996 — the UIx icon set (`@tensor_1/react/icons`): every glyph renders, the a11y
 * contract (decorative vs labelled), sizes and tones, the Lucide-name aliases the products
 * migrate from, and that importing one icon does not pull in the set.
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const icons = await import('../dist/icons.js');
const names = JSON.parse(readFileSync(resolve(here, '../etc/icon-names.json'), 'utf8')).names;

test('every glyph renders through <Icon name> as a 24-unit stroked SVG with content', () => {
  const glyphs = Object.keys(icons.ICON_GLYPHS);
  assert.ok(glyphs.length >= 230, `the set covers the products' ${glyphs.length} glyphs`);
  for (const name of glyphs) {
    const html = renderToStaticMarkup(h(icons.Icon, { name }));
    assert.match(html, /^<svg [^>]*viewBox="0 0 24 24"[^>]*stroke="currentColor"/, name);
    assert.match(html, /<(path|circle|rect|line|polyline|polygon|ellipse)\b/, `${name} draws something`);
  }
});

test('every Lucide name the products import has a <Name>Icon component on the glyph it maps to', () => {
  for (const [lucideName, { component, glyph }] of Object.entries(names)) {
    const Component = icons[component];
    assert.ok(Component, `${lucideName} → ${component} is exported`);
    assert.equal(
      renderToStaticMarkup(h(Component)),
      renderToStaticMarkup(h(icons.Icon, { name: glyph })),
      `${component} draws ${glyph}`,
    );
  }
  assert.equal(icons.AlertTriangleIcon, icons.TriangleAlertIcon, 'an old Lucide name is the same component');
});

test('decorative by default, an image with a name when labelled', () => {
  const decorative = renderToStaticMarkup(h(icons.ShieldCheckIcon));
  assert.match(decorative, /aria-hidden="true"/);
  assert.doesNotMatch(decorative, /role=/);
  assert.match(decorative, /focusable="false"/);
  const named = renderToStaticMarkup(h(icons.ShieldCheckIcon, { label: 'Verified' }));
  assert.match(named, /role="img"/);
  assert.match(named, /aria-label="Verified"/);
  assert.doesNotMatch(named, /aria-hidden/);
});

test('size tokens, pixel sizes, tones, className and stroke width', () => {
  assert.match(renderToStaticMarkup(h(icons.PlusIcon)), /class="uix-icon"/, 'md is the default, no modifier');
  assert.match(renderToStaticMarkup(h(icons.PlusIcon, { size: 'sm' })), /class="uix-icon uix-icon--sm"/);
  assert.match(renderToStaticMarkup(h(icons.PlusIcon, { size: 'lg', tone: 'danger', className: 'size-4' })), /class="uix-icon uix-icon--lg uix-icon--danger size-4"/);
  assert.match(renderToStaticMarkup(h(icons.PlusIcon, { size: 14 })), /style="width:14px;height:14px"/);
  assert.match(renderToStaticMarkup(h(icons.PlusIcon, { size: '1.25em' })), /style="width:1.25em;height:1.25em"/);
  assert.match(renderToStaticMarkup(h(icons.PlusIcon, { strokeWidth: 1.5 })), /stroke-width="1.5"/);
});

test('components forward refs and have display names', () => {
  assert.equal(icons.ShieldCheckIcon.displayName, 'ShieldCheckIcon');
  const ref = createRef();
  const Probe = icons.createIcon('Probe', [['circle', { cx: 12, cy: 12, r: 4 }]]);
  assert.match(renderToStaticMarkup(h(Probe, { ref })), /<circle cx="12" cy="12" r="4"><\/circle>/);
});

test('importing one icon keeps the bundle to that glyph', async () => {
  const shield = icons.ICON_GLYPHS['shield-check'][0][1].d;
  const trash = icons.ICON_GLYPHS['trash-2'][0][1].d;
  const out = await build({
    stdin: { contents: "import { ShieldCheckIcon } from './dist/icons.js'; console.log(ShieldCheckIcon);", resolveDir: resolve(here, '..'), loader: 'js' },
    bundle: true, write: false, format: 'esm', minify: true, external: ['react', 'react/jsx-runtime'], logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  assert.ok(code.includes(shield), 'the imported glyph is in the bundle');
  assert.ok(!code.includes(trash), 'other glyphs are dropped');
  assert.ok(code.length < 3000, `one icon bundles to ${code.length} bytes (under 3 KB)`);
});
