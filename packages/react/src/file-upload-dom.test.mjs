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
  assert.match(html, /<a href="\/f\/1" class="uix-attachment__name" download="" aria-label="Download contract.pdf">contract.pdf<\/a>/);
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
