// HAR-4609: render the additive TENSOR icon specimen from the built public entry.
// Run after npm run build:all; no product-local SVG copy is needed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from '../dist/icons.js';

const target = new URL('../../tokens/docs/showcase-data.js', import.meta.url);
const names = [
  'Landmark', 'Keyboard', 'ArchiveRestore', 'CalendarSync', 'CheckSquare',
  'FileKey', 'Radar', 'SmilePlus', 'TowerControl', 'UserSearch',
];
const start = '<!-- tensor-icons:start -->';
const end = '<!-- tensor-icons:end -->';
const aliases = JSON.parse(readFileSync(new URL('../etc/icon-names.json', import.meta.url), 'utf8')).names;
const items = names.map((name) => {
  const component = `${name}Icon`;
  const svg = renderToStaticMarkup(h(icons[component], { size: 24 }));
  return `<li class="uix-icon-grid__item">${svg}<code title="${component}">${aliases[name].glyph}</code></li>`;
}).join('');
const section = `${start}<h3>TENSOR adoption icons</h3><p>The same public icon contract, including the CheckSquare alias. Decorative glyphs accompany their visible names.</p><ul class="uix-icon-grid" data-tensor-adoption-icons>${items}</ul>${end}`;
const source = readFileSync(target, 'utf8');
const page = source.match(/"slug": "examples-icons"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!page) throw new Error('examples-icons page not found');
const html = JSON.parse(page[1]);
const stripped = html.includes(start)
  ? html.slice(0, html.indexOf(start)) + html.slice(html.indexOf(end) + end.length)
  : html;
const closing = stripped.lastIndexOf('</section>');
if (closing < 0) throw new Error('icons section closing tag not found');
const next = `${stripped.slice(0, closing).trimEnd()}\n${section}\n${stripped.slice(closing)}`;
writeFileSync(target, source.replace(page[1], () => JSON.stringify(next)));
console.log(`TENSOR icon specimen: ${names.length} public named exports`);
