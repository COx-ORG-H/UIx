// HAR-4619: generate the geometry specimen from the built public package entry.
import { readFileSync, writeFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Avatar, PresenceDot } from '../dist/index.js';

const target = new URL('../../tokens/docs/showcase-data.js', import.meta.url);
const start = '<!-- numeric-avatar:start -->';
const end = '<!-- numeric-avatar:end -->';
// A synthetic local image fixture: no person, network request or image service.
const image = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="gainsboro"/><circle cx="24" cy="17" r="8" fill="slategray"/><path d="M8 48V39a16 16 0 0 1 32 0v9" fill="slategray"/></svg>')}`;
const rows = [24, 28, 32, 36, 40, 48].map((size) => h('li', { key: size, 'data-numeric-avatar': size, style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-3)', alignItems: 'center' } },
  h('code', null, `${size} px`), h(Avatar, { size, 'data-kind': 'initials', 'aria-hidden': true }, 'AM'), h(Avatar, { size, src: image, alt: 'Synthetisches Profilbild', 'data-kind': 'image' })));
const names = ['sm', 'md', 'lg', 'xl', '2xl'].map((size) => h('span', { key: size, 'data-named-avatar': size }, h(Avatar, { size, 'aria-hidden': true }, 'AM')));
const dots = [['online', 'Verfügbar'], ['busy', 'Beschäftigt'], ['away', 'Abwesend'], ['offline', 'Abgemeldet']].map(([presence, label]) => h(PresenceDot, { key: presence, presence, label, size: 8, 'data-sized-presence': presence }));
const htmlFragment = renderToStaticMarkup(h('div', { 'data-numeric-avatar-specimen': '', style: { display: 'grid', gap: 'var(--uix-space-4)' } },
  h('ul', { style: { display: 'grid', gap: 'var(--uix-space-3)', padding: 0, listStyle: 'none' } }, rows),
  h('p', null, 'Benannte Größen bleiben unverändert:'), h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-3)', alignItems: 'center' } }, names),
  h('p', null, 'Anwesenheit mit deutschem Namen und 8 px:'), h('div', { style: { display: 'flex', gap: 'var(--uix-space-3)' } }, dots),
  h(PresenceDot, { presence: 'online', label: null, size: 8, 'data-sized-decorative': '' })));
const section = `${start}<h3>Explicit avatar and presence sizes</h3><p>Avatar size accepts a named kit size or positive pixels; numeric dimensions scale initials. PresenceDot size accepts positive pixels. Named sizes and defaults stay compatible. Invalid numeric sizes retain safe defaults. Set label to null when a presence state is already written beside the marker.</p>${htmlFragment}${end}`;
const source = readFileSync(target, 'utf8');
const page = source.match(/"slug": "examples-data-display"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!page) throw new Error('data display gallery not found');
const html = JSON.parse(page[1]);
const stripped = html.includes(start) ? html.slice(0, html.indexOf(start)) + html.slice(html.indexOf(end) + end.length) : html;
const closing = stripped.lastIndexOf('</section>');
if (closing < 0) throw new Error('data display closing section not found');
const next = `${stripped.slice(0, closing).trimEnd()}\n${section}\n${stripped.slice(closing)}`;
writeFileSync(target, source.replace(page[1], () => JSON.stringify(next)));
console.log('Numeric Avatar/PresenceDot public specimens rendered');
