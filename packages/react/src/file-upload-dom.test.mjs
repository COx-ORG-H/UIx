/* HAR-984/985 (TENSOR C15, MOTUS C-7, MEDx S18/S19) — the file model, FileUpload and
 * Attachment in jsdom. Renders the BUILT dist — run `npm run build` first; CI does. */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
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
  return { host, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })));
const file = (name, size, type) => { const f = new window.File(['x'], name, { type }); Object.defineProperty(f, 'size', { value: size }); return f; };
const pick = (input, files) => act(() => {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
});

test('file model: sizes, accept lists, partition and kinds', () => {
  assert.equal(ui.formatFileSize(0, 'en'), '0 B');
  assert.equal(ui.formatFileSize(1_234_567, 'en'), '1.2 MB');
  assert.equal(ui.formatFileSize(340_000, 'de'), '340 KB');
  assert.equal(ui.fileMatchesAccept({ name: 'a.PDF', type: '' }, '.pdf,image/*'), true);
  assert.equal(ui.fileMatchesAccept({ name: 'a.png', type: 'image/png' }, '.pdf,image/*'), true);
  assert.equal(ui.fileMatchesAccept({ name: 'a.exe', type: 'application/x-msdownload' }, '.pdf,image/*'), false);
  const { accepted, rejected } = ui.partitionFiles(
    [{ name: 'a.pdf', size: 10 }, { name: 'b.exe', size: 10 }, { name: 'c.pdf', size: 999 }, { name: 'd.pdf', size: 10 }, { name: 'e.pdf', size: 10 }],
    { accept: '.pdf', maxSize: 100, maxFiles: 3, existing: 1 },
  );
  assert.deepEqual(accepted.map((f) => f.name), ['a.pdf', 'd.pdf']);
  assert.deepEqual(rejected.map((r) => [r.file.name, r.reason]), [['b.exe', 'type'], ['c.pdf', 'size'], ['e.pdf', 'count']]);
  assert.equal(ui.fileKind({ name: 'scan.heic' }), 'image');
  assert.equal(ui.fileKind({ name: 'q3.xlsx' }), 'sheet');
});

test('FileUpload: a real Choose button, validation messages, accepted files handed over', () => {
  const calls = [];
  const { host, unmount } = mount(h(ui.FileUpload, {
    items: [], accept: '.pdf,image/*', maxSize: 1_000_000, maxFiles: 2, hint: 'PDF or images, up to 1 MB', locale: 'en', capture: 'environment',
    onFilesAdded: (accepted, rejected) => calls.push([accepted.map((f) => f.name), rejected.map((r) => r.reason)]),
  }));
  const choose = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Choose files');
  assert.ok(choose, 'keyboard users get a button');
  assert.equal(document.getElementById(choose.getAttribute('aria-describedby')).textContent, 'PDF or images, up to 1 MB');
  const input = host.querySelector('input[type="file"]');
  assert.equal(input.getAttribute('tabindex'), '-1');
  assert.equal(input.getAttribute('capture'), 'environment');
  assert.equal(input.accept, '.pdf,image/*');
  pick(input, [file('plan.pdf', 2000, 'application/pdf'), file('virus.exe', 10, ''), file('big.pdf', 5_000_000, 'application/pdf')]);
  assert.deepEqual(calls, [[['plan.pdf'], ['type', 'size']]]);
  const errors = [...host.querySelectorAll('.uix-file-upload__errors li')].map((li) => li.textContent);
  assert.deepEqual(errors, ['virus.exe is not an accepted file type (.pdf,image/*).', 'big.pdf is larger than 1 MB.']);
  assert.equal(host.querySelector('.uix-file-upload__errors').getAttribute('role'), 'alert');
  assert.equal(host.querySelector('[role="status"]').textContent, '1 added');
  unmount();
});

test('FileUpload list: progress, failure with retry, remove, alt text for images', () => {
  const log = [];
  const Harness = () => {
    const [items, setItems] = useState([
      { id: '1', name: 'report.pdf', size: 1_500_000, type: 'application/pdf', status: 'uploading', progress: 40 },
      { id: '2', name: 'cover.jpg', size: 200_000, type: 'image/jpeg', status: 'done', previewUrl: '/cover.jpg', alt: '' },
      { id: '3', name: 'scan.png', size: 90_000, type: 'image/png', status: 'error', error: 'The server rejected it.' },
      { id: '4', name: 'later.txt', size: 12, status: 'queued' },
    ]);
    return h(ui.FileUpload, {
      items, locale: 'en', onFilesAdded: () => {},
      onRemove: (id) => { log.push(['remove', id]); setItems((xs) => xs.filter((x) => x.id !== id)); },
      onRetry: (id) => log.push(['retry', id]),
      onAltChange: (id, alt) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, alt } : x))),
    });
  };
  const { host, unmount } = mount(h(Harness));
  const rows = [...host.querySelectorAll('.uix-file-upload__item')];
  assert.deepEqual(rows.map((r) => r.getAttribute('data-status')), ['uploading', 'done', 'error', 'queued']);
  const bar = rows[0].querySelector('[role="progressbar"]');
  assert.equal(bar.getAttribute('aria-valuenow'), '40');
  assert.equal(bar.getAttribute('aria-label'), 'Uploading, 40%');
  assert.match(rows[0].textContent, /1\.5 MB/);
  assert.equal(rows[1].querySelector('.uix-file-upload__status').textContent, 'Uploaded');
  const alt = rows[1].querySelector('input');
  assert.equal(alt.getAttribute('aria-label'), 'Description of cover.jpg for screen readers');
  assert.equal(rows[2].querySelector('.uix-file-upload__error').textContent, 'The server rejected it.');
  const retry = [...rows[2].querySelectorAll('button')].find((b) => b.textContent === 'Retry');
  assert.equal(retry.getAttribute('aria-label'), 'Retry scan.png');
  click(retry);
  click(rows[3].querySelector('button[aria-label="Remove later.txt"]'));
  assert.deepEqual(log, [['retry', '3'], ['remove', '4']]);
  assert.equal(host.querySelectorAll('.uix-file-upload__item').length, 3);
  unmount();
});

test('Attachment rows: link or download, meta, state slot, remove, statuses (server-renderable)', () => {
  const html = renderToStaticMarkup(h(ui.AttachmentList, { label: 'Attachments (2)' },
    h(ui.Attachment, { name: 'contract.pdf', size: 2_400_000, type: 'application/pdf', href: '/f/1', download: true, meta: 'Ada · 6 Oct', state: h(ui.StatusPill, { tone: 'warning' }, 'Scanning'), locale: 'en' }),
    h(ui.Attachment, { name: 'secret.docx', status: 'forbidden', href: '/f/2' })));
  assert.match(html, /^<ul class="uix-attachments uix-attachments--list" aria-label="Attachments \(2\)">/);
  // The download link is named "Download contract.pdf". Since HAR-1630 that sentence is hidden text
  // inside the link (so it can come from UixLabelsProvider), not an aria-label on it.
  assert.match(html, /<a href="\/f\/1" class="uix-attachment__name" download=""><span aria-hidden="true">contract.pdf<\/span><span class="uix-visually-hidden">Download contract.pdf<\/span><\/a>/);
  assert.match(html, /<span class="uix-attachment__size">2.4 MB<\/span><span>Ada · 6 Oct<\/span>/);
  assert.match(html, /uix-attachment__state"><span class="uix-pill/);
  assert.match(html, /data-status="forbidden"[\s\S]*<span class="uix-attachment__name">secret.docx<\/span>[\s\S]*You do not have access to this file\./, 'forbidden: no link, a reason');

  const removed = [];
  const { host, unmount } = mount(h(ui.AttachmentList, null, h(ui.Attachment, { name: 'old.txt', onRemove: () => removed.push(1), status: 'error', error: 'Could not load.' })));
  click(host.querySelector('button[aria-label="Remove old.txt"]'));
  assert.deepEqual(removed, [1]);
  assert.equal(host.querySelector('.uix-attachment__error').textContent, 'Could not load.');
  unmount();
});

// ── HAR-1630: labels from UixLabelsProvider, base-1024 sizes, a product formatter ─────────────
const GERMAN_UPLOAD = {
  title: 'Dateien hier ablegen', choose: 'Dateien auswählen', drop: 'Loslassen zum Hinzufügen', list: 'Dateien',
  remove: '{name} entfernen', retry: '{name} erneut versuchen', retryShort: 'Erneut', queued: 'Wartet',
  uploading: 'Wird hochgeladen, {progress} %', done: 'Hochgeladen', failed: 'Fehlgeschlagen',
  alt: 'Beschreibung von {name}', added: '{count} hinzugefügt',
  wrongType: '{name} hat keinen zugelassenen Dateityp ({accept}).', tooLarge: '{name} ist größer als {max}.', tooMany: '{name} wurde nicht hinzugefügt: höchstens {max} Dateien.',
};
const GERMAN_ATTACHMENT = { remove: '{name} entfernen', download: '{name} herunterladen', loading: 'Wird geladen…', forbidden: 'Kein Zugriff auf diese Datei.' };

test('formatFileSize: base 1000 by default, base 1024 on request, custom unit labels', () => {
  assert.equal(ui.formatFileSize(1_048_576, 'en'), '1 MB', 'decimal: 1.048576 MB rounds to 1');
  assert.equal(ui.formatFileSize(1_500_000, 'en'), '1.5 MB');
  assert.equal(ui.formatFileSize(1_500_000, 'en', { base: 1024 }), '1.4 MB', 'the same bytes in 1024s');
  assert.equal(ui.formatFileSize(1_048_576, 'en', { base: 1024 }), '1 MB');
  assert.equal(ui.formatFileSize(1023, 'en', { base: 1024 }), '1,023 B', 'below one unit of the base it stays in bytes');
  assert.equal(ui.formatFileSize(1023, 'en'), '1 KB');
  assert.equal(ui.formatFileSize(1024, 'en', { base: 1024 }), '1 KB');
  assert.equal(ui.formatFileSize(5 * 1024 ** 3, 'en', { base: 1024 }), '5 GB');
  assert.equal(ui.formatFileSize(1_048_576, 'en', { base: 1024, units: ['B', 'KiB', 'MiB', 'GiB', 'TiB'] }), '1 MiB');
  assert.equal(ui.formatFileSize(1_500_000, 'de', { base: 1024, units: ['B', 'kB', 'MB', 'GB', 'TB'] }), '1,4 MB', 'locale number format is kept');
  assert.equal(ui.formatFileSize(-1, 'en', { base: 1024 }), '');
});

test('FileUpload reads UixLabelsProvider fileUpload; a labels prop still wins per word', () => {
  const added = [];
  const items = [
    { id: '1', name: 'bericht.pdf', size: 1_500_000, status: 'uploading', progress: 40 },
    { id: '2', name: 'scan.png', size: 2000, status: 'error', error: 'Netzwerk' },
    { id: '3', name: 'fertig.txt', size: 10, status: 'done' },
    { id: '4', name: 'spaeter.txt', size: 10, status: 'queued' },
  ];
  const upload = (props) => h(ui.FileUpload, { items, onFilesAdded: (a, r) => added.push([a.length, r.length]), onRemove() {}, onRetry() {}, accept: '.pdf', maxSize: 1_048_576, locale: 'de', ...props });
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels: { fileUpload: GERMAN_UPLOAD } }, upload({ labels: { choose: 'Datei wählen' } })));
  assert.equal(host.querySelector('.uix-dropzone strong').textContent, 'Dateien hier ablegen');
  assert.equal(host.querySelector('.uix-dropzone .uix-btn').textContent, 'Datei wählen', 'the prop wins over the provider');
  assert.equal(host.querySelector('.uix-file-upload__list').getAttribute('aria-label'), 'Dateien');
  const rows = [...host.querySelectorAll('.uix-file-upload__item')];
  assert.equal(rows[0].querySelector('[role="progressbar"]').getAttribute('aria-label'), 'Wird hochgeladen, 40 %');
  assert.equal(rows[1].querySelector('.uix-file-upload__status').textContent, 'Fehlgeschlagen');
  assert.ok(rows[1].querySelector('button[aria-label="scan.png erneut versuchen"]'));
  assert.equal(rows[1].querySelector('button[aria-label="scan.png erneut versuchen"]').textContent, 'Erneut');
  assert.equal(rows[2].querySelector('.uix-file-upload__status').textContent, 'Hochgeladen');
  assert.equal(rows[3].querySelector('.uix-file-upload__status').textContent, 'Wartet');
  assert.ok(rows[3].querySelector('button[aria-label="spaeter.txt entfernen"]'));

  // the rejection messages and the "added" announcement are translated too
  pick(host.querySelector('input[type="file"]'), [file('ok.pdf', 10, 'application/pdf'), file('bild.png', 10, 'image/png'), file('gross.pdf', 5_000_000, 'application/pdf')]);
  assert.deepEqual([...host.querySelectorAll('.uix-file-upload__errors li')].map((li) => li.textContent),
    ['bild.png hat keinen zugelassenen Dateityp (.pdf).', 'gross.pdf ist größer als 1 MB.']);
  assert.equal(host.querySelector('[role="status"]').textContent, '1 hinzugefügt');
  assert.deepEqual(added, [[1, 2]]);
  unmount();

  // no provider, no prop: English, as before
  const plain = mount(upload({}));
  assert.equal(plain.host.querySelector('.uix-dropzone strong').textContent, 'Drop files here');
  assert.equal(plain.host.querySelector('.uix-dropzone .uix-btn').textContent, 'Choose files');
  plain.unmount();
});

test('FileUpload sizeBase and formatSize: the row size and the "larger than" message use the same counting', () => {
  const items = [{ id: '1', name: 'a.bin', size: 1_500_000, status: 'done' }];
  const sizeOf = (view) => view.host.querySelector('.uix-file-upload__meta span').textContent;
  const decimal = mount(h(ui.FileUpload, { items, onFilesAdded() {}, locale: 'en', maxSize: 1_048_576 }));
  assert.equal(sizeOf(decimal), '1.5 MB');
  decimal.unmount();

  const binary = mount(h(ui.FileUpload, { items, onFilesAdded() {}, locale: 'en', maxSize: 1_048_576, sizeBase: 1024 }));
  assert.equal(sizeOf(binary), '1.4 MB');
  pick(binary.host.querySelector('input[type="file"]'), [file('big.bin', 3_000_000, '')]);
  assert.equal(binary.host.querySelector('.uix-file-upload__errors li').textContent, 'big.bin is larger than 1 MB.');
  binary.unmount();

  const calls = [];
  const custom = mount(h(ui.FileUpload, { items, onFilesAdded() {}, locale: 'de', sizeBase: 1024, formatSize: (bytes, locale) => { calls.push([bytes, locale]); return `${bytes} Bytes`; } }));
  assert.equal(sizeOf(custom), '1500000 Bytes', 'a formatter replaces formatFileSize and sizeBase');
  assert.deepEqual(calls[0], [1_500_000, 'de']);
  custom.unmount();
});

test('Attachment reads UixLabelsProvider attachment for all four words, in server HTML too', () => {
  const rows = (labels) => h(ui.AttachmentList, null,
    h(ui.Attachment, { name: 'vertrag.pdf', href: '/f/1', download: true, onRemove() {}, labels }),
    h(ui.Attachment, { name: 'laedt.pdf', status: 'loading', labels }),
    h(ui.Attachment, { name: 'geheim.docx', status: 'forbidden', labels }));
  const doc = (element) => new dom.window.DOMParser().parseFromString(renderToStaticMarkup(element), 'text/html');

  const german = doc(h(ui.UixLabelsProvider, { labels: { attachment: GERMAN_ATTACHMENT } }, rows()));
  const [first, second, third] = german.querySelectorAll('.uix-attachment');
  const link = first.querySelector('a.uix-attachment__name');
  assert.equal(link.getAttribute('download'), '');
  assert.equal(link.querySelector('[aria-hidden="true"]').textContent, 'vertrag.pdf', 'the visible name');
  assert.equal(link.querySelector('.uix-visually-hidden').textContent, 'vertrag.pdf herunterladen', 'the link is named by the translated sentence');
  assert.equal(link.hasAttribute('aria-label'), false);
  assert.ok(first.querySelector('button[aria-label="vertrag.pdf entfernen"]'));
  assert.match(second.querySelector('.uix-attachment__meta').textContent, /Wird geladen…/);
  assert.equal(second.getAttribute('aria-busy'), 'true');
  assert.match(third.querySelector('.uix-attachment__meta').textContent, /Kein Zugriff auf diese Datei\./);

  // a row's own labels win over the provider, word by word
  const mixed = doc(h(ui.UixLabelsProvider, { labels: { attachment: GERMAN_ATTACHMENT } }, rows({ remove: 'Löschen: {name}' })));
  assert.ok(mixed.querySelector('button[aria-label="Löschen: vertrag.pdf"]'));
  assert.equal(mixed.querySelector('a .uix-visually-hidden').textContent, 'vertrag.pdf herunterladen');

  // no provider: English, and a link that is not a download keeps plain text content
  const english = doc(rows());
  assert.equal(english.querySelector('a .uix-visually-hidden').textContent, 'Download vertrag.pdf');
  assert.ok(english.querySelector('button[aria-label="Remove vertrag.pdf"]'));
  assert.equal(renderToStaticMarkup(h(ui.Attachment, { name: 'offen.pdf', href: '/f/9' })).includes('<a href="/f/9" class="uix-attachment__name">offen.pdf</a>'), true);
  assert.equal(ui.DEFAULT_ATTACHMENT_LABELS.download, 'Download {name}', 'the defaults are still exported as values');
});

test('Attachment sizeBase and formatSize', () => {
  const size = (props) => new dom.window.DOMParser().parseFromString(renderToStaticMarkup(h(ui.Attachment, { name: 'a.bin', size: 1_500_000, locale: 'en', ...props })), 'text/html').querySelector('.uix-attachment__size').textContent;
  assert.equal(size({}), '1.5 MB');
  assert.equal(size({ sizeBase: 1024 }), '1.4 MB');
  assert.equal(size({ formatSize: (bytes) => `${bytes / 1000} kB` }), '1500 kB');
});
