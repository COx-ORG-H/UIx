/* Label in name (WCAG 2.5.3, level A) over every explorer route and every React harness page.
 *
 * A control whose name the author wrote (aria-label, aria-labelledby) must say the words it shows,
 * so a voice-control user who says what they see ("click 09:00 Backup check") reaches it. The
 * check and what counts as the visible label are in ./label-in-name.mjs; axe's experimental
 * `label-content-name-mismatch` is not used because it joins block text without spaces.
 *
 * Found and fixed when the check was added: scheduling chips and bars named "Title, state, …"
 * while they show "HH:MM Title" (now the shown words are the title in the name); the time grid's
 * day heads ("Sun 25.10." named "Sunday 25.10.2026"); a tall timeline window repeating its words;
 * the org chart's avatar initials; the search suggestion's help line (now its description).
 *
 * Names do not change with the theme, so this runs once (light). Every explorer route takes
 * about six seconds in all.
 */
import { test, expect } from '@playwright/test';
import { discoverHarnesses } from '../global-setup.mjs';
import { explorerRoutes, showRoute } from './explorer-walk.mjs';
import { labelInNameViolations } from './label-in-name.mjs';

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'theme-independent'));

const report = (found) => found.map((f) => `${f.where} ${f.control}\n    shows: "${f.label}"\n    named: "${f.name}"`).join('\n');

test('every control on every explorer route says the words it shows', async ({ page }) => {
  test.setTimeout(180_000);
  const routes = await explorerRoutes(page);
  const found = [];
  for (const slug of routes) {
    await showRoute(page, slug);
    for (const hit of await page.evaluate(labelInNameViolations, '[data-docs-page]')) found.push({ where: `#${slug}`, ...hit });
  }
  expect(found, `${found.length} control(s) whose name leaves out what they show:\n${report(found)}`).toEqual([]);
});

test('every control on every React harness page says the words it shows', async ({ page }) => {
  test.setTimeout(180_000);
  const harnesses = await discoverHarnesses();
  expect(harnesses.length, 'the harnesses were found').toBeGreaterThan(10);
  const found = [];
  for (const { name } of harnesses) {
    await page.goto(`/tests/${name}/harness.html`, { waitUntil: 'networkidle' });
    for (const hit of await page.evaluate(labelInNameViolations, 'body')) found.push({ where: `tests/${name}`, ...hit });
  }
  expect(found, `${found.length} control(s) whose name leaves out what they show:\n${report(found)}`).toEqual([]);
});

/* The check itself: a voice command fails on each of these, and passes on the fixed shapes. */
test('the check flags a name that leaves out the shown words, and only that', async ({ page }) => {
  await page.setContent(`<main>
    <button id="bad-order" aria-label="Certificate renewal, Scheduled"><span>09:00</span> <span>Certificate renewal</span></button>
    <button id="good-order" aria-label="09:00 Certificate renewal, Scheduled"><span>09:00</span> <span>Certificate renewal</span></button>
    <button id="abbrev" aria-label="Sunday 25.10.2026">Sun 25.10.</button>
    <button id="blocks" aria-label="Hold, Quarter close"><span style="display:block">Hold</span><span style="display:block">Quarter close</span></button>
    <div role="option" id="described" aria-label="Time zone" aria-describedby="d1" tabindex="-1"><span>Time zone</span> <span id="d1">Used for due dates</span></div>
    <div role="option" id="undescribed" aria-label="Time zone" tabindex="-1"><span>Time zone</span> <span>Used for due dates</span></div>
    <button id="icon" aria-label="Close">×</button>
    <button id="hidden-extra" aria-label="Assign"><span>Assign</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">to me</span></button>
    <label for="f1">Owner</label><input id="f1" aria-label="Assignee">
    <label for="f2">Owner</label><input id="f2" aria-label="Owner of the ticket">
  </main>`);
  const flagged = (await page.evaluate(labelInNameViolations, 'main')).map((f) => f.label);
  expect(flagged).toEqual(['09 00 certificate renewal', 'sun 25 10', 'time zone used for due dates', 'owner']);
});
