/* The background-task store (`tasks`, createTaskStore) and the TaskTray that renders it, in jsdom
 * with Node's mock timers (spec: Docs/specs/2026-11-20-task-tray.md).
 *
 * Renders the BUILT dist — run `npm run build` first; CI does.
 */
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

let dom;
let createRoot;
let renderToString;
let ui;

const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('HTMLElement', dom.window.HTMLElement);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ({ renderToString } = await import('react-dom/server'));
  ui = await import('../dist/index.js');
});

after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});

const useFakeTimers = () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
  const real = { set: dom.window.setTimeout, clear: dom.window.clearTimeout };
  dom.window.setTimeout = (fn, ms) => setTimeout(fn, ms);
  dom.window.clearTimeout = (id) => clearTimeout(id);
  return () => { dom.window.setTimeout = real.set; dom.window.clearTimeout = real.clear; mock.timers.reset(); };
};
const tick = (ms) => act(() => { mock.timers.tick(ms); });

const mount = (element) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root, unmount: () => { act(() => root.unmount()); host.remove(); } };
};
const click = (el) => act(() => { el.focus(); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, button: 0 })); });
const key = (el, k) => act(() => el.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })));
const live = (host) => host.querySelector('[role="status"][aria-live="polite"]').textContent;
const rows = (host) => [...host.querySelectorAll('.uix-task-tray__task:not([data-uix-exiting])')];

test('store: newest first, progress defaults, update, and only a running task can finish', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const a = t.start('Export 4,000 tickets', { step: 'Collecting', value: 0, max: 4000 });
  const b = t.start('Discovery run');
  let snap = t.store.getSnapshot();
  assert.deepEqual(snap.map((r) => r.title), ['Discovery run', 'Export 4,000 tickets'], 'newest first');
  assert.equal(snap[0].max, 100, 'max defaults to 100');
  assert.equal(snap[0].value, undefined, 'no value: no measurable end');
  assert.equal(snap[0].cancellable, false, 'no onCancel: no Cancel');
  a.update({ step: 'Writing CSV', value: 2480 });
  snap = t.store.getSnapshot();
  assert.deepEqual([snap[1].step, snap[1].value, snap[1].max], ['Writing CSV', 2480, 4000]);
  a.complete({ message: '4,000 rows written' });
  a.fail({ message: 'too late' });
  a.cancel();
  assert.equal(t.store.get(a.id).status, 'done', 'a finished task does not change state again');
  assert.equal(t.store.get(a.id).message, '4,000 rows written');
  b.fail({ message: '3 hosts unreachable' });
  assert.equal(t.store.get(b.id).status, 'failed');
  assert.ok(t.store.get(b.id).finishedAt >= t.store.get(b.id).startedAt);
});

test('store: cancel aborts the signal, calls onCancel once, and wins over a later complete', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const calls = [];
  const task = t.start('Bulk update 400 tickets', { onCancel: () => calls.push('cancel') });
  assert.equal(t.store.get(task.id).cancellable, true, 'onCancel shows Cancel');
  let statusSeenByAbort;
  task.signal.addEventListener('abort', () => { statusSeenByAbort = t.store.get(task.id).status; });
  t.cancel(task.id);
  t.cancel(task.id);
  task.complete({ message: 'done anyway' });
  assert.equal(task.signal.aborted, true);
  assert.equal(statusSeenByAbort, 'cancelled', 'the abort sees the cancelled state');
  assert.deepEqual(calls, ['cancel']);
  assert.equal(t.store.get(task.id).status, 'cancelled');
  const hidden = t.start('Hidden cancel', { onCancel: () => {}, cancellable: false });
  assert.equal(t.store.get(hidden.id).cancellable, false);
});

test('store: a restart with the same id keeps the row, counts a new run, and retires the old handle', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const first = t.start('Import users.csv', { id: 'import' });
  t.start('Export', { id: 'export' });
  first.fail({ message: '12 rows invalid' });
  const second = t.start('Import users.csv', { id: 'import', value: 0 });
  assert.deepEqual(t.store.getSnapshot().map((r) => r.id), ['export', 'import'], 'the row stays where it was');
  assert.equal(t.store.get('import').run, 1);
  assert.equal(t.store.get('import').status, 'running');
  first.complete();
  assert.equal(t.store.get('import').status, 'running', 'the first run cannot finish the second');
  second.complete({ message: '1,204 users imported' });
  assert.equal(t.store.get('import').status, 'done');
});

test('store: dismiss without an id clears finished tasks only; dismissAfter removes later', () => {
  const restore = useFakeTimers();
  try {
    const t = ui.createTaskApi(ui.createTaskStore());
    const running = t.start('Still going');
    const done = t.start('Done one');
    const failed = t.start('Failed one');
    done.complete();
    failed.fail();
    t.clearFinished();
    assert.deepEqual(t.store.getSnapshot().map((r) => r.id), [running.id]);
    running.complete({ message: 'ok', dismissAfter: 5000 });
    mock.timers.tick(4999);
    assert.equal(t.store.getSnapshot().length, 1);
    mock.timers.tick(1);
    assert.equal(t.store.getSnapshot().length, 0);
    const kept = t.start('Running and dismissed');
    t.dismiss(kept.id);
    assert.equal(kept.signal.aborted, false, 'dismiss never stops the work');
  } finally { restore(); }
});

test('run: resolve completes with the success result; reject fails; an abort stays cancelled', async () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const value = await t.run('Export', async (task) => { task.update({ step: 'Writing', value: 50 }); return 4000; }, {
    success: (n) => ({ message: `${n} rows written`, action: { label: 'Download', href: '/x.csv', download: 'x.csv' } }),
  });
  assert.equal(value, 4000);
  const [exported] = t.store.getSnapshot();
  assert.deepEqual([exported.status, exported.message, exported.action.label, exported.cancellable], ['done', '4000 rows written', 'Download', true]);

  await t.run('Import', async () => { throw new Error('12 rows invalid'); }, { error: (e) => e.message }).catch(() => {});
  assert.deepEqual([t.store.getSnapshot()[0].status, t.store.getSnapshot()[0].message], ['failed', '12 rows invalid']);

  const aborted = t.run('Discovery', (task) => new Promise((_, reject) => {
    task.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  }), { error: 'should not show' });
  t.cancel(t.store.getSnapshot()[0].id);
  await aborted.catch(() => {});
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(t.store.getSnapshot()[0].status, 'cancelled');
  assert.equal(t.store.getSnapshot()[0].message, undefined, 'the error text is not shown after a cancel');

  await t.run('Sync throw', () => { throw new Error('boom'); }, { error: 'Could not start' }).catch(() => {});
  assert.deepEqual([t.store.getSnapshot()[0].status, t.store.getSnapshot()[0].message], ['failed', 'Could not start']);
});

test('TaskTray: no task renders only the live region; on the server too', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store }));
  try {
    assert.equal(host.querySelector('section'), null, 'no landmark without a task');
    assert.ok(host.querySelector('[role="status"][aria-live="polite"]'), 'the live region is mounted before any task');
  } finally { unmount(); }
  const html = renderToString(h(ui.TaskTray, { store: t.store }));
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /uix-task-tray__pill/);
});

test('TaskTray: a landmark with a pill that counts, a panel that opens, and rows with progress', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store }));
  try {
    let exp;
    act(() => {
      exp = t.start('Export 4,000 tickets', { step: 'Writing CSV', value: 2480, max: 4000, onCancel: () => {} });
      t.start('CMDB discovery: Sarajevo DC', { step: 'Scanning subnets' });
    });
    const region = host.querySelector('section.uix-task-tray');
    assert.equal(region.getAttribute('aria-label'), 'Background tasks');
    const pill = region.querySelector('.uix-task-tray__pill');
    assert.equal(pill.getAttribute('aria-expanded'), 'false');
    assert.equal(pill.textContent.replace(/\s+/g, ' ').trim(), 'Background tasks: 2 running');
    assert.ok(pill.querySelector('.uix-spinner'), 'a task with no measurable end: the pill shows a spinner');
    const panel = document.getElementById(pill.getAttribute("aria-controls"));
    assert.equal(panel.hidden, true);

    click(pill);
    assert.equal(pill.getAttribute('aria-expanded'), 'true');
    assert.equal(panel.hidden, false);
    assert.ok(document.activeElement === pill, 'opening leaves focus on the pill');
    const [disc, expRow] = rows(host);
    assert.ok(disc.hasAttribute('data-uix-key'), 'MotionList reaches the row (its arrive, leave and focus hand-off)');
    assert.equal(disc.getAttribute('aria-busy'), 'true');
    const bar = expRow.querySelector('[role="progressbar"]');
    assert.deepEqual([bar.getAttribute('aria-valuenow'), bar.getAttribute('aria-valuemax'), bar.getAttribute('aria-label')], ['2480', '4000', 'Export 4,000 tickets']);
    assert.match(expRow.querySelector('.uix-task-tray__line').textContent, /^Writing CSV · 62\s?%$/);
    assert.equal(disc.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'), null, 'indeterminate');
    assert.equal(disc.querySelector('button'), null, 'no onCancel: no Cancel');
    assert.equal(expRow.querySelector('button').textContent, 'Cancel');

    act(() => exp.complete({ message: '4,000 rows written', action: { label: 'Download', href: '/exports/t.csv', download: 'tickets.csv' } }));
    const link = rows(host)[1].querySelector('a.uix-task-tray__btn--action');
    assert.deepEqual([link.textContent, link.getAttribute('href'), link.getAttribute('download')], ['Download', '/exports/t.csv', 'tickets.csv']);
    assert.equal(rows(host)[1].getAttribute('aria-busy'), null);
    assert.equal(rows(host)[1].querySelector('.uix-task-tray__line').textContent.replace(/\s+/g, ' '), 'Done · , 4,000 rows written');
    assert.equal(pill.textContent.replace(/\s+/g, ' ').trim(), 'Background tasks: 1 running', 'done tasks are not counted while others run');

    key(rows(host)[1].querySelector('a'), 'Escape');
    assert.equal(pill.getAttribute('aria-expanded'), 'false');
    assert.ok(document.activeElement === pill, 'Escape collapses onto the pill');
  } finally { unmount(); }
});

test('TaskTray: Cancel hands focus to the same row; the last dismiss gives focus back to where it came from', () => {
  const restore = useFakeTimers();
  const t = ui.createTaskApi(ui.createTaskStore());
  const before = document.createElement('button');
  before.textContent = 'Start export';
  document.body.append(before);
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store, defaultOpen: true }));
  try {
    before.focus();
    act(() => { t.start('Bulk update 400 tickets', { onCancel: () => {} }); });
    const cancel = rows(host)[0].querySelector('button');
    act(() => cancel.focus());
    // focus arrived from the button outside
    act(() => cancel.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true, relatedTarget: before })));
    click(cancel);
    const dismiss = rows(host)[0].querySelector('.uix-task-tray__dismiss');
    assert.equal(rows(host)[0].dataset.status, 'cancelled');
    assert.ok(document.activeElement === dismiss, 'focus moved to the row\'s Dismiss');
    click(dismiss);
    tick(1000);
    assert.equal(host.querySelector('section'), null, 'the tray is gone with its last task');
    assert.ok(document.activeElement === before, 'focus went back to where it came from');
  } finally { unmount(); before.remove(); restore(); }
});

test('TaskTray: a result action runs, then the task leaves; keep holds it', () => {
  const restore = useFakeTimers();
  const t = ui.createTaskApi(ui.createTaskStore());
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store, defaultOpen: true }));
  try {
    const opened = [];
    act(() => {
      t.start('Import users.csv').fail({ message: '12 rows invalid', action: { label: 'Retry', onClick: () => opened.push('retry') } });
      t.start('Report').complete({ action: { label: 'Open', onClick: () => opened.push('open'), keep: true } });
    });
    const [report, importRow] = rows(host);
    click(importRow.querySelector('.uix-task-tray__btn--action'));
    click(report.querySelector('.uix-task-tray__btn--action'));
    tick(0);
    assert.deepEqual(opened, ['retry', 'open']);
    assert.deepEqual(t.store.getSnapshot().map((r) => r.title), ['Report'], 'Retry dismissed its task; keep held the other');
    assert.equal(host.querySelector('.uix-task-tray__pill').textContent.replace(/\s+/g, ' ').trim(), 'Background tasks: 1 done');
  } finally { unmount(); restore(); }
});

test('TaskTray: announces starts and endings politely, never progress, and not what was there before', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  t.start('Already running');
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store }));
  try {
    assert.equal(live(host), '', 'a task from before the tray mounted is not announced');
    let task;
    act(() => { task = t.start('Export 4,000 tickets', { value: 0, max: 4000 }); });
    assert.equal(live(host), 'Started: Export 4,000 tickets');
    act(() => task.update({ value: 2000, step: 'Writing CSV' }));
    assert.equal(live(host), 'Started: Export 4,000 tickets', 'progress is not announced');
    act(() => task.complete({ message: '4,000 rows written' }));
    assert.equal(live(host), 'Started: Export 4,000 tickets Done: Export 4,000 tickets. 4,000 rows written');
    act(() => t.start('Import').fail({ message: '12 rows invalid' }));
    assert.match(live(host), /4,000 rows written Failed: Import\. 12 rows invalid$/, 'a task that starts and fails at once is announced once, as failed');
  } finally { unmount(); }
});

test('TaskTray: UixLabelsProvider translates the landmark, the counts and the announcements', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const labels = {
    taskTray: {
      region: 'Hintergrundaufgaben',
      running: (n) => (n === 1 ? 'läuft' : 'laufen'),
      cancel: 'Abbrechen',
      status: { done: 'Fertig', failed: 'Fehlgeschlagen', cancelled: 'Abgebrochen' },
      announceStarted: (title) => `Gestartet: ${title}`,
    },
  };
  const { host, unmount } = mount(h(ui.UixLabelsProvider, { labels }, h(ui.TaskTray, { store: t.store })));
  try {
    let task;
    act(() => { task = t.start('Export', { onCancel: () => {} }); });
    assert.equal(host.querySelector('section').getAttribute('aria-label'), 'Hintergrundaufgaben');
    assert.equal(host.querySelector('.uix-task-tray__pill').textContent.replace(/\s+/g, ' ').trim(), 'Hintergrundaufgaben: 1 läuft');
    assert.equal(live(host), 'Gestartet: Export');
    assert.equal(rows(host)[0].querySelector('button').textContent, 'Abbrechen');
    act(() => task.fail({ message: 'Zeitüberschreitung' }));
    assert.match(live(host), /Fehlgeschlagen: Export\. Zeitüberschreitung$/, 'the translated state names the ending');
  } finally { unmount(); }
});

test('store: a generated id never takes a caller\'s id; a dismissed running task can still be cancelled', () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  const probe = t.start('Probe');
  const next = `uix-task-${Number(probe.id.split('-').pop()) + 1}`;
  const mine = t.start('Mine', { id: next });
  const auto = t.start('Auto');
  assert.notEqual(auto.id, next);
  assert.equal(t.store.get(next).status, 'running', 'the caller\'s task was not restarted');
  assert.equal(mine.signal.aborted, false);

  const calls = [];
  const hidden = t.start('Bulk update', { onCancel: () => calls.push('cancel') });
  t.dismiss(hidden.id);
  assert.equal(t.store.get(hidden.id), undefined);
  hidden.cancel();
  hidden.cancel();
  assert.equal(hidden.signal.aborted, true, 'cancel still stops dismissed work');
  assert.deepEqual(calls, ['cancel']);
  const done = t.start('Export');
  t.dismiss(done.id);
  done.complete();
  assert.equal(t.store.get(done.id), undefined, 'ending dismissed work adds no row');
});

test('run: a success or error callback that throws still ends the task', async () => {
  const t = ui.createTaskApi(ui.createTaskStore());
  await t.run('Export', async () => 1, { success: () => { throw new Error('format'); } });
  await t.run('Import', async () => { throw null; }, { error: (e) => e.message }).catch(() => {});
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(t.store.getSnapshot().map((r) => [r.title, r.status]), [['Import', 'failed'], ['Export', 'done']]);
});

test('TaskTray: a Retry that restarts the same id keeps its new row, focusable; the panel fades before it hides', () => {
  const restore = useFakeTimers();
  const t = ui.createTaskApi(ui.createTaskStore());
  const { host, unmount } = mount(h(ui.TaskTray, { store: t.store, defaultOpen: true }));
  try {
    act(() => {
      t.start('Import users.csv', { id: 'import' }).fail({
        message: '12 rows invalid',
        action: { label: 'Retry', onClick: () => t.start('Import users.csv', { id: 'import', onCancel: () => {} }) },
      });
    });
    click(rows(host)[0].querySelector('.uix-task-tray__btn--action'));
    tick(0);
    assert.equal(t.store.get('import')?.status, 'running', 'the restarted run stays');
    assert.equal(rows(host).length, 1);

    // a row dismissed and back before its exit ends is not left inert
    act(() => t.store.finish('import', 'done'));
    act(() => t.dismiss('import'));
    act(() => { t.start('Import users.csv', { id: 'import', onCancel: () => {} }); });
    const row = host.querySelector('.uix-task-tray__task[data-uix-key="import"]');
    assert.equal(row.hasAttribute('inert'), false);
    assert.equal(row.hasAttribute('data-uix-exiting'), false);

    const panel = host.querySelector('.uix-task-tray__panel');
    key(row.querySelector('button'), 'Escape');
    assert.equal(panel.hidden, false, 'still shown while it closes');
    assert.ok(panel.hasAttribute('data-closing'));
    assert.ok(panel.hasAttribute('inert'), 'nothing in a closing panel takes focus');
    tick(200);
    assert.equal(panel.hidden, true);
    assert.equal(panel.hasAttribute('inert'), false);
  } finally { unmount(); restore(); }
});

test('TaskTray: a controlled close shows the exit before the panel is hidden', () => {
  const restore = useFakeTimers();
  const t = ui.createTaskApi(ui.createTaskStore());
  t.start('Export');
  const { host, root, unmount } = mount(h(ui.TaskTray, { store: t.store, open: true }));
  try {
    const panel = host.querySelector('.uix-task-tray__panel');
    assert.equal(panel.hidden, false);
    act(() => root.render(h(ui.TaskTray, { store: t.store, open: false })));
    assert.equal(panel.hidden, false, 'the first closed commit still shows the panel');
    assert.ok(panel.hasAttribute('data-closing'));
    tick(200);
    assert.equal(panel.hidden, true);
    act(() => root.render(h(ui.TaskTray, { store: t.store, open: true })));
    assert.equal(panel.hidden, false);
    assert.equal(panel.hasAttribute('data-closing'), false);
  } finally { unmount(); restore(); }
});
