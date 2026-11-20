/* DataWorkspace column resize (roadmap #11) in a real browser, in both themes, on
 * tests/column-resize/harness.tsx (bundled in globalSetup). jsdom has no layout, so the widths
 * are measured here:
 *   - pointer: a drag resizes, commits once on release (not per move), and Escape cancels it;
 *   - keyboard: the grip is a separator with aria-valuenow / min / max; ← / → step 8 px, Shift steps
 *     to the scale, Home / End go to the column's floor and the cap, each press commits once;
 *   - one pointer, no drag (WCAG 2.5.7): a click opens the width popover (− / +, a typed width,
 *     Default width), a double-click fits the widest content;
 *   - the widths live in the URL (serializeView) and survive a reload;
 *   - without a flex column the others hold still; a frozen column stays frozen; cards have no grip;
 *   - axe, with the popover open too. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/column-resize/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name === 'dark' ? 'dark' : 'light';
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('#queue tbody tr').first()).toBeVisible();
});

const header = (page, scope, name) => page.locator(`#${scope} thead th`).filter({ hasText: name });
const grip = (page, scope, name) => page.getByRole('separator', { name: `Resize ${name}` }).and(page.locator(`#${scope} [data-resize]`));
const widthOf = async (locator) => Math.round((await locator.boundingBox()).width);
const commits = (page, id) => page.evaluate((key) => window.__commits[key] ?? 0, id);

/** Press the grip and drag it by `dx` in several moves. */
async function drag(page, handle, dx, { release = true } = {}) {
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y, { steps: 6 });
  await page.mouse.move(x + dx, y, { steps: 6 });
  if (release) await page.mouse.up();
}

test('a drag resizes the column and commits once, on release', async ({ page }) => {
  const status = header(page, 'queue', 'Status');
  const assigneeBefore = await widthOf(header(page, 'queue', 'Assignee'));
  expect(await widthOf(status)).toBe(132); // the md tier
  await drag(page, grip(page, 'queue', 'Status'), 60);
  expect(await widthOf(status)).toBe(192);
  expect(await commits(page, 'queue')).toBe(1);
  await expect(page.locator('#queue-url')).toHaveText('widths=status%3A192');
  // the flex title took the change; the other columns kept theirs
  expect(await widthOf(header(page, 'queue', 'Assignee'))).toBe(assigneeBefore);
  await expect(grip(page, 'queue', 'Status')).toHaveAttribute('aria-valuenow', '192');
});

test('while dragging the width follows the pointer; Escape puts it back without a commit', async ({ page }) => {
  const status = header(page, 'queue', 'Status');
  const handle = grip(page, 'queue', 'Status');
  await drag(page, handle, 80, { release: false });
  await expect.poll(() => widthOf(status)).toBe(212);
  await expect(handle).toHaveAttribute('data-drag', '');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await widthOf(status)).toBe(132);
  expect(await commits(page, 'queue')).toBe(0);
  await expect(handle).not.toHaveAttribute('data-drag', '');
});

test('the focused separator resizes from the keyboard and commits each press', async ({ page }) => {
  const status = header(page, 'queue', 'Status');
  const handle = grip(page, 'queue', 'Status');
  await expect(handle).toHaveAttribute('aria-valuemin', '92');
  await expect(handle).toHaveAttribute('aria-valuemax', '960');
  await handle.focus();
  await expect(handle).toHaveAttribute('aria-valuenow', '132');
  await page.keyboard.press('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '140');
  expect(await widthOf(status)).toBe(140);
  await page.keyboard.press('Shift+ArrowRight'); // to the next stop of the scale
  await expect(handle).toHaveAttribute('aria-valuenow', '176');
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(handle).toHaveAttribute('aria-valuenow', '168');
  await page.keyboard.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '92');
  expect(await widthOf(status)).toBe(92);
  expect(await commits(page, 'queue')).toBe(4);
  await expect(page.locator('#queue-url')).toHaveText('widths=status%3A92');
  // a column's own floor (minWidth 112px) is its Home
  const assignee = grip(page, 'queue', 'Assignee');
  await assignee.focus();
  await page.keyboard.press('Home');
  await expect(assignee).toHaveAttribute('aria-valuenow', '112');
  await page.keyboard.press('End');
  await expect(assignee).toHaveAttribute('aria-valuenow', '960');
  // a held key commits once, on key up
  await handle.focus();
  const before = await commits(page, 'queue');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await page.keyboard.up('ArrowRight');
  await expect(handle).toHaveAttribute('aria-valuenow', '116');
  expect(await commits(page, 'queue')).toBe(before + 1);
});

test('a click opens the width popover: − / +, a typed width, Default width (one pointer, no drag)', async ({ page }) => {
  const status = header(page, 'queue', 'Status');
  const handle = grip(page, 'queue', 'Status');
  await handle.click();
  const dialog = page.getByRole('dialog', { name: 'Width of Status' });
  await expect(dialog).toBeVisible();
  const field = dialog.getByRole('spinbutton', { name: 'Width of Status' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('132');
  await dialog.getByRole('button', { name: 'Wider' }).click();
  expect(await widthOf(status)).toBe(176);
  await expect(field).toHaveValue('176');
  await dialog.getByRole('button', { name: 'Narrower' }).click();
  expect(await widthOf(status)).toBe(132);
  await field.fill('250');
  await field.press('Enter');
  await expect(dialog).toBeHidden();
  expect(await widthOf(status)).toBe(250);
  await expect(handle).toBeFocused();
  await expect(page.locator('#queue-url')).toHaveText('widths=status%3A250');
  await handle.press('Enter');
  await dialog.getByRole('button', { name: 'Default width' }).click();
  await expect(dialog).toBeHidden();
  expect(await widthOf(status)).toBe(132);
  await expect(page.locator('#queue-url')).toHaveText('');
  // a width past the cap is held to it
  await handle.press('Enter');
  await expect(dialog).toBeVisible();
  await field.fill('5000');
  await field.press('Enter');
  await expect(dialog).toBeHidden();
  expect(await widthOf(status)).toBe(960);
  await expect(page.locator('#queue-url')).toHaveText('widths=status%3A960');
});

test('Escape in the popover leaves the width as it was', async ({ page }) => {
  await grip(page, 'queue', 'Status').click();
  const dialog = page.getByRole('dialog', { name: 'Width of Status' });
  const field = dialog.getByRole('spinbutton');
  await expect(field).toBeFocused();
  await field.fill('300');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(await widthOf(header(page, 'queue', 'Status'))).toBe(132);
  expect(await commits(page, 'queue')).toBe(0);
});

test('a double-click fits the widest content and opens no popover', async ({ page }) => {
  const handle = grip(page, 'queue', 'Assignee');
  const cell = page.locator('#queue tbody td').filter({ hasText: 'Bartholomew Featherstonehaugh' });
  expect(await cell.evaluate((td) => td.scrollWidth > td.clientWidth)).toBe(true); // truncated at 176
  await handle.dblclick();
  await expect.poll(() => cell.evaluate((td) => td.scrollWidth <= td.clientWidth)).toBe(true);
  expect(await widthOf(header(page, 'queue', 'Assignee'))).toBeGreaterThan(176);
  await page.waitForTimeout(400); // past the double-click window
  await expect(page.getByRole('dialog', { name: 'Width of Assignee' })).toBeHidden();
  expect(await commits(page, 'queue')).toBe(1);
});

test('pressing a grip never sorts its column', async ({ page }) => {
  const priority = header(page, 'queue', 'Priority');
  await grip(page, 'queue', 'Priority').dblclick();
  await drag(page, grip(page, 'queue', 'Priority'), 30);
  await expect(priority).not.toHaveAttribute('aria-sort', /./);
  await priority.getByRole('button', { name: 'Priority' }).click();
  await expect(priority).toHaveAttribute('aria-sort', 'ascending');
});

test('the widths in the URL survive a reload', async ({ page }) => {
  await drag(page, grip(page, 'queue', 'Status'), 44);
  await grip(page, 'queue', 'Assignee').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('#queue-url')).toHaveText('widths=status%3A176%2Cassignee%3A208');
  expect(page.url()).toContain('widths=status%3A176%2Cassignee%3A208');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('#queue tbody tr').first()).toBeVisible();
  expect(await widthOf(header(page, 'queue', 'Status'))).toBe(176);
  expect(await widthOf(header(page, 'queue', 'Assignee'))).toBe(208);
  await expect(grip(page, 'queue', 'Assignee')).toHaveAttribute('aria-valuenow', '208');
});

test('without a flex column the first resize holds the other columns where they are', async ({ page }) => {
  const names = ['Title', 'Status', 'Assignee', 'Priority', 'Updated'];
  const before = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await widthOf(header(page, 'noflex', n))])));
  const table = page.locator('#noflex table');
  const wrap = page.locator('#noflex .uix-table-wrap');
  expect(await widthOf(table)).toBeGreaterThanOrEqual((await widthOf(wrap)) - 2); // fills its wrap
  const title = grip(page, 'noflex', 'Title');
  await title.focus();
  await page.keyboard.press('Shift+ArrowLeft');
  const narrowed = await widthOf(header(page, 'noflex', 'Title'));
  expect(narrowed).toBeLessThan(before.Title);
  for (const n of names.slice(1)) expect(await widthOf(header(page, 'noflex', n))).toBe(before[n]);
  // the table is now as wide as its columns: narrower than the wrap
  expect(await widthOf(table)).toBeLessThan(await widthOf(wrap));
  const saved = JSON.parse(await page.locator('#noflex-widths').textContent());
  expect(Object.keys(saved).sort()).toEqual(['assignee', 'priority', 'status', 'title', 'updated']);
  expect(saved.title).toBe(narrowed);
});

test('a resized frozen column stays frozen while the table scrolls sideways', async ({ page }) => {
  const title = header(page, 'frozen', 'Title');
  await grip(page, 'frozen', 'Title').focus();
  await page.keyboard.press('Shift+ArrowRight');
  expect(await widthOf(title)).toBe(404);
  const wrap = page.locator('#frozen .uix-table-wrap');
  await wrap.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  const [w, t] = await Promise.all([wrap.boundingBox(), title.boundingBox()]);
  expect(Math.abs(t.x - w.x)).toBeLessThanOrEqual(2);
  expect(await commits(page, 'frozen')).toBe(1);
});

test('the cards step has no grips', async ({ page }) => {
  await expect(page.locator('#cards .uix-data-workspace__table--cards')).toBeVisible();
  await expect(page.locator('#cards [data-resize]')).toHaveCount(0);
});

test('grips are 24 px targets on the column edge', async ({ page }) => {
  const th = await header(page, 'queue', 'Status').boundingBox();
  const g = await grip(page, 'queue', 'Status').boundingBox();
  expect(Math.round(g.width)).toBe(24);
  expect(g.height).toBeGreaterThanOrEqual(24);
  expect(Math.round(g.x + g.width)).toBe(Math.round(th.x + th.width));
});

test('axe: no violations, at rest and with the width popover open', async ({ page }) => {
  const scan = () => new AxeBuilder({ page }).include('#queue').include('#noflex').analyze();
  expect((await scan()).violations).toEqual([]);
  await grip(page, 'queue', 'Status').press('Enter');
  await expect(page.getByRole('dialog', { name: 'Width of Status' })).toBeVisible();
  expect((await scan()).violations).toEqual([]);
});
