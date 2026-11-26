/* The docs specimens for comment threads (HAR-4713) are the React components' own markup
 * (packages/tokens/docs/comment-specimens.js, generated). Renders them again from the BUILT dist and
 * fails when the committed module differs. To update: node packages/react/scripts/render-comment-specimens.mjs
 * Run: node --test (from packages/react), after the build. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIMEN_MODULE, commentSpecimenModule, renderCommentSpecimens } from '../scripts/render-comment-specimens.mjs';

const committed = readFileSync(SPECIMEN_MODULE, 'utf8').replace(/\r\n/g, '\n');
const specimens = await renderCommentSpecimens();

test('the committed comment specimens are exactly what the components render today', () => {
  const rendered = commentSpecimenModule(specimens);
  const at = [...rendered].findIndex((char, i) => char !== committed[i]);
  const where = at === -1 ? '' : ` First difference at ${at}: rendered …${rendered.slice(Math.max(0, at - 80), at + 80)}…`;
  assert.ok(rendered === committed, `packages/tokens/docs/comment-specimens.js is out of date — run node packages/react/scripts/render-comment-specimens.mjs.${where}`);
});

test('every approved piece is on the page, in German, with no amber or red', () => {
  const page = specimens['examples-crm-itsm'];
  for (const piece of [
    'data-audience="internal"', 'data-audience="external"', 'uix-comment-thread__rail', '2 weitere Antworten', 'data-uix-shortcut-scope', 'uix-action-panel', 'aria-label="Aktionen anzeigen" aria-haspopup="dialog"',
    'uix-comment__unread">Neu<', 'uix-comment-new__divider', 'aria-label="Neu seit Ihrem letzten Besuch"',
    'role="status">1 von 3<', 'Anzeigen<svg', 'Intern speichern', 'An Sophie Wagner senden', 'Sophie Wagner sieht das nicht.',
    'Geht per E-Mail an Sophie Wagner.', 'uix-comment-thread__draft-tag">Entwurf<', 'uix-comment__files', 'uix-file-row',
    'aria-label="Daumen hoch, 1, Mia Koch"', 'aria-label="Wer sieht die Antwort?"',
  ]) assert.ok(page.includes(piece), piece);
  // no amber or red: not in the markup, not in the stylesheet
  assert.doesNotMatch(page, /--uix-(warning|danger|critical|attention)|uix-pill--(danger|critical|warning)/);
  const css = readFileSync(new URL('../../tokens/styles/components/comments.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /--uix-(warning|danger|critical|attention|amber|red)/);
  // the viewer's own new reply folds and has no chip; an older new reply of someone else stays
  const between = (a, b) => page.slice(page.indexOf(`id="${a}"`), page.indexOf(`id="${b}"`));
  assert.match(between('cs-r2', 'cs-r3'), /^id="cs-r2" tabindex="-1" hidden=""/);
  assert.doesNotMatch(between('cs-r2', 'cs-r3'), /uix-comment__unread/);
  assert.match(between('cs-r3', 'cs-r4'), /^id="cs-r3" tabindex="-1">[^]*uix-comment__unread">Neu</);
  // every reply in the worklog says who sees it
  const worklog = page.slice(page.indexOf('data-comment-example="worklog"'), page.indexOf('data-comment-example="composer"'));
  for (const id of ['cs-r1', 'cs-r2', 'cs-r3', 'cs-r4', 'cs-r5', 'cs-r6', 'cs-s1', 'cs-s2']) {
    assert.match(worklog.slice(worklog.indexOf(`id="${id}"`)), /^[^]*?uix-comment__audience" data-audience="(internal|external)"/, id);
  }
  // the draft marker shows the first line only
  assert.match(page, /draft-text">Danke, ich gebe dem Betreiber Bescheid\.</);
  // the 320 px notice has one entry: no stepper
  const phone = page.slice(page.indexOf('data-comment-example="phone"'));
  assert.doesNotMatch(phone.slice(0, phone.indexOf('uix-comment-thread')), /role="status"/);
});
