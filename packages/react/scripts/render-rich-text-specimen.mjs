// Regenerates the static specimens on the docs page `examples-rich-text` (RTE-01) from the
// BUILT package, so the styleguide shows exactly the markup the components render.
//
//   npm run build:react   (or: cd packages/react && npx tsup)
//   node packages/react/scripts/render-rich-text-specimen.mjs
//
// The static docs have no React runtime. The editor is rendered in its pre-mount state
// (content shown through the Markdown viewer) with the toolbar in its resting look; the
// live editor, picker and keyboard behaviour run in tests/a11y/rich-text.spec.mjs.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RichTextEditor, RichTextEditorFallback } from '../dist/rich-text.js';
import { Markdown } from '../dist/markdown.js';
import { ReactionBar, buildEmojiData } from '../dist/emoji.js';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const target = join(here, '../../tokens/docs/showcase-data.js');
const START = '<!-- rich-text-specimen:start -->';
const END = '<!-- rich-text-specimen:end -->';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const noop = () => {};
// Pre-mount render: tools are disabled until Tiptap attaches; the specimen shows them at rest.
const resting = (markup) => markup
  .replace(/(<button type="button" data-tool="[^"]+"[^>]*?) disabled=""/g, '$1')
  .replace(/ aria-busy="true"/g, '');

const INCIDENT = [
  '# Payment API latency',
  '',
  'Checkout requests to the **payments API** exceeded the 800 ms objective between 09:12 and 09:47 CET. ✅ Mitigated.',
  '',
  '- [x] Failover to the secondary region',
  '- [ ] Confirm the root cause with the vendor',
  '',
  '| Service | Owner | p95 |',
  '| :------ | :---: | --: |',
  '| Checkout | Team Kassa | 1 240 ms |',
  '| Ledger | Team Buch | 310 ms |',
].join('\n');

const field = resting(renderToStaticMarkup(h(RichTextEditor, {
  id: 'rte-demo-description',
  value: INCIDENT,
  onChange: noop,
  'aria-label': 'Incident description',
  maxLength: 4000,
  onUploadImage: async () => ({ src: '', alt: '' }),
})));

const composer = resting(renderToStaticMarkup(h(RichTextEditor, {
  id: 'rte-demo-note',
  value: '',
  onChange: noop,
  features: 'comment',
  variant: 'composer',
  placeholder: 'Add a work note — type : for emoji',
  onUploadImage: async () => ({ src: '', alt: '' }),
  'aria-label': 'Work note',
  toolbarEnd: h('button', { type: 'button', className: 'uix-btn uix-btn--primary uix-btn--sm' }, 'Add note'),
})));

const fallback = renderToStaticMarkup(h(RichTextEditorFallback, {
  id: 'rte-demo-fallback',
  value: 'Loading the editor… the plain field stays usable.',
  onChange: noop,
  'aria-label': 'Change plan (loading state)',
  maxLength: 500,
}));

const viewer = renderToStaticMarkup(h(Markdown, {
  resolveImageSrc: () => null,
}, [
  '## Rollback runbook',
  '',
  'Use ~~manual SQL~~ the **migration tool** — see [the change record](#rich-text) or https://status.example.test.',
  '',
  '1. Freeze deployments',
  '2. Restore the snapshot',
  '   - verify checksums',
  '',
  '> Approved by the CAB on 17.09.',
  '',
  '```sh',
  'uix-migrate rollback --to 2026-09-16',
  '```',
  '',
  '![Architecture diagram](https://cdn.example.test/diagram.png) is shown as a link unless the host allows the image.',
  '',
  '<script>alert(1)</script> stays literal text.',
].join('\n')));

const reactions = renderToStaticMarkup(h(ReactionBar, {
  reactions: [
    { emoji: '👍', count: 3, reactedByMe: true, names: ['You', 'Ana Petrović', 'Jonas Weber'] },
    { emoji: '👀', count: 1, reactedByMe: false, names: ['Mia Keller'] },
    { emoji: '🎉', count: 2, reactedByMe: false, names: ['Ana Petrović', 'Lukas Braun'] },
  ],
  onToggle: noop,
}));

// The picker renders its grid only while open; this is its open state, statically.
const data = buildEmojiData('en', require('emojibase-data/en/compact.json'), require('emojibase-data/en/messages.json'));
const quick = ['👍', '✅', '👀', '🎉', '❤️'];
const smileys = data.emojis.filter((e) => e.group === 0).slice(0, 24);
const cell = (emoji, index) => `<button type="button" class="uix-emoji-picker__btn" tabindex="${index === 0 ? 0 : -1}" aria-label="${esc(data.names.get(emoji) ?? emoji)}" title="${esc(data.names.get(emoji) ?? emoji)}">${emoji}</button>`;
const picker = `<div class="uix-popover uix-emoji-picker-popover" role="dialog" aria-label="Choose an emoji">`
  + `<div class="uix-emoji-picker uix-emoji-picker--full" lang="en">`
  + `<input type="search" class="uix-input uix-emoji-picker__search" aria-label="Search emoji" placeholder="Search emoji" autocomplete="off"/>`
  + `<div class="uix-emoji-picker__nav" role="group" aria-label="Emoji categories">${data.groups.map((g) => `<button type="button" class="uix-emoji-picker__nav-btn" aria-label="${esc(g.name)}" title="${esc(g.name)}"><span aria-hidden="true">${data.emojis.find((e) => data.groups[e.group] === g)?.emoji ?? ''}</span></button>`).join('')}</div>`
  + `<div class="uix-emoji-picker__grid">`
  + `<section class="uix-emoji-picker__section" aria-labelledby="rte-demo-quick"><h3 id="rte-demo-quick" class="uix-emoji-picker__heading">Frequently used</h3><div class="uix-emoji-picker__cells" role="group" aria-labelledby="rte-demo-quick">${quick.map((e, i) => cell(e, i)).join('')}</div></section>`
  + `<section class="uix-emoji-picker__section" aria-labelledby="rte-demo-smileys"><h3 id="rte-demo-smileys" class="uix-emoji-picker__heading">${esc(data.groups[0].name)}</h3><div class="uix-emoji-picker__cells" role="group" aria-labelledby="rte-demo-smileys">${smileys.map((e) => cell(e.emoji, 1)).join('')}</div></section>`
  + `</div></div></div>`;

const block = (title, text, markup) => `<h3>${title}</h3><p>${text}</p>${markup}`;
const section = START + [
  block('Field', 'The <code>full</code> preset: headings, marks, lists, quote, code, divider, link, table, image (when the host supports uploads), emoji, undo/redo and a markdown source toggle. The toolbar is one tab stop — arrow keys move inside it — and scrolls sideways on narrow screens. The counter counts stored markdown characters.', field),
  block('Composer', 'The <code>comment</code> preset inside <code>Composer</code>: the toolbar shares the bar with the host’s actions (<code>toolbarEnd</code>). Ctrl/Cmd+Enter submits, <code>:</code> opens emoji suggestions. Every preset takes pasted or dropped images when the host passes <code>onUploadImage</code>. Without it, an image paste inserts nothing and the status line says why: the host’s <code>imagesUnavailableReason</code>, or “Images can’t be added here.”', composer),
  block('Loading and error state', '<code>RichTextEditorFallback</code> accepts the same props and renders a plain textarea, so a failed editor chunk never blocks saving.', fallback),
  block('Markdown viewer', 'Server-safe rendering of the same markdown: no HTML sink, unsafe links become text, and images render only when the host’s <code>resolveImageSrc</code> allows them.', viewer),
  block('Reactions and emoji picker', 'Toggle chips name every reactor in the tooltip and the accessible name. The picker searches English or German names, remembers recent picks and loads its data on first open.', `${reactions}${picker}`),
].join('') + END;

const source = readFileSync(target, 'utf8');
const pages = source.match(/"slug": "examples-rich-text"[\s\S]*?"html": ("(?:[^"\\]|\\.)*")/);
if (!pages) throw new Error('examples-rich-text page not found');
const html = JSON.parse(pages[1]);
const stripped = html.includes(START) ? html.slice(0, html.indexOf(START)) + html.slice(html.indexOf(END) + END.length) : html;
const closing = stripped.lastIndexOf('</section>');
const next = `${stripped.slice(0, closing).trimEnd()}${section}\n    ${stripped.slice(closing)}`;
writeFileSync(target, source.replace(pages[1], () => JSON.stringify(next)));
console.log(`rich-text specimens: ${section.length} characters`);
