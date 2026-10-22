// Regenerates packages/tokens/docs/feedback-specimens.js: the docs specimens for the
// state-feedback kit (motion rollout WP2, HAR-2579), from the BUILT package, so the styleguide
// shows exactly the markup the components render in each state. The live demos beside them are
// packages/tokens/docs/feedback-demos.js. Precedent: render-uxc-specimens.mjs.
//
//   npm run build:react   (or: npm run build -w @tensor_1/react)
//   node packages/react/scripts/render-feedback-specimens.mjs
//
// packages/react/src/feedback-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { createElement as h, act } from 'react';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/feedback-specimens.js');

const GLOBALS = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'];
const caption = (text) => `<div class="uix-guide__subhead" data-feedback>${text}</div>`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Render every specimen. Returns `{ [route]: html }`. Installs a jsdom for the duration. */
export async function renderFeedbackSpecimens() {
  const saved = new Map(GLOBALS.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  const roots = [];
  try {
    const { createRoot } = await import('react-dom/client');
    const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
    const mount = async (element) => {
      const host = dom.window.document.createElement('div');
      dom.window.document.body.append(host);
      const root = createRoot(host);
      await act(async () => root.render(element));
      roots.push({ root, host });
      return { host, render: (next) => act(async () => root.render(next)) };
    };
    const noop = () => {};

    // ── Button loading and result (HAR-2580, HAR-2581) ───────────────────────────────────
    // One button per state. `loadingDelay: 0` freezes the spinner the delay would show at 300 ms;
    // a result is what shows after an action ends with one.
    const button = (props) => h(ui.Button, { variant: 'primary', resultLabels: { success: 'Saved', error: 'Couldn’t save' }, ...props }, 'Save');
    const rest = await mount(button({ loading: false, result: null }));
    const pending = await mount(button({ loading: true, loadingDelay: 0, result: null }));
    const success = await mount(button({ loading: false, result: null }));
    await success.render(button({ loading: false, result: 'success' }));
    const failure = await mount(button({ variant: 'secondary', loading: false, result: null, resultLabels: { success: 'Assigned', error: 'Not assigned' } }));
    await failure.render(button({ variant: 'secondary', loading: false, result: 'error', resultLabels: { success: 'Assigned', error: 'Not assigned' } }));
    const buttons = [
      caption('Button <code>loading</code> and <code>result</code> (React) — at rest; working (the spinner shows only after 300 ms and then stays at least 500 ms, so a fast save never flashes one; the button keeps its colour); a result, which crossfades in for 1.5 s and is announced, then returns; a failure in words. The button is always as wide as its widest wording, so nothing beside it moves.'),
      '<div class="uix-cluster" data-feedback-buttons>',
      rest.host.innerHTML, pending.host.innerHTML, success.host.innerHTML, failure.host.innerHTML,
      '</div>',
    ].join('\n');

    // ── SaveStatus (HAR-2580) ─────────────────────────────────────────────────────────────
    const saving = await mount(h(ui.SaveStatus, { state: 'saving', delay: 0 }));
    const savedStatus = await mount(h(ui.SaveStatus, { state: 'saved' }));
    const failed = await mount(h(ui.SaveStatus, { state: 'failed', onRetry: noop }));
    const saveStatus = [
      caption('SaveStatus — "Saving…" waits 300 ms (a fast save goes straight to "Saved") and then holds 500 ms; "Could not save" offers a retry'),
      '<div class="uix-cluster" style="--gap:24px" data-feedback-save-status>',
      saving.host.innerHTML, savedStatus.host.innerHTML, failed.host.innerHTML,
      '</div>',
    ].join('\n');

    // ── BusyRegion and TableWrap refreshing (HAR-2582) ───────────────────────────────────
    const rows = [['INC-0412', 'Email outage in Sarajevo office', 'P1'], ['INC-0413', 'VPN drops every 20 minutes', 'P2'], ['INC-0415', 'Printer on floor 3 is jammed', 'P4']];
    const list = h('ul', { className: 'uix-list' }, rows.map(([id, title]) => h('li', { key: id, className: 'uix-list__item' }, `${id} · ${title}`)));
    const table = h(ui.Table, null,
      h('thead', null, h('tr', null, h(ui.Th, null, 'Number'), h(ui.Th, null, 'Title'), h(ui.Th, null, 'Priority'))),
      h('tbody', null, rows.map(([id, title, p]) => h(ui.Tr, { key: id }, h(ui.Td, null, id), h(ui.Td, null, title), h(ui.Td, null, p)))));
    const region = await mount(h(ui.BusyRegion, { busy: true, 'aria-label': 'My queue' }, list));
    const wrap = await mount(h(ui.TableWrap, { refreshing: true }, table));
    await act(async () => { await sleep(ui.PENDING_DELAY_MS + 20); });
    const busy = [
      caption('BusyRegion and TableWrap <code>refreshing</code> — a refetch (filter, sort, page, saved view) keeps the rows: they dim under an indeterminate bar and the region is <code>aria-busy</code>. Skeletons are for a first load only. Under reduced motion the bar stops sweeping and breathes.'),
      '<div class="uix-stack" style="--gap:16px;max-width:40rem" data-feedback-busy>',
      region.host.innerHTML, wrap.host.innerHTML,
      '</div>',
    ].join('\n');

    // ── ChangeHighlight, Count, optimistic rollback (HAR-2583, HAR-2585, HAR-2587) ───────
    // Each rendered once, then changed, so the markup is the "just changed" state.
    const pillRow = (status, tone) => h(ui.Table, null, h('tbody', null,
      h(ui.ChangeHighlight, { as: 'tr', value: status }, h(ui.Td, null, 'INC-0412'), h(ui.Td, null, 'Email outage in Sarajevo office'),
        h(ui.Td, null, h(ui.ChangeHighlight, { value: status, variant: 'ring' }, h(ui.StatusPill, { tone }, status))))));
    const changed = await mount(h(ui.TableWrap, null, pillRow('In progress', 'info')));
    await changed.render(h(ui.TableWrap, null, pillRow('Waiting for customer', 'warning')));
    const count = await mount(h(ui.Count, { value: 41 }));
    await count.render(h(ui.Count, { value: 42 }));
    const change = [
      caption('ChangeHighlight (React <code>ChangeHighlight</code>, <code>useChangeHighlight</code>; plain markup <code>.uix-changed</code>) — a value that changed in place (a live update, the result of a transition, a rolled-back optimistic change) is tinted at once and the tint fades; never on first render. A row tints its cells; something with a colour of its own, like a status pill, gets a ring. Under reduced motion or forced colours: a steady outline for the same time. <code>announce</code> says what changed. Count — a badge or stat value ticks once on a change, up or down; never a loop, never a count-up.'),
      '<div class="uix-stack" style="--gap:12px;max-width:40rem" data-feedback-change>',
      changed.host.innerHTML,
      `<div class="uix-cluster"><a class="uix-navitem" href="#examples-motion" style="min-width:10rem"><span>Inbox</span><span class="uix-navitem__badge">${count.host.innerHTML}</span></a></div>`,
      '</div>',
    ].join('\n');

    // ── Live demo (feedback-demos.js drives it) ──────────────────────────────────────────
    const demo = [
      caption('Try it — the same classes and timings, driven by a pretend server'),
      '<div class="uix-stack" style="--gap:12px;align-items:flex-start" data-feedback-demo>',
      '<div class="uix-cluster" role="group" aria-label="Pretend server">',
      '<button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-feedback-run="150">Answers in 150 ms</button>',
      '<button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-feedback-run="1200">Answers in 1.2 s</button>',
      '<button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-feedback-run="1200" data-feedback-fail>Fails after 1.2 s</button>',
      '<button type="button" class="uix-btn uix-btn--secondary uix-btn--sm" data-feedback-change-run>Change the highlighted values</button>',
      '</div>',
      rest.host.innerHTML.replace('<button ', '<button data-feedback-target '),
      '<span role="status" class="uix-visually-hidden" data-feedback-announce></span>',
      '</div>',
    ].join('\n');

    return { 'examples-motion': [caption('<strong>State feedback</strong> — the kit answers "is it working?", "did it work?" and "what changed?" in place (motion standard §2.3, §2.5, §2.8)'), buttons, saveStatus, busy, change, demo].join('\n') };
  } finally {
    for (const { root, host } of roots) { await act(async () => root.unmount()); host.remove(); }
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

/** The module text for a set of specimens: what the docs import. */
export const feedbackSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-feedback-specimens.mjs — do not edit by hand.
 * The docs specimens for the state-feedback kit (motion rollout WP2, HAR-2579): the markup the
 * built React components render, in the states named in each caption. showcase-data.js appends
 * each block to its route; feedback-demos.js runs the live demo.
 * packages/react/src/feedback-specimens.test.mjs fails when this file and the components differ. */
export const FEEDBACK_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, feedbackSpecimenModule(await renderFeedbackSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
