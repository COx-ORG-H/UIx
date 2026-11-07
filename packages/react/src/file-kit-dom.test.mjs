/* The file kit (2.57): fileKind(name, mime), FileKindIcon, FileRow and FileDrop, in jsdom and on
 * the server. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, rerender: (next) => act(() => root.render(next)), unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const file = (name, type = '') => new window.File(['x'], name, { type });

/** A drag event the way a browser sends one before the drop: types and items, files only on drop. */
function drag(type, { items = [], files = [], types = items.length || files.length ? ['Files'] : ['text/plain'], x = 40, y = 12 } = {}) {
  const event = new window.Event(type, { bubbles: true, cancelable: true });
  const dataTransfer = { types, items: items.map((mime) => ({ kind: 'file', type: mime })), files, dropEffect: 'none' };
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  Object.defineProperty(event, 'clientX', { value: x });
  Object.defineProperty(event, 'clientY', { value: y });
  return event;
}
const fire = (el, event) => act(() => { el.dispatchEvent(event); });

// ── fileKind ───────────────────────────────────────────────────────────────────────────────────

test('fileKind: every listed extension maps to its kind, in any case', () => {
  for (const kind of ui.FILE_KINDS) {
    for (const ext of ui.FILE_KIND_EXTENSIONS[kind]) {
      assert.equal(ui.fileKind(`Datei.${ext}`), kind, ext);
      assert.equal(ui.fileKind(`DATEI.${ext.toUpperCase()}`), kind, ext.toUpperCase());
    }
  }
  assert.deepEqual([...ui.FILE_KINDS], ['img', 'doc', 'sheet', 'slides', 'pdf', 'mail', 'code', 'log', 'archive', 'text', 'other']);
  assert.deepEqual(ui.FILE_KIND_EXTENSIONS.other, []);
});

test('fileKind: MIME type alone, as a drag event gives it', () => {
  const cases = {
    'image/png': 'img', 'image/svg+xml': 'img', 'image/heic': 'img',
    'application/pdf': 'pdf', 'application/x-pdf': 'pdf',
    'application/msword': 'doc', 'application/rtf': 'doc', 'text/rtf': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
    'application/vnd.oasis.opendocument.text': 'doc',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slides',
    'application/vnd.ms-powerpoint': 'slides', 'application/vnd.oasis.opendocument.presentation': 'slides',
    'text/markdown': 'text', 'text/plain': 'text',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'sheet', 'application/vnd.ms-excel': 'sheet',
    'text/csv': 'sheet', 'text/tab-separated-values': 'sheet', 'application/vnd.oasis.opendocument.spreadsheet': 'sheet',
    'message/rfc822': 'mail', 'application/vnd.ms-outlook': 'mail',
    'application/json': 'code', 'application/xml': 'code', 'text/xml': 'code', 'application/x-yaml': 'code', 'application/x-sh': 'code',
    'text/javascript': 'code', 'application/typescript': 'code', 'text/x-python': 'code', 'application/toml': 'code',
    'text/x-log': 'log',
    'application/zip': 'archive', 'application/x-zip-compressed': 'archive', 'application/x-7z-compressed': 'archive',
    'application/vnd.rar': 'archive', 'application/x-rar-compressed': 'archive', 'application/gzip': 'archive', 'application/x-tar': 'archive',
    ' Image/JPEG ': 'img',
  };
  for (const [mime, kind] of Object.entries(cases)) assert.equal(ui.fileKind('', mime), kind, mime);
});

test('fileKind: unknown types and names are "other"', () => {
  // .key is left out of Präsentation on purpose: in a ticket it is far more often a private key than a Keynote file.
  for (const [name, mime] of [['server.key', ''], ['', ''], ['', undefined], ['', 'application/octet-stream'], ['', 'video/mp4'], ['setup.exe', 'application/x-msdownload'], ['README', ''], ['archive.', ''], ['notes.unknownext', '']]) {
    assert.equal(ui.fileKind(name, mime), 'other', `${name} ${mime}`);
  }
});

test('fileKind: a known extension wins over the MIME type; the MIME type fills in for an unknown one', () => {
  assert.equal(ui.fileKind('gateway.log', 'text/plain'), 'log');
  assert.equal(ui.fileKind('mapping.ts', 'video/mp2t'), 'code');
  assert.equal(ui.fileKind('mitschnitt.har', 'application/json'), 'log');
  assert.equal(ui.fileKind('backup.tar.gz', 'application/gzip'), 'archive');
  assert.equal(ui.fileKind('scan', 'image/png'), 'img');
  assert.equal(ui.fileKind('Rückmeldung LfA.weird', 'message/rfc822'), 'mail');
  assert.equal(ui.fileKind('C:\\Temp\\export.v2\\liste.csv'), 'sheet');
  assert.equal(ui.fileKind('ordner.v2/README'), 'other');
});

test('fileKind: the object form keeps its coarse kinds for FileUpload and Attachment', () => {
  assert.equal(ui.fileKind({ name: 'scan.heic' }), 'image');
  assert.equal(ui.fileKind({ name: 'a.pdf' }), 'pdf');
  assert.equal(ui.fileKind({ name: 'clip.mov' }), 'video');
  assert.equal(ui.fileKind({ name: 'x', type: 'text/plain' }), 'text');
});

test('fileExtension and fileTypeLabel', () => {
  assert.equal(ui.fileExtension('Bericht.PDF'), 'pdf');
  assert.equal(ui.fileExtension('backup.tar.gz'), 'gz');
  assert.equal(ui.fileExtension('README'), '');
  assert.equal(ui.fileTypeLabel('notes.markdown'), 'MARK');
  assert.equal(ui.fileTypeLabel('Antragseingang.xlsx'), 'XLSX');
  assert.equal(ui.fileTypeLabel('README'), '');
});

test('kind names: German by default, English exported', () => {
  assert.deepEqual(ui.DEFAULT_FILE_KIND_LABELS, {
    img: 'Bild', doc: 'Dokument', sheet: 'Tabelle', slides: 'Präsentation', pdf: 'PDF', mail: 'E-Mail',
    code: 'Code & Konfiguration', log: 'Protokoll', archive: 'Archiv', text: 'Text', other: 'Datei',
  });
  assert.deepEqual(Object.keys(ui.FILE_KIND_LABELS_EN), [...ui.FILE_KINDS]);
  assert.equal(ui.FILE_KIND_LABELS_EN.slides, 'Presentation');
});

// ── FileKindIcon ───────────────────────────────────────────────────────────────────────────────

test('FileKindIcon: the kind glyph and the type label, decorative unless named; server-renderable', () => {
  const html = renderToStaticMarkup(h(ui.FileKindIcon, { name: 'fehlermeldung-antrag.png' }));
  assert.match(html, /class="uix-file-icon"/);
  assert.match(html, /data-file-kind="img"/);
  assert.match(html, /^<span class="uix-file-icon" data-file-kind="img" aria-hidden="true">/);
  assert.match(html, /<svg[^>]*uix-file-icon__glyph/);
  assert.match(html, /<span class="uix-file-icon__type" data-length="3">PNG<\/span>/);

  const named = renderToStaticMarkup(h(ui.FileKindIcon, { name: 'x.pdf', size: 'lg', label: 'PDF-Dokument' }));
  assert.match(named, /class="uix-file-icon uix-file-icon--lg"/);
  assert.match(named, /role="img"/);
  assert.match(named, /aria-label="PDF-Dokument"/);
  assert.match(named, /^<span class="uix-file-icon uix-file-icon--lg" data-file-kind="pdf" role="img" aria-label="PDF-Dokument">/, 'named: an image, not hidden');

  const mimeOnly = renderToStaticMarkup(h(ui.FileKindIcon, { mime: 'application/zip', size: 'sm' }));
  assert.match(mimeOnly, /data-file-kind="archive"/);
  assert.doesNotMatch(mimeOnly, /uix-file-icon__type/, 'no name, no label');

  const custom = renderToStaticMarkup(h(ui.FileKindIcon, { name: 'trace.evtx', kind: 'code', typeLabel: 'event' }));
  assert.match(custom, /data-file-kind="code"/);
  assert.match(custom, />EVEN</, 'four capitals at most');
});

test('FileKindIcon: each kind draws its own glyph, except the page kinds (Dokument, PDF, Text) that share one', () => {
  const paths = new Map();
  for (const kind of ui.FILE_KINDS) {
    const html = renderToStaticMarkup(h(ui.FileKindIcon, { kind })).replace(/data-file-kind="[a-z]+"/, '');
    paths.set(html, [...(paths.get(html) ?? []), kind]);
  }
  assert.equal(paths.size, 9);
  assert.deepEqual([...paths.values()].filter((kinds) => kinds.length > 1), [['doc', 'pdf', 'text']], 'colour and the type label tell the page kinds apart');
  assert.match(renderToStaticMarkup(h(ui.FileKindIcon, { kind: 'slides' })), /M2 3h20/, 'Präsentation draws the presentation board');
  assert.match(renderToStaticMarkup(h(ui.FileKindIcon, { kind: 'code' })), /m14 12\.5 2 2\.5-2 2\.5/);
  assert.match(renderToStaticMarkup(h(ui.FileKindIcon, { kind: 'log' })), /m8 16 2-2-2-2/);
});

// ── FileRow ────────────────────────────────────────────────────────────────────────────────────

test('FileRow at rest: name, kind in its colour, size, who and when; download and more actions', () => {
  const more = [];
  const { host, unmount } = mount(h(ui.FileRow, {
    name: 'Notfallhandbuch_Förderportal_v4.pdf', size: 2_400_000, meta: 'D. Weber, 13:55', href: '/files/42', onMoreActions: () => more.push(1),
  }));
  const row = host.querySelector('.uix-file-row');
  assert.equal(row.tagName, 'DIV');
  assert.equal(row.dataset.fileKind, 'pdf');
  assert.equal(row.dataset.state, 'idle');
  assert.equal(row.querySelector('.uix-file-row__name').title, 'Notfallhandbuch_Förderportal_v4.pdf');
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'PDF · 2,4 MB · D. Weber, 13:55');
  assert.equal(row.querySelector('.uix-file-row__kind').textContent, 'PDF');
  assert.equal(row.querySelector('.uix-file-icon__type').textContent, 'PDF');
  const link = row.querySelector('a.uix-btn');
  assert.equal(link.getAttribute('href'), '/files/42');
  assert.ok(link.hasAttribute('download'));
  assert.equal(link.getAttribute('aria-label'), 'Notfallhandbuch_Förderportal_v4.pdf herunterladen');
  const moreButton = row.querySelector('button[aria-haspopup="menu"]');
  assert.equal(moreButton.getAttribute('aria-label'), 'Weitere Aktionen für Notfallhandbuch_Förderportal_v4.pdf');
  click(moreButton);
  assert.equal(more.length, 1);
  assert.equal(row.querySelector('.uix-file-row__fill'), null, 'no fill at rest');
  unmount();
});

test('FileRow uploading: a fill scaled to the real progress, the progress words, and Abbrechen', () => {
  const cancelled = [];
  const { host, rerender, unmount } = mount(h(ui.FileRow, { name: 'foerderportal-gateway.log', size: 2_400_000, state: 'uploading', progress: 0.62, onCancel: () => cancelled.push(1) }));
  const row = host.querySelector('.uix-file-row');
  assert.equal(row.dataset.fileKind, 'log');
  assert.equal(row.style.getPropertyValue('--file-progress'), '0.62');
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Wird hochgeladen · 62 % · 1,5 von 2,4 MB');
  const bar = row.querySelector('[role="progressbar"]');
  assert.equal(bar.getAttribute('aria-valuenow'), '62');
  assert.equal(bar.getAttribute('aria-label'), 'foerderportal-gateway.log wird hochgeladen');
  assert.ok(row.querySelector('.uix-file-row__edge'));
  const cancel = row.querySelector('button[aria-label="Hochladen von foerderportal-gateway.log abbrechen"]');
  assert.ok(cancel.classList.contains('uix-file-row__keep'), 'cancel is always visible');
  click(cancel);
  assert.equal(cancelled.length, 1);

  rerender(h(ui.FileRow, { name: 'foerderportal-gateway.log', size: 2_400_000, state: 'uploading', loaded: 600_000 }));
  assert.equal(row.style.getPropertyValue('--file-progress'), '0.25', 'progress from loaded / size');
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Wird hochgeladen · 25 % · 600 KB von 2,4 MB');

  rerender(h(ui.FileRow, { name: 'x.log', state: 'uploading', progress: 1.7 }));
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Wird hochgeladen · 100 %', 'clamped; no size, no bytes');
  unmount();
});

test('FileRow done: the fill completes and fades, the check draws, the outcome is said once', async () => {
  const props = { name: 'fehlermeldung-antrag.png', size: 412_000 };
  const { host, rerender, unmount } = mount(h(ui.FileRow, { ...props, state: 'uploading', progress: 0.9 }));
  const row = host.querySelector('.uix-file-row');
  assert.equal(row.querySelector('.uix-file-row__check'), null);
  rerender(h(ui.FileRow, { ...props, state: 'done' }));
  await tick();
  assert.equal(row.dataset.state, 'done');
  assert.equal(row.style.getPropertyValue('--file-progress'), '1');
  assert.equal(row.querySelector('.uix-file-row__fill').getAttribute('aria-hidden'), 'true');
  assert.equal(row.querySelector('[role="progressbar"]'), null);
  assert.ok(row.querySelector('.uix-file-row__icon .uix-file-row__check path[pathLength="1"]'));
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Bild · 412 KB');
  assert.equal(document.querySelector('[data-uix-announcer]').textContent, 'fehlermeldung-antrag.png hochgeladen');
  rerender(h(ui.FileRow, { ...props, state: 'idle' }));
  assert.equal(row.querySelector('.uix-file-row__check'), null);
  assert.equal(row.querySelector('.uix-file-row__fill'), null);
  unmount();
});

test('FileRow scanning, blocked and failed: words, the state colour, the one action', async () => {
  const done = [];
  const { host, rerender, unmount } = mount(h(ui.FileRow, { name: 'har-mitschnitt.zip', state: 'scanning', href: '/x', onMoreActions: () => {} }));
  const row = host.querySelector('.uix-file-row');
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Wird auf Schadsoftware geprüft');
  assert.equal(row.querySelector('.uix-file-row__actions'), null, 'no actions while the check runs');
  assert.equal(row.querySelector('.uix-file-row__fill'), null, 'no fill, no motion');

  rerender(h(ui.FileRow, { name: 'har-mitschnitt.zip', state: 'blocked', onDetails: () => done.push('details') }));
  await tick();
  assert.equal(row.dataset.state, 'blocked');
  assert.equal(row.dataset.fileKind, 'archive', 'the kind stays; CSS swaps the hue for amber');
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Gesperrt: Schadsoftware gefunden. Nicht gespeichert.');
  assert.equal(document.querySelector('[data-uix-announcer]').textContent, 'har-mitschnitt.zip: Gesperrt: Schadsoftware gefunden. Nicht gespeichert.');
  const details = [...row.querySelectorAll('button')].find((b) => b.textContent === 'Details');
  click(details);

  rerender(h(ui.FileRow, { name: 'har-mitschnitt.zip', state: 'failed', onRetry: () => done.push('retry'), message: 'Zu groß: höchstens 25 MB.' }));
  await tick();
  assert.equal(row.querySelector('.uix-file-row__meta').textContent, 'Zu groß: höchstens 25 MB.');
  assert.equal(document.querySelector('[data-uix-announcer]').textContent, 'har-mitschnitt.zip: Zu groß: höchstens 25 MB.');
  click([...row.querySelectorAll('button')].find((b) => b.textContent === 'Erneut versuchen'));
  assert.deepEqual(done, ['details', 'retry']);
  unmount();
});

test('FileRow: compact density, li, actions slot, English through UixLabelsProvider', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { fileRow: ui.FILE_ROW_LABELS_EN, fileKinds: ui.FILE_KIND_LABELS_EN } },
    h('ul', { className: 'uix-file-rows' },
      h(ui.FileRow, { as: 'li', density: 'compact', name: 'Antragseingang.xlsx', size: 214_000, locale: 'en-US', onDownload: () => {} }),
      h(ui.FileRow, { as: 'li', name: 'x.eml', state: 'uploading', progress: 0.5, size: 1000, locale: 'en-US' }),
      h(ui.FileRow, { as: 'li', name: 'y.json', actions: h('button', { type: 'button' }, 'Öffnen') }))));
  assert.match(html, /<li class="uix-file-row uix-file-row--compact" data-file-kind="sheet"/);
  assert.match(html, /uix-file-icon uix-file-icon--sm/);
  assert.match(html, /Spreadsheet<\/span> · 214 KB/);
  assert.match(html, /aria-label="Download Antragseingang.xlsx"/);
  assert.match(html, /Uploading · 50% · 500 B of 1 KB/);
  assert.match(html, /<button type="button">Öffnen<\/button>/);
  assert.doesNotMatch(html, /herunterladen|Wird hochgeladen/);
});

// ── FileDrop ───────────────────────────────────────────────────────────────────────────────────

test('FileDrop: one line backed by a real file input; the choose button is the keyboard path', () => {
  const got = [];
  const { host, unmount } = mount(h(ui.FileDrop, { onFiles: (files) => got.push(files.map((f) => f.name)), accept: '.pdf,image/*' }));
  const root = host.querySelector('.uix-file-drop');
  assert.equal(root.querySelector('.uix-file-drop__text').textContent, 'Dateien ablegen oder auswählen');
  const button = root.querySelector('button.uix-file-drop__choose');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.textContent, 'auswählen');
  assert.equal(button.getAttribute('aria-label'), 'Dateien auswählen', 'the visible word is part of the name');
  const input = root.querySelector('input[type="file"]');
  assert.equal(input.getAttribute('accept'), '.pdf,image/*');
  assert.ok(input.multiple);
  assert.equal(input.tabIndex, -1, 'one tab stop: the button');
  let opened = 0;
  input.click = () => { opened += 1; };
  click(button);
  click(root);
  assert.equal(opened, 2, 'the button and the row both open the chooser');
  act(() => {
    Object.defineProperty(input, 'files', { value: [file('a.pdf', 'application/pdf')], configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.deepEqual(got, [['a.pdf']]);
  unmount();
});

test('FileDrop: while files are dragged over it, it names their kinds and takes their colours', () => {
  const got = [];
  const rejected = [];
  const { host, unmount } = mount(h(ui.FileDrop, { onFiles: (files) => got.push(files.map((f) => f.name)), onReject: (files) => rejected.push(files.map((f) => f.name)), accept: 'image/*,.log' }));
  const root = host.querySelector('.uix-file-drop');
  const summary = root.querySelector('.uix-file-drop__summary');

  fire(root, drag('dragenter', { items: ['image/png', 'text/x-log'] }));
  assert.ok(root.hasAttribute('data-dragging'));
  assert.equal(summary.textContent, '2 Dateien: Bild, Protokoll');
  assert.equal(summary.getAttribute('aria-hidden'), 'true');
  assert.equal(root.dataset.fileKind, 'img', 'the border takes the first kind');
  const aura = root.querySelector('.uix-file-drop__aura').style.backgroundImage;
  assert.match(aura, /--uix-file-img/);
  assert.match(aura, /--uix-file-log/);
  assert.equal(root.style.getPropertyValue('--file-drop-x'), '40px');
  assert.ok(root.querySelector('button.uix-file-drop__choose'), 'the button stays mounted');

  const over = drag('dragover', { items: ['image/png', 'text/x-log'], x: 90, y: 20 });
  fire(root, over);
  assert.ok(over.defaultPrevented, 'dragover is accepted so the drop can happen');
  assert.equal(over.dataTransfer.dropEffect, 'copy');
  assert.equal(root.style.getPropertyValue('--file-drop-x'), '90px');

  // a child entering and leaving inside the row keeps the drag state
  fire(root.querySelector('.uix-file-drop__line'), drag('dragenter', { items: ['image/png'] }));
  fire(root.querySelector('.uix-file-drop__line'), drag('dragleave', { items: ['image/png'] }));
  assert.ok(root.hasAttribute('data-dragging'));
  fire(root, drag('dragleave', { items: ['image/png'] }));
  assert.ok(!root.hasAttribute('data-dragging'));

  fire(root, drag('dragenter', { items: ['image/png', 'text/x-log'] }));
  const drop = drag('drop', { files: [file('fehler.png', 'image/png'), file('gateway.log', 'text/plain'), file('setup.exe', 'application/x-msdownload')] });
  fire(root, drop);
  assert.ok(drop.defaultPrevented);
  assert.ok(!root.hasAttribute('data-dragging'));
  assert.deepEqual(got, [['fehler.png', 'gateway.log']]);
  assert.deepEqual(rejected, [['setup.exe']]);
  unmount();
});

test('FileDrop: MIME-less and unknown drags, text drags, one file, disabled', () => {
  const got = [];
  const { host, rerender, unmount } = mount(h(ui.FileDrop, { onFiles: (files) => got.push(files.length), multiple: false }));
  const root = host.querySelector('.uix-file-drop');
  const summary = root.querySelector('.uix-file-drop__summary');

  fire(root, drag('dragenter', { items: [''] }));
  assert.equal(summary.textContent, '1 Datei', 'nothing known about it: the count only');
  assert.equal(root.dataset.fileKind, 'other');
  fire(root, drag('dragleave'));
  fire(root, drag('dragenter', { items: ['', 'image/jpeg'] }));
  assert.equal(summary.textContent, '2 Dateien: Bild, Datei');
  fire(root, drag('dragleave'));
  fire(root, drag('dragenter', { types: ['Files'] }));
  assert.equal(summary.textContent, 'Loslassen zum Hochladen', 'a browser that lists no items');
  fire(root, drag('dragleave'));

  const text = drag('dragenter');
  fire(root, text);
  assert.ok(!root.hasAttribute('data-dragging'), 'a text drag is not for this row');
  assert.ok(!text.defaultPrevented);

  fire(root, drag('drop', { files: [file('a.png', 'image/png'), file('b.png', 'image/png')] }));
  assert.deepEqual(got, [1], 'multiple={false} takes the first file');

  rerender(h(ui.FileDrop, { onFiles: (files) => got.push(files.length), disabled: true }));
  assert.ok(root.querySelector('button.uix-file-drop__choose').disabled);
  fire(root, drag('dragenter', { items: ['image/png'] }));
  assert.ok(!root.hasAttribute('data-dragging'));
  unmount();
});

test('FileDrop: a larger target takes the drop; English through UixLabelsProvider', () => {
  const got = [];
  const panel = document.createElement('section');
  document.body.append(panel);
  const ref = { current: panel };
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { fileDrop: ui.FILE_DROP_LABELS_EN, fileKinds: ui.FILE_KIND_LABELS_EN } },
    h(ui.FileDrop, { onFiles: (files) => got.push(files.length), targetRef: ref })));
  const root = host.querySelector('.uix-file-drop');
  assert.equal(root.querySelector('.uix-file-drop__text').textContent, 'Drop files or choose');
  assert.equal(root.querySelector('button').getAttribute('aria-label'), 'Choose files');
  fire(panel, drag('dragenter', { items: ['application/pdf'] }));
  assert.equal(root.querySelector('.uix-file-drop__summary').textContent, '1 file: PDF');
  fire(panel, drag('drop', { files: [file('a.pdf', 'application/pdf')] }));
  assert.deepEqual(got, [1]);
  unmount();
  panel.remove();
});
