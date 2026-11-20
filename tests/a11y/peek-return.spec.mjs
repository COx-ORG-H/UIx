/* Experiment (phone-OS motion study, Tier 3 item 12): the way back from a side Peek. A ticket queue
 * (tests/peek-return/harness.tsx) passes `peekRowId` to DataWorkspace. However the Peek closes
 * (Esc, its close button, the backdrop), focus lands on the row whose record it showed and the row
 * plays the arrival cue once: its row colour tinted, then back. Nothing travels: the cue animates
 * the row colour only, and a keyboard open shows the Peek at once. A row resolved in the Peek hands
 * focus to the row in its place, with no cue. Under reduced motion the cue is the steady outline.
 * `?cue=0` (no `peekRowId`) is the queue before the experiment. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/peek-return/harness.html';

async function queue(page, query = '') {
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('tbody tr[data-uix-row-id]')).toHaveCount(12);
}
const row = (page, id) => page.locator(`tbody tr[data-uix-row-id="${id}"]`);
/** The focused row's id, or what has focus when it is not a row. */
const focusedRow = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el?.closest('tr[data-uix-row-id]')?.getAttribute('data-uix-row-id') ?? el?.tagName ?? null;
});
/** The cue as the page draws it: which rows carry it, and the animations running on them. */
const cue = (page) => page.evaluate(() => [...document.querySelectorAll('[data-uix-arrival]')].map((el) => ({
  id: el.getAttribute('data-uix-row-id'),
  animations: el.getAnimations().map((a) => a.animationName),
})));
/** The properties a @keyframes block sets, read from the stylesheet (getKeyframes() leaves out custom properties). */
const keyframeProperties = (page, name) => page.evaluate((wanted) => {
  const props = new Set();
  const walk = (rules) => { for (const rule of rules) {
    if (rule instanceof CSSKeyframesRule && rule.name === wanted) for (const frame of rule.cssRules) for (let i = 0; i < frame.style.length; i += 1) props.add(frame.style[i]);
    else if (rule.cssRules) walk(rule.cssRules);
  } };
  for (const sheet of document.styleSheets) walk(sheet.cssRules);
  return [...props];
}, name);
/** Esc closes the dialog natively; React commits the close a moment later, so focus is polled. */
const landsOn = (page, id) => expect.poll(() => focusedRow(page)).toBe(id);
const cuedIds = (page) => expect.poll(async () => (await cue(page)).map((c) => c.id));
/** Keyboard into the queue: the first row has the tab stop; ↓ to the nth row. */
async function keyToRow(page, steps) {
  await page.locator('tbody tr[data-uix-row-id]').first().focus();
  for (let i = 0; i < steps; i += 1) await page.keyboard.press('ArrowDown');
}

test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'no-preference' }); });

test('Enter opens the Peek at once; Esc closes it onto the row, which plays the arrival cue once', async ({ page }) => {
  await queue(page);
  await keyToRow(page, 3);
  expect(await focusedRow(page)).toBe('INC-20413');
  await page.keyboard.press('Enter');
  const peek = page.getByRole('dialog');
  await expect(peek).toBeVisible();
  // the open stays instant: a keyboard open runs no animation on the panel
  expect(await peek.evaluate((el) => document.getAnimations().filter((a) => a.effect?.target === el).length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(peek).toBeHidden();
  await landsOn(page, 'INC-20413');
  await cuedIds(page).toEqual(['INC-20413']);
  const [only] = await cue(page);
  // nothing travels: the one animation is the row colour
  expect(only.animations).toEqual(['uix-arrival-row']);
  expect(await keyframeProperties(page, 'uix-arrival-row')).toEqual(['--uix-row-bg']);
  // tinted now (the cells paint the row colour), and back to the row's own colour when done
  const tint = () => row(page, 'INC-20413').evaluate((el) => getComputedStyle(el).getPropertyValue('--uix-row-bg').trim());
  const tinted = await tint();
  await expect(row(page, 'INC-20413')).not.toHaveAttribute('data-uix-arrival', { timeout: 5000 });
  expect(await tint()).not.toBe(tinted);
  expect(await focusedRow(page)).toBe('INC-20413');
});

for (const route of ['close button', 'backdrop']) {
  test(`a pointer close (${route}) lands on the row with the cue`, async ({ page }) => {
    await queue(page);
    await row(page, 'INC-20416').locator('.uix-id-cell__btn').click();
    const peek = page.getByRole('dialog');
    await expect(peek).toBeVisible();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || !Number.isFinite(a.effect?.getComputedTiming().iterations)));
    if (route === 'close button') await peek.getByRole('button', { name: 'Vorschau schließen' }).click();
    else await page.mouse.click(8, 450); // the scrim, left of the panel
    await expect(peek).toBeHidden();
    await landsOn(page, 'INC-20416');
    await cuedIds(page).toEqual(['INC-20416']);
  });
}

test('after ↓ in the Peek, the way back is to the record it showed last', async ({ page }) => {
  await queue(page);
  await keyToRow(page, 2);
  await page.keyboard.press('Enter');
  const peek = page.getByRole('dialog');
  await peek.getByRole('button', { name: 'Nächster Datensatz' }).click();
  await peek.getByRole('button', { name: 'Nächster Datensatz' }).click();
  await expect(peek.getByRole('heading')).toContainText('INC-20414');
  await page.keyboard.press('Escape');
  await landsOn(page, 'INC-20414');
  await cuedIds(page).toEqual(['INC-20414']);
});

test('a ticket resolved in the Peek leaves; the row in its place takes focus, with no cue', async ({ page }) => {
  await queue(page);
  await keyToRow(page, 4);
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Lösen' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(row(page, 'INC-20414')).toHaveCount(0);
  await landsOn(page, 'INC-20415');
  expect(await cue(page)).toEqual([]);
});

test('under reduced motion the cue is the steady outline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await queue(page);
  await row(page, 'INC-20411').locator('.uix-id-cell__btn').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Vorschau schließen' }).click();
  await cuedIds(page).toEqual(['INC-20411']);
  const [only] = await cue(page);
  expect(only.animations).toEqual(['uix-arrival-row-static']);
  const outline = await row(page, 'INC-20411').evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
  expect(outline).toEqual({ style: 'solid', width: '2px' });
  await expect(row(page, 'INC-20411')).not.toHaveAttribute('data-uix-arrival', { timeout: 5000 });
});

test('without peekRowId (the queue before): focus goes back to the opener and nothing is cued', async ({ page }) => {
  await queue(page, '?cue=0');
  await keyToRow(page, 2);
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: 'Nächster Datensatz' }).click();
  await page.keyboard.press('Escape');
  // the browser's own focus return: the row that opened it, not the record shown last
  await landsOn(page, 'INC-20412');
  expect(await cue(page)).toEqual([]);
});
