/* Undo deltas in a browser (enterprise UX study, roadmap #23; spec Docs/specs/2026-11-20-undo-deltas.md),
 * on the docs' live demo (tests/toast-undo/harness.tsx): resolving tickets in a row merges into one
 * toast with a countdown bar that shrinks on transform and stops on hover and focus; reduced motion
 * shows the seconds instead; Ctrl+Z (⌘Z on a Mac) undoes the newest and says so, but never inside a
 * text field; the ? sheet lists it; an alert storm is summarised; Do not disturb holds normal toasts
 * and still shows errors; axe finds nothing serious, in both themes. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/toast-undo/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

const open = async (page, testInfo, platform = 'Win32') => {
  await page.addInitScript(([t, p]) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
    Object.defineProperty(navigator, 'platform', { get: () => p });
    Object.defineProperty(navigator, 'userAgentData', { get: () => ({ platform: p === 'MacIntel' ? 'macOS' : 'Windows' }) });
  }, [themeOf(testInfo), platform]);
  await page.goto(`${HARNESS}${platform === 'MacIntel' ? '?platform=mac' : ''}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('[data-ticket]').first()).toBeVisible();
};
const toaster = (page) => page.getByRole('region', { name: 'Notifications' });
const toasts = (page) => toaster(page).locator('.uix-toast');
const resolve = (page, id) => page.getByRole('button', { name: `Resolve ${id}` }).click();
/** The countdown bar's animation: its play state and how far it has run. */
const bar = (page) => toasts(page).first().locator('.uix-toast__countdown').evaluate(async (el) => {
  const [animation] = el.getAnimations();
  // a pause is pending until the next frame: read the time once it has taken effect
  await animation?.ready;
  return { playState: animation?.playState, time: Number(animation?.currentTime ?? 0), transform: getComputedStyle(el).transform };
});
const park = (page) => page.mouse.move(5, 5);

test('resolving in a row merges into one toast whose countdown shrinks on transform and stops while hovered or focused', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await resolve(page, 'INC-0412');
  await resolve(page, 'INC-0413');
  await resolve(page, 'INC-0414');
  await park(page);
  await expect(toasts(page)).toHaveCount(1);
  await expect(toasts(page).first().locator('.uix-toast__title')).toHaveText('Resolved 3 tickets');
  const running = await bar(page);
  expect(running.playState).toBe('running');
  expect(running.transform).toMatch(/^matrix\(/);
  await toasts(page).first().hover();
  await expect.poll(async () => (await bar(page)).playState).toBe('paused');
  const held = (await bar(page)).time;
  await page.waitForTimeout(400);
  expect((await bar(page)).time).toBe(held);
  await park(page);
  await expect.poll(async () => (await bar(page)).playState).toBe('running');
  // keyboard focus pauses it too
  await toasts(page).first().getByRole('button', { name: 'Undo' }).focus();
  await expect.poll(async () => (await bar(page)).playState).toBe('paused');
  await expect(toasts(page).first().getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-keyshortcuts', 'Control+Z');
  await page.keyboard.press('Enter');
  await expect(toasts(page)).toHaveCount(0);
  for (const id of ['INC-0412', 'INC-0413', 'INC-0414']) await expect(page.locator(`[data-ticket="${id}"]`)).toContainText('Open');
});

test('Ctrl+Z undoes the newest undoable action and announces it; inside the note field it is the browser’s undo', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await resolve(page, 'INC-0415');
  await park(page);
  const note = page.locator('#demo-note');
  await note.fill('');
  await note.focus();
  await page.keyboard.type('abc');
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-ticket="INC-0415"]')).toContainText('Resolved');
  await expect(toasts(page)).toHaveCount(1);
  await page.locator('h1').click();
  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-ticket="INC-0415"]')).toContainText('Open');
  await expect(toaster(page).locator('> [role="status"]')).toContainText('Undone: Resolved INC-0415');
  await expect(toasts(page)).toHaveCount(0);
});

test('⌘Z on a Mac', async ({ page }, testInfo) => {
  await open(page, testInfo, 'MacIntel');
  await resolve(page, 'INC-0412');
  await park(page);
  await expect(toasts(page).first().getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-keyshortcuts', 'Meta+Z');
  await page.locator('h1').click();
  await page.keyboard.press('Meta+z');
  await expect(page.locator('[data-ticket="INC-0412"]')).toContainText('Open');
});

test('the ? sheet lists Ctrl+Z as "Undo the last action"', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#demo-sheet').focus();
  await page.keyboard.press('?');
  const sheet = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(sheet).toBeVisible();
  const rows = await sheet.locator('.uix-shortcut-sheet__row').evaluateAll((all) => all.map((row) => `${row.querySelector('dt').textContent}=${row.querySelector('dd .uix-visually-hidden').textContent}`));
  expect(rows).toContain('Undo the last action=Control+Z');
});

test('reduced motion: no moving bar; the seconds left stand beside Undo and stop while hovered', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, testInfo);
  await resolve(page, 'INC-0412');
  await park(page);
  const toastEl = toasts(page).first();
  await expect(toastEl.locator('.uix-toast__countdown')).toHaveCount(0);
  const left = toastEl.locator('.uix-toast__action-slot .uix-toast__remaining');
  await expect(left).toHaveText(/^[78] s$/);
  await expect(left).toHaveText('6 s', { timeout: 4000 });
  await toastEl.hover();
  await page.waitForTimeout(2200);
  await expect(left).toHaveText(/^[56] s$/);
});

test('an alert storm shows five toasts at most and summarises the rest; Show brings them', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#demo-storm').click();
  await park(page);
  const summary = toasts(page).filter({ hasText: 'notifications waiting' });
  await expect(summary).toHaveCount(1);
  await expect(summary.locator('.uix-toast__title')).toHaveText('7 notifications waiting');
  expect(await page.evaluate(() => window.__toast.store.getHeld().length)).toBe(7);
  await summary.getByRole('button', { name: 'Show' }).click();
  expect(await page.evaluate(() => window.__toast.store.getHeld().length)).toBe(0);
});

test('Do not disturb holds normal toasts, still shows errors and undo toasts, and summarises when it ends', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.getByRole('switch', { name: 'Do not disturb' }).check();
  await page.evaluate(() => { window.__toast.success('Export ready'); window.__toast.info('Comment from Alex'); });
  await page.locator('#demo-fail').click();
  await resolve(page, 'INC-0413');
  await park(page);
  await expect(toasts(page).locator('.uix-toast__title')).toHaveText(['Sync with the CMDB failed', 'Resolved INC-0413']);
  await page.getByRole('switch', { name: 'Do not disturb' }).uncheck();
  await expect(toasts(page).filter({ hasText: '2 notifications waiting' })).toHaveCount(1);
});

test('axe: no serious or critical violations with an undo toast, a merged toast and the held summary, in this theme', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await resolve(page, 'INC-0412');
  await resolve(page, 'INC-0413');
  await page.locator('#demo-storm').click();
  await park(page);
  await expect(toasts(page).filter({ hasText: 'notifications waiting' })).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});
