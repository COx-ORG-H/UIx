// Regenerates packages/tokens/docs/file-kit-specimens.js: the docs specimens for the file kit
// (2.57) — the kind colours and glyphs (FileKindIcon), the file row in every state (FileRow) and the
// slim drop row (FileDrop) — from the BUILT package, so the styleguide shows exactly the markup the
// components render. docs.js replays an upload on the row marked data-file-kit-upload.
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-file-kit-specimens.mjs
//
// packages/react/src/file-kit-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/file-kit-specimens.js');

const caption = (text) => `<div class="uix-guide__subhead" data-file-kit-specimen>${text}</div>`;

const PANEL = [
  { name: 'foerderportal-gateway-2026-11-05.log', size: 8_700_000, state: 'uploading', progress: 0.62 },
  { name: 'har-mitschnitt-antrag.zip', size: 31_000_000, state: 'scanning' },
  { name: 'fehlermeldung-antrag.png', size: 412_000, meta: 'L. Brandt, 14:10' },
  { name: 'WG Störung Förderportal – Rückmeldung LfA.msg', size: 96_000, meta: 'D. Weber, 14:02' },
  { name: 'Antragseingang_November.xlsx', size: 214_000, meta: 'D. Weber, 13:58' },
  { name: 'Notfallhandbuch_Förderportal_v4.pdf', size: 2_400_000, meta: 'D. Weber, 13:55' },
  { name: 'Störungsbericht_SEPA-Clearing.docx', size: 48_000, meta: 'L. Brandt, 13:40' },
  { name: 'Clearing-Ablauf_Schulung.pptx', size: 3_100_000, meta: 'D. Weber, 13:31' },
  { name: 'nginx-upstream.conf', size: 3_000, state: 'blocked' },
  { name: 'export-antraege-1340.csv', size: 1_100_000, state: 'failed' },
];

const KIND_SAMPLES = { img: 'png', doc: 'docx', sheet: 'xlsx', slides: 'pptx', pdf: 'pdf', mail: 'msg', code: 'conf', log: 'log', archive: 'zip', text: 'txt', other: 'bin' };

/** Render every specimen. Returns `{ [route]: html }`. */
export async function renderFileKitSpecimens() {
  const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
  const html = (el) => renderToStaticMarkup(el);
  const noop = () => {};
  const specimens = {};
  const add = (route, block) => { specimens[route] = specimens[route] ? `${specimens[route]}\n${block}` : block; };
  const row = (f, extra = {}) => h(ui.FileRow, {
    key: f.name, as: 'li', name: f.name, size: f.size, meta: f.meta, state: f.state ?? 'idle', progress: f.progress,
    href: '#datei', onMoreActions: noop, onCancel: noop, onDetails: noop, onRetry: noop, ...extra,
  });

  // ── the kinds ─────────────────────────────────────────────────────────────────────────────
  const kinds = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 11rem), 1fr))', gap: 'var(--uix-space-3)' } },
    ...ui.FILE_KINDS.map((kind) => h('div', {
      key: kind,
      style: {
        display: 'grid', justifyItems: 'start', gap: 'var(--uix-space-2)', padding: 'var(--uix-space-3) var(--uix-space-4)', minWidth: 0,
        border: `1px solid var(--uix-file-${kind}-edge)`, borderRadius: 'var(--uix-radius-md)',
        background: `linear-gradient(to right, var(--uix-file-${kind}-soft), transparent 55%) var(--uix-surface)`,
      },
    },
    h('span', { style: { display: 'flex', alignItems: 'center', gap: 'var(--uix-space-3)', minWidth: 0, maxWidth: '100%' } },
      h(ui.FileKindIcon, { kind, name: `x.${KIND_SAMPLES[kind]}`, size: 'lg' }),
      h('b', { style: { minWidth: 0, overflowWrap: 'break-word' } }, ui.DEFAULT_FILE_KIND_LABELS[kind])),
    h('small', { style: { fontFamily: 'var(--uix-font-mono)', color: 'var(--uix-text-muted)', overflowWrap: 'anywhere' } },
      kind === 'other' ? 'alles andere' : ui.FILE_KIND_EXTENSIONS[kind].slice(0, 6).join(' ')))));
  add('examples-crm-itsm', [
    caption('File kinds (React <code>fileKind(name, mime)</code>, <code>FileKindIcon</code>; tokens <code>--uix-file-&lt;kind&gt;</code> with <code>-soft</code>, <code>-strong</code>, <code>-edge</code>, <code>-label</code>) — eleven kinds, each with a Lucide glyph and a hue. The office kinds take the colour people know from the program: Word blue, Excel green, PowerPoint orange, PDF red, each tuned so it never reads as the danger red (red stays for broken), the attention orange or the brand blue (blue stays for actions). Dokument, PDF and Text share the page glyph; four kinds are the calm chart hues. The icon stroke clears 3:1 and the label text 4.5:1 in both themes.'),
    '<div data-file-kit-example="kinds">',
    html(kinds),
    '</div>',
  ].join('\n'));

  // ── the Anhänge panel at its real width ──────────────────────────────────────────────────
  const panel = h('section', {
    'aria-label': 'Anhänge',
    style: { boxSizing: 'border-box', width: '340px', maxWidth: '100%', display: 'grid', gap: 'var(--uix-space-3)', padding: 'var(--uix-space-4)', border: '1px solid var(--uix-border)', borderRadius: 'var(--uix-radius-lg)', background: 'var(--uix-surface)' },
  },
  h('h3', { style: { margin: 0, fontSize: 'var(--uix-text-h3)' } }, 'Anhänge ', h('span', { style: { color: 'var(--uix-text-muted)', fontWeight: 500 } }, String(PANEL.length))),
  h(ui.FileDrop, { onFiles: noop }),
  h('ul', { className: 'uix-file-rows' }, ...PANEL.map((f) => row(f, { density: 'compact' }))));
  add('examples-crm-itsm', [
    caption('Anhänge panel (React <code>FileDrop</code>, <code>FileRow density="compact"</code>; <code>.uix-file-drop</code>, <code>.uix-file-rows</code>, <code>.uix-file-row</code>) — at the incident panel\'s 340 px. A slim drop row instead of a tall empty box, so the files sit near the top. Each row carries its kind\'s tint on the left edge, fading into the surface; the actions appear on hover and focus (always on touch). Drag files over the drop row: before the drop it names their kinds and tints itself from the pointer outwards.'),
    '<div data-file-kit-example="panel">',
    html(panel),
    '</div>',
  ].join('\n'));

  // ── every state, full width, with a replayed upload ──────────────────────────────────────
  const upload = { name: 'Notfallhandbuch_Förderportal_v4.pdf', size: 2_400_000, meta: 'Sie, gerade eben' };
  const states = h('ul', { className: 'uix-file-rows', style: { maxWidth: '40rem' } },
    row({ ...upload, state: 'uploading', progress: 0.62 }, { 'data-file-kit-upload': '', 'data-docs-bytes': upload.size }),
    row({ name: 'fehlermeldung-antrag.png', size: 412_000, meta: 'L. Brandt, vor 12 Min.' }),
    row({ name: 'har-mitschnitt-antrag.zip', size: 31_000_000, state: 'scanning' }),
    row({ name: 'nginx-upstream.conf', size: 3_000, state: 'blocked' }),
    row({ name: 'export-antraege-1340.csv', size: 1_100_000, state: 'failed' }));
  const done = h('ul', null, row({ ...upload, state: 'done' }));
  add('examples-crm-itsm', [
    caption('File row states (React <code>FileRow state</code>) — <b>Wird hochgeladen</b>: the tint becomes the progress, soft to strong with a thin leading edge, scaled to the real percentage; <b>done</b>: a check draws at the icon corner (320 ms) and the fill fades back to the resting edge (1.2 s); <b>Wird geprüft</b>: words only, no motion; <b>Gesperrt</b> turns the kind amber and <b>Fehlgeschlagen</b> red, each with its one action. No state loops. Reduced motion keeps only the fades.'),
    '<div data-file-kit-example="states">',
    '<div class="uix-cluster" style="margin-bottom:var(--uix-space-3)"><button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-file-kit-replay>Hochladen abspielen</button></div>',
    html(states),
    `<template data-file-kit-done>${html(done)}</template>`,
    '</div>',
  ].join('\n'));

  // ── sizes ─────────────────────────────────────────────────────────────────────────────────
  const sizes = h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'end', gap: 'var(--uix-space-5)' } },
    ...[['sm', '30 px · kompakte Zeile'], ['md', '34 px · Zeile'], ['lg', '52 px · groß']].map(([size, text]) => h('figure', { key: size, style: { margin: 0, display: 'grid', justifyItems: 'center', gap: 'var(--uix-space-2)' } },
      h('span', { style: { display: 'flex', alignItems: 'end', gap: 'var(--uix-space-3)' } },
        h(ui.FileKindIcon, { name: 'gateway.log', size }), h(ui.FileKindIcon, { name: 'Antragseingang.xlsx', size }), h(ui.FileKindIcon, { name: 'config.yaml', size })),
      h('figcaption', { style: { fontSize: 'var(--uix-text-meta)', color: 'var(--uix-text-muted)' } }, text))));
  add('examples-crm-itsm', [
    caption('File icon sizes (React <code>FileKindIcon size</code>; <code>.uix-file-icon--sm</code>, <code>--lg</code>) — the label is the extension, at most four capitals, bold, in the UI font, on a solid fill ringed in the surface colour.'),
    '<div data-file-kit-example="sizes">',
    html(sizes),
    '</div>',
  ].join('\n'));

  return specimens;
}

export const fileKitSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-file-kit-specimens.mjs — do not edit by hand.
 * The docs specimens for the file kit (2.57): the markup the built React components render.
 * showcase-data.js appends each block to its route; docs.js replays the upload.
 * packages/react/src/file-kit-specimens.test.mjs fails when this file and the components differ. */
export const FILE_KIT_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, fileKitSpecimenModule(await renderFileKitSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
