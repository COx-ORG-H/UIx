import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DoorOpenIcon, IdCardIcon, ICON_GLYPHS } from '../dist/icons.js';

test('DoorOpen preserves the Lucide 1.61 drawing already used by TENSOR', () => {
  const html = renderToStaticMarkup(h(DoorOpenIcon, { size: 24, label: 'Tür öffnen' }));
  assert.match(html, /d="M10 21H2"/);
  assert.match(html, /d="M10 3H7a2 2 0 00-2 2v16"/);
  assert.match(html, /aria-label="Tür öffnen"/);
});

test('IdCard preserves the current portrait and stable public glyph identities remain', () => {
  const html = renderToStaticMarkup(h(IdCardIcon, { size: 24, label: 'Ausweis' }));
  assert.match(html, /cx="9" cy="12" r="3"/);
  assert.match(html, /d="M13 19a4 4 0 00-8 0"/);
  assert.ok(ICON_GLYPHS['building-2']);
  assert.ok(ICON_GLYPHS['trash-2']);
});
