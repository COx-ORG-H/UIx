/* The docs specimens for the state-feedback kit (HAR-2579) are the React components' own markup
 * (packages/tokens/docs/feedback-specimens.js, generated). This test renders them again from the
 * BUILT dist and fails when the committed module differs, so a change to a component's markup
 * cannot leave the docs behind.
 * To update: node packages/react/scripts/render-feedback-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, feedbackSpecimenModule, renderFeedbackSpecimens } from '../scripts/render-feedback-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8');
const specimens = await renderFeedbackSpecimens();

test('the committed specimens are exactly what the components render today', () => {
  assert.equal(feedbackSpecimenModule(specimens), committed, 'packages/tokens/docs/feedback-specimens.js is out of date — run node packages/react/scripts/render-feedback-specimens.mjs');
});

test('the comparison can fail: a changed class is a different module', () => {
  const changed = Object.fromEntries(Object.entries(specimens).map(([route, html]) => [route, html.replace('uix-busy-bar', 'uix-busy-bar-x')]));
  assert.notEqual(feedbackSpecimenModule(changed), committed);
});

test('every state named in a caption is on the page', () => {
  const motion = specimens['examples-motion'];
  // buttons: rest, pending (the busy marker), a success and an error result
  assert.match(motion, /data-uix-btn-busy="true"/);
  assert.match(motion, /class="uix-btn__face" data-result="success"/);
  assert.match(motion, /class="uix-btn__face" data-result="error"/);
  assert.match(motion, /Not assigned/);
  // save status: saving, saved, failed with its retry
  for (const state of ['saving', 'saved', 'failed']) assert.match(motion, new RegExp(`data-state="${state}"`));
  assert.match(motion, /uix-save-status__retry/);
  // busy: a region and a refreshing table wrap, both aria-busy with the bar shown
  assert.match(motion, /class="uix-busy-region" aria-busy="true"/);
  assert.match(motion, /class="uix-table-wrap" aria-busy="true"/);
  assert.equal((motion.match(/class="uix-busy-bar" aria-hidden="true" data-shown="true"/g) ?? []).length, 2);
  // a changed row (tinting its cells) and a ringed pill, both in their just-changed state; a ticked count
  assert.match(motion, /<tr class="uix-change-highlight" data-uix-changed="">/);
  assert.match(motion, /class="uix-change-highlight uix-change-highlight--ring" data-uix-changed="">/);
  assert.match(motion, /class="uix-count" data-uix-tick="up">42</);
  assert.match(motion, /data-feedback-change-run/);
  // a motion list, the tab and segment indicators (hidden until placed), the success outcome
  assert.match(motion, /<ul aria-label="Queue" class="uix-motion-list uix-list"><li class="uix-list__item" data-uix-key="412">/);
  assert.match(motion, /<span class="uix-tabs__indicator" aria-hidden="true" hidden=""><\/span>/);
  assert.match(motion, /<span class="uix-segmented__indicator" aria-hidden="true" hidden=""><\/span>/);
  assert.match(motion, /class="uix-empty uix-success"/);
  assert.match(motion, /role="tabpanel"/, 'tabs without panels point aria-controls at nothing');
  assert.match(motion, /<h3 class="uix-empty__title uix-success__title" tabindex="-1">Request submitted<\/h3>/);
  assert.equal((motion.match(/<ol class="uix-success__steps"><li>/g) ?? []).length, 1);
  // the live demo's target and its announcer
  assert.match(motion, /<button data-feedback-target class="uix-btn uix-btn--primary">/);
  assert.match(motion, /data-feedback-announce/);
});
