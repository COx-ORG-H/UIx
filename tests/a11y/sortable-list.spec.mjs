/* SortableList (HAR-1375; MOTUS C-16) in Chromium: a real mouse drag on the grip (the rows reorder
 * live, the row lands under the pointer, one onReorder per drag), the keyboard path with focus
 * kept on the moved row, no animation on a move, 24 px targets, 320 px, a Drawer, and axe.
 * German harness: tests/sortable-list/harness.tsx. Behaviour details: sortable-list-dom.test.mjs.
 * The `makeRoom` experiment (neighbours move aside) is at the end. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/sortable-list/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#photos')).toBeVisible();
};
const order = (page, id) => page.locator(`#${id} > .uix-sortable__row`).evaluateAll((rows) => rows.map((r) => r.dataset.id));
const log = (page, key) => page.evaluate((k) => window.__sortable[k] ?? [], key);

test('drag the first photo two rows down: it lands under the pointer, one reorder for the whole drag', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const rows = page.locator('#photos > .uix-sortable__row');
  const grip = rows.first().locator('.uix-sortable__grip');
  const g = await grip.boundingBox();
  const third = await rows.nth(2).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, third.y + third.height * 0.75, { steps: 8 });
  await expect(rows.nth(2)).toHaveAttribute('data-dragging', 'true');
  expect(await page.evaluate(() => document.getAnimations().filter((a) => a.timeline === document.timeline).length), 'rows reorder without animating').toBe(0);
  await page.mouse.up();
  expect(await order(page, 'photos')).toEqual(['p2', 'p3', 'p1', 'p4', 'p5']);
  expect(await log(page, 'photos')).toEqual([['p2', 'p3', 'p1', 'p4', 'p5']]);
  await expect(page.locator('#photos ~ [role="status"], #photos-card [role="status"]').first()).toHaveText('Lesesaal am Eröffnungsabend ist jetzt an Position 3 von 5');
});

test('keyboard: Tab reaches Move up / Move down; Enter moves and focus stays with the row; Alt+↓ chains', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const down = page.getByRole('button', { name: 'Antrag prüfen nach unten' }).first();
  await down.focus();
  await page.keyboard.press('Enter');
  expect(await order(page, 'steps')).toEqual(['s2', 's1', 's3']);
  await expect(down).toBeFocused();
  await page.keyboard.press('Alt+ArrowDown');
  expect(await order(page, 'steps')).toEqual(['s2', 's3', 's1']);
  await expect(page.getByRole('button', { name: 'Antrag prüfen nach oben' }).first(), 'at the end, Move up takes focus').toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Benachrichtigen nach unten' })).toBeFocused();
});

test('targets are at least 24 px; a single item has both moves disabled', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  const sizes = await page.locator('#photos button').evaluateAll((buttons) => buttons.map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); }));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
  await expect(page.locator('#single button.uix-sortable__move')).toHaveCount(2);
  for (const b of await page.locator('#single button.uix-sortable__move').all()) await expect(b).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  // At 320 px the moves stack, so a caption keeps room for whole words.
  const stacked = await page.locator('#photos .uix-sortable__moves').first().evaluate((el) => getComputedStyle(el).flexDirection);
  expect(stacked).toBe('column');
});

test('in a Drawer: Alt+↑ moves, Escape still closes the drawer', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#open-drawer').click();
  const up = page.locator('#in-drawer').getByRole('button', { name: 'Benachrichtigen nach oben' });
  await up.focus();
  await page.keyboard.press('Alt+ArrowUp');
  expect(await order(page, 'in-drawer')).toEqual(['s1', 's3', 's2']);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog#drawer')).toHaveJSProperty('open', false);
});

test('axe, light and dark', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.timeline === document.timeline).length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});

/* makeRoom (EXPERIMENT, phone-OS motion study Tier 3 item 16): the DOM keeps its order while a row
 * is dragged; the dragged row follows the pointer and the rows between its place and the target
 * move aside by its height (`translate`, a CSS transition of at most 200 ms). One commit on drop. */
const shifts = (page, id) => page.locator(`#${id} > .uix-sortable__row`).evaluateAll((rows) => rows.map((r) => r.style.translate));
const translateTransitions = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.transitionProperty === 'translate')
  .map((a) => Number(a.effect.getTiming().duration)));
const pitchOf = (page, id) => page.locator(`#${id}`).evaluate((list) => {
  const row = list.querySelector('.uix-sortable__row');
  return row.offsetHeight + parseFloat(getComputedStyle(list).rowGap);
});

test('makeRoom: dragging the first photo two rows down moves those two up by its height; one reorder on drop', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#room')).toHaveAttribute('data-make-room', '');
  const rows = page.locator('#room > .uix-sortable__row');
  const grip = rows.first().locator('.uix-sortable__grip');
  const g = await grip.boundingBox();
  const third = await rows.nth(2).boundingBox();
  const pitch = await pitchOf(page, 'room');
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, third.y + third.height * 0.75, { steps: 12 });
  expect(await order(page, 'room'), 'the DOM keeps its order while dragging').toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  await expect(rows.first()).toHaveAttribute('data-dragging', 'true');
  const during = await shifts(page, 'room');
  expect(during[0], 'the dragged row follows the pointer').toMatch(/^0px \d+(\.\d+)?px$/);
  expect(during.slice(1)).toEqual([`0px ${-pitch}px`, `0px ${-pitch}px`, '', '']);
  const durations = await translateTransitions(page);
  expect(durations.length, 'the neighbours glide').toBeGreaterThan(0);
  for (const d of durations) expect(d).toBeLessThanOrEqual(200);
  expect(await log(page, 'room'), 'nothing is committed while dragging').toEqual([]);
  await page.mouse.up();
  expect(await order(page, 'room')).toEqual(['p2', 'p3', 'p1', 'p4', 'p5']);
  expect(await log(page, 'room')).toEqual([['p2', 'p3', 'p1', 'p4', 'p5']]);
  await expect(page.locator('#room-card [role="status"]')).toHaveText('Lesesaal am Eröffnungsabend ist jetzt an Position 3 von 5');
  // the dropped row glides into the gap, then nothing is left behind
  await expect.poll(() => shifts(page, 'room')).toEqual(['', '', '', '', '']);
  await expect.poll(() => page.locator('#room [data-uix-room]').count()).toBe(0);
});

test('makeRoom: Escape mid-drag glides every row back and reports nothing', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const rows = page.locator('#room > .uix-sortable__row');
  const g = await rows.nth(3).locator('.uix-sortable__grip').boundingBox();
  const first = await rows.first().boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, first.y + 4, { steps: 10 });
  expect((await shifts(page, 'room')).filter(Boolean).length, 'three rows moved down, the dragged one up').toBe(4);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await order(page, 'room')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5']);
  expect(await log(page, 'room')).toEqual([]);
  await expect.poll(() => shifts(page, 'room')).toEqual(['', '', '', '', '']);
});

test('makeRoom in a scroll container of 60 rows: only the rows passed move; a scroll under a still pointer retargets', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const scroller = page.locator('#room-scroller');
  await scroller.scrollIntoViewIfNeeded(); // below the fold at 900 px: the pointer has to reach it
  const pitch = await pitchOf(page, 'room-long');
  await scroller.evaluate((el, top) => { el.scrollTop = top; }, pitch * 29);
  const row = page.locator('#room-long > .uix-sortable__row[data-id="r30"]');
  const g = await row.locator('.uix-sortable__grip').boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  // frame gaps while dragging, for the record (CI machines vary too much to gate on them)
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; if (window.__frames.length < 600) window.__rafId = requestAnimationFrame(tick); };
    window.__rafId = requestAnimationFrame(tick);
  });
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + pitch * 3, { steps: 30 });
  const moved = (await shifts(page, 'room-long')).map((s, i) => (s && i !== 29 ? i : -1)).filter((i) => i >= 0);
  expect(moved, 'rows 31–33 moved up, nothing else').toEqual([30, 31, 32]);
  // the container scrolls one row on, the pointer stays: the row stays under it, one more neighbour moves
  await scroller.evaluate((el, by) => { el.scrollTop += by; }, pitch);
  await expect.poll(async () => (await shifts(page, 'room-long')).filter((s, i) => s && i !== 29).length).toBe(4);
  const frames = await page.evaluate(() => { cancelAnimationFrame(window.__rafId); return window.__frames.slice(1); });
  testInfo.annotations.push({ type: 'frames', description: `60-row drag: ${frames.length} frames, longest ${Math.max(...frames).toFixed(1)} ms` });
  await page.mouse.up();
  const after = await order(page, 'room-long');
  expect(after.indexOf('r30')).toBe(33);
  expect(after.length).toBe(60);
  await expect.poll(async () => (await shifts(page, 'room-long')).filter(Boolean).length).toBe(0);
});

test('makeRoom with a consumer that applies the order later: the dropped row holds in the gap until it does, then lands', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const rows = page.locator('#room-late > .uix-sortable__row');
  await page.locator('#room-late').scrollIntoViewIfNeeded();
  const g = await rows.first().locator('.uix-sortable__grip').boundingBox();
  const third = await rows.nth(2).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, third.y + third.height * 0.75, { steps: 10 });
  await page.mouse.up();
  expect(await log(page, 'room-late')).toEqual([['s2', 's3', 's1']]);
  // not yet applied: the old order, every row still drawn where the drop left it
  expect(await order(page, 'room-late')).toEqual(['s1', 's2', 's3']);
  const held = await shifts(page, 'room-late');
  expect(held.every(Boolean), `held: ${held.join(' | ')}`).toBe(true);
  await expect.poll(() => order(page, 'room-late')).toEqual(['s2', 's3', 's1']);
  await expect.poll(() => shifts(page, 'room-late')).toEqual(['', '', '']);
});

test('makeRoom: a keyboard move glides the two rows and says the same words', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#room').getByRole('button', { name: 'Kinderecke nach oben' }).focus();
  await page.keyboard.press('Enter');
  expect(await order(page, 'room')).toEqual(['p2', 'p1', 'p3', 'p4', 'p5']);
  const durations = await translateTransitions(page);
  expect(durations.length).toBe(2);
  for (const d of durations) expect(d).toBeLessThanOrEqual(200);
  await expect(page.locator('#room-card [role="status"]')).toHaveText('Kinderecke ist jetzt an Position 1 von 5');
  await expect(page.locator('#room').getByRole('button', { name: 'Kinderecke nach unten' }), 'at the top, Move down takes focus').toBeFocused();
});

test('makeRoom under reduced motion: the rows reorder live as without it, nothing glides', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, testInfo);
  await expect(page.locator('#room')).not.toHaveAttribute('data-make-room', '');
  const rows = page.locator('#room > .uix-sortable__row');
  const g = await rows.first().locator('.uix-sortable__grip').boundingBox();
  const third = await rows.nth(2).boundingBox();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, third.y + third.height * 0.75, { steps: 8 });
  expect(await order(page, 'room'), 'live reorder').toEqual(['p2', 'p3', 'p1', 'p4', 'p5']);
  expect(await shifts(page, 'room')).toEqual(['', '', '', '', '']);
  await page.mouse.up();
  expect(await log(page, 'room')).toEqual([['p2', 'p3', 'p1', 'p4', 'p5']]);
});
