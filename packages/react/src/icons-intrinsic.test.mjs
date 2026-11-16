import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import * as intrinsic from '../dist/icons-intrinsic.js';
import { createIcon, ICON_GLYPHS, XIcon } from '../dist/icons.js';

test('a named intrinsic icon tree-shakes the unused family', async () => {
  const result = await build({ stdin: { contents: "export { XIcon } from './dist/icons-intrinsic.js';", resolveDir: fileURLToPath(new URL('../', import.meta.url)) }, bundle: true, format: 'esm', external: ['react'], minify: true, write: false, logLevel: 'silent' });
  const code = result.outputFiles[0].text;
  assert.ok(code.includes('XIcon'));
  assert.ok(!code.includes('DoorOpenIcon'));
  assert.ok(result.outputFiles[0].contents.length < 4000, 'one icon must not ship the glyph map');
});

test('every published intrinsic binding retains its named alias and natural SVG dimensions', () => {
  const names = JSON.parse(readFileSync(new URL('../etc/icon-names.json', import.meta.url), 'utf8')).names;
  assert.ok(Object.keys(names).length > 200, 'the complete requested family must be present');
  for (const { component } of Object.values(names)) {
    assert.ok(intrinsic[component], component);
    const html = renderToStaticMarkup(h(intrinsic[component]));
    assert.match(html, /width="24" height="24"/, component);
    assert.match(html, /class="uix-icon-intrinsic"/, component);
    assert.match(html, /aria-hidden="true"/, component);
  }
});

test('intrinsic numeric dimensions remain SVG attributes so control CSS can own their size', () => {
  const html = renderToStaticMarkup(h(XIcon, { sizeMode: 'intrinsic', size: 14 }));
  assert.match(html, /width="14"/);
  assert.match(html, /height="14"/);
  assert.match(html, /class="uix-icon-intrinsic"/);
  assert.doesNotMatch(html, /style=/);
  const unchanged = renderToStaticMarkup(h(XIcon, { size: 14 }));
  assert.match(unchanged, /style="width:14px;height:14px"/);
  assert.doesNotMatch(unchanged, /uix-icon-intrinsic/);
});

test('intrinsic bindings retain a 24-unit default, including an explicitly undefined size', () => {
  const Bound = createIcon('BoundIcon', ICON_GLYPHS.x, { size: 24, sizeMode: 'intrinsic' });
  for (const props of [{}, { size: undefined }]) assert.match(renderToStaticMarkup(h(Bound, props)), /width="24" height="24"/);
  assert.match(renderToStaticMarkup(h(Bound, { size: '1em' })), /width="1em" height="1em"/);
});

test('intrinsic icons keep raw accessible SVG attributes and title children while decorative icons stay hidden', () => {
  const labelled = renderToStaticMarkup(h(XIcon, { sizeMode: 'intrinsic', 'aria-label': 'Schließen' }));
  assert.match(labelled, /aria-label="Schließen"/);
  assert.doesNotMatch(labelled, /aria-hidden/);
  const title = renderToStaticMarkup(h(XIcon, { sizeMode: 'intrinsic', 'aria-labelledby': 'title' }, h('title', { id: 'title' }, 'Schließen')));
  assert.match(title, /<title id="title">Schließen<\/title>/);
  assert.doesNotMatch(title, /aria-hidden/);
  assert.match(renderToStaticMarkup(h(XIcon, { sizeMode: 'intrinsic' })), /aria-hidden="true"/);
});
