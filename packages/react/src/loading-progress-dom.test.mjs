/* The gaps TENSOR found moving its loading and progress surfaces onto the kit (HAR-1606):
 *   1. Spinner `size="sm"` (16 px) — it keeps the role="status" + hidden-text contract;
 *   2. Meter `tone="neutral"` / `"accent"` — a fill that is not a status, so no tone is spoken;
 *   3. Heartbeat / LiveIndicator over the existing .uix-heartbeat / .uix-live CSS, decorative
 *      unless labelled.
 * Markup only, so no DOM is needed. The sizes, the 3:1 fill contrast in a browser and the ring
 * stopping under prefers-reduced-motion are tests/a11y/tensor-gaps.spec.mjs; the contrast for
 * every theme is packages/tokens/tests/meter-contrast.test.mjs.
 * Renders the BUILT dist — run `npm run build` first.
 */
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let ui;
before(async () => { ui = await import('../dist/index.js'); });

const HIDDEN_TEXT = (text) => `<span class="uix-visually-hidden">${text}</span>`;

test('Spinner size="sm": a class for the 16 px ring, the same status role and announced text', () => {
  assert.equal(renderToStaticMarkup(h(ui.Spinner, { size: 'sm' })), `<span class="uix-spinner uix-spinner--sm" role="status">${HIDDEN_TEXT('Loading…')}</span>`);
  assert.equal(renderToStaticMarkup(h(ui.Spinner, { size: 'sm', label: 'Uploading scan.png', accent: true })),
    `<span class="uix-spinner uix-spinner--accent uix-spinner--sm" role="status">${HIDDEN_TEXT('Uploading scan.png')}</span>`);
  // the other sizes are unchanged
  assert.equal(renderToStaticMarkup(h(ui.Spinner)), `<span class="uix-spinner" role="status">${HIDDEN_TEXT('Loading…')}</span>`);
  assert.equal(renderToStaticMarkup(h(ui.Spinner, { size: 'md' })), `<span class="uix-spinner" role="status">${HIDDEN_TEXT('Loading…')}</span>`);
  assert.match(renderToStaticMarkup(h(ui.Spinner, { size: 'lg' })), /^<span class="uix-spinner uix-spinner--lg" role="status">/);
});

test('Meter tone="neutral" and "accent": the fill carries the tone, and nothing is spoken for it', () => {
  for (const tone of ['neutral', 'accent']) {
    const html = renderToStaticMarkup(h(ui.Meter, { value: 42, tone, label: 'Option A' }));
    assert.match(html, new RegExp(`<div class="uix-meter__fill" style="width:42%" data-tone="${tone}"></div>`));
    assert.match(html, /role="meter" aria-valuenow="42" aria-valuemin="0" aria-valuemax="100" aria-label="Option A"/);
    assert.doesNotMatch(html, /aria-valuetext/, `${tone} is not a status: the number is all there is to say`);
  }
  // toneLabels cannot give them a word either
  assert.doesNotMatch(renderToStaticMarkup(h(ui.Meter, { value: 10, tone: 'neutral', toneLabels: { warning: 'Warnung' } })), /aria-valuetext/);
});

test('Meter: the default and the status tones are unchanged', () => {
  const plain = renderToStaticMarkup(h(ui.Meter, { value: 30 }));
  assert.doesNotMatch(plain, /data-tone|aria-valuetext/, 'default: success green, implicit');
  assert.doesNotMatch(renderToStaticMarkup(h(ui.Meter, { value: 30, tone: 'success' })), /data-tone|aria-valuetext/);
  assert.match(renderToStaticMarkup(h(ui.Meter, { value: 91, tone: 'danger' })), /aria-valuetext="91%, critical"[^>]*>.*data-tone="danger"/s);
  assert.match(renderToStaticMarkup(h(ui.Meter, { value: 70, tone: 'warning', toneLabels: { warning: 'Warnung' } })), /aria-valuetext="70%, Warnung"/);
  assert.match(renderToStaticMarkup(h(ui.Meter, { value: 5, tone: 'overdue' })), /aria-valuetext="5%, overdue"/);
});

test('Heartbeat: the existing three spans, a class per state, decorative unless it has a label', () => {
  assert.equal(renderToStaticMarkup(h(ui.Heartbeat)),
    '<span class="uix-heartbeat" aria-hidden="true"><span class="uix-heartbeat__ping"></span><span class="uix-heartbeat__dot"></span></span>');
  assert.equal(renderToStaticMarkup(h(ui.Heartbeat, { state: 'live' })), renderToStaticMarkup(h(ui.Heartbeat)));
  for (const state of ['idle', 'warning', 'danger']) {
    assert.match(renderToStaticMarkup(h(ui.Heartbeat, { state })), new RegExp(`^<span class="uix-heartbeat uix-heartbeat--${state}" aria-hidden="true">`));
  }
  const labelled = renderToStaticMarkup(h(ui.Heartbeat, { state: 'danger', label: 'Connection lost', className: 'mine', 'data-testid': 'beat' }));
  assert.match(labelled, /^<span class="uix-heartbeat uix-heartbeat--danger mine" role="img" aria-label="Connection lost" data-testid="beat">/);
  assert.doesNotMatch(labelled, /aria-hidden/);
});

test('LiveIndicator: the dot with its state in text beside it', () => {
  assert.equal(renderToStaticMarkup(h(ui.LiveIndicator, null, 'Live')),
    '<span class="uix-live"><span class="uix-heartbeat" aria-hidden="true"><span class="uix-heartbeat__ping"></span><span class="uix-heartbeat__dot"></span></span>Live</span>');
  const idle = renderToStaticMarkup(h(ui.LiveIndicator, { state: 'idle', className: 'war-room', id: 'feed-state' }, 'Paused'));
  assert.match(idle, /^<span class="uix-live war-room" id="feed-state"><span class="uix-heartbeat uix-heartbeat--idle" aria-hidden="true">/);
  assert.match(idle, />Paused<\/span>$/);
});
