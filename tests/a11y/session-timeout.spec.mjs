/* SessionTimeout in Chromium, both themes (UIx enterprise UX study #24; WCAG 2.2.1 Timing
 * Adjustable, 2.2.6 Timeouts), on Playwright's clock:
 *
 * - the warning opens 2 minutes before the end as an alert dialog whose name and description
 *   (with the time left in words) are what a screen reader says once; the countdown is a timer
 *   that is not live, ticks once a second, and focus starts on "Stay signed in";
 * - Stay closes it and gives focus back to the field the person was typing in; Escape is Stay;
 *   a failed renewal keeps the warning and says so;
 * - the end: the draft is written before onExpire, the notice says it was kept, Close leaves the
 *   page (and the draft in its field) to look at;
 * - 320 px with German words: nothing sideways, the actions wrap inside the dialog;
 * - axe (serious and critical) on the warning, the failure and the notice.
 *
 * The rules on a mock clock: packages/react/src/session-timeout-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settleAnimations } from './settle.mjs';

const HARNESS = '/tests/session-timeout/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const MIN = 60_000;

const open = async (page, testInfo, query = '') => {
  // Installed and paused: time moves only through fastForward / runFor. An installed clock that is not
  // paused runs on with the wall clock, so an axe scan or a screenshot moved the countdown on by seconds.
  await page.clock.install({ time: new Date('2026-11-20T09:00:00Z') });
  await page.clock.pauseAt(new Date('2026-11-20T09:00:01Z'));
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); localStorage.removeItem('uix-session-draft'); } catch { /* private mode */ }
  }, themeOf(testInfo));
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', themeOf(testInfo));
  await expect(page.locator('#note')).toBeVisible();
};

/** axe schedules its work with setTimeout, so the paused clock runs again for the scan: do every exact-time check before it. */
const axe = async (page) => {
  await page.clock.resume();
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
};

const calls = (page) => page.evaluate(() => window.__session.calls);

test('the warning: an alert dialog said once with the time left, a quiet ticking timer, focus on Stay signed in', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#note').fill('Restarted the print spooler on PRN-04');
  await page.clock.fastForward(MIN - 1000);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.clock.fastForward(1000);

  const dialog = page.getByRole('alertdialog', { name: 'Your session is about to end' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription(/You will be signed out when the time runs out\. Choose “Stay signed in” to keep working\. Time left 2 minutes/);
  await expect(page.getByRole('button', { name: 'Stay signed in' })).toBeFocused();
  const timer = dialog.getByRole('timer');
  await expect(timer).toHaveAttribute('aria-live', 'off');
  await expect(dialog.locator('.uix-session-timeout__clock')).toHaveText('2:00');
  await expect(dialog).toMatchAriaSnapshot(`
    - alertdialog "Your session is about to end":
      - heading "Your session is about to end" [level=2]
      - paragraph: You will be signed out when the time runs out. Choose “Stay signed in” to keep working.
      - paragraph:
        - text: Time left
        - timer: 2 minutes
      - button "Sign out"
      - button "Stay signed in"
  `);
  await testInfo.attach(`warning-${themeOf(testInfo)}`, { body: await dialog.screenshot(), contentType: 'image/png' });

  await page.clock.runFor(1000);
  await expect(dialog.locator('.uix-session-timeout__clock')).toHaveText('1:59');
  await expect(timer).toHaveText(/1 minute, 59 seconds/);
  expect(await calls(page)).toEqual(['warn', 'persist:warning']);
  await axe(page);
});

test('Stay signed in closes the warning, gives focus back to the field, and it returns only before the new expiry', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#note').focus();
  await page.clock.fastForward(MIN);
  const stay = page.getByRole('button', { name: 'Stay signed in' });
  await expect(stay).toBeFocused();
  await stay.click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#note')).toBeFocused();
  await page.clock.fastForward(20 * MIN);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await page.clock.fastForward(8 * MIN);
  await expect(page.getByRole('alertdialog')).toBeVisible();
  expect((await calls(page)).filter((c) => c === 'extend')).toHaveLength(1);
});

test('Escape means stay; a failed renewal keeps the warning open and says why', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.evaluate(() => { window.__session.failNext = true; });
  await page.clock.fastForward(MIN);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('alert')).toHaveText('Your session could not be extended. Try again.');
  await expect(dialog).toBeVisible();
  await axe(page);
  await testInfo.attach(`failed-${themeOf(testInfo)}`, { body: await dialog.screenshot(), contentType: 'image/png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect((await calls(page)).filter((c) => c === 'extend')).toHaveLength(2);
});

test('the end: the draft is kept before onExpire, the notice says so, Close leaves the page and the draft', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#note').fill('Waiting on the vendor for a replacement fuser');
  await page.clock.fastForward(MIN);
  await page.clock.runFor(2 * MIN);
  const notice = page.getByRole('alertdialog', { name: 'You have been signed out' });
  await expect(notice).toBeVisible();
  await expect(notice.getByRole('status')).toHaveText('Your drafts are kept. Sign in again to carry on where you left off.');
  await expect(notice).toHaveAccessibleDescription('Your drafts are kept. Sign in again to carry on where you left off.');
  await expect(page.getByRole('button', { name: 'Sign in again' })).toBeFocused();
  expect(await calls(page)).toEqual(['warn', 'persist:warning', 'persist:expire', 'expire']);
  expect(await page.evaluate(() => localStorage.getItem('uix-session-draft'))).toBe('Waiting on the vendor for a replacement fuser');
  await axe(page);
  await testInfo.attach(`signed-out-${themeOf(testInfo)}`, { body: await notice.screenshot(), contentType: 'image/png' });

  await page.getByRole('button', { name: 'Sign in again' }).click();
  expect((await calls(page)).at(-1)).toBe('signIn');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#note')).toHaveValue('Waiting on the vendor for a replacement fuser');
});

test('a slow renewal: Stay shows it is working and Sign out waits; 320 px German: nothing sideways, the actions wrap', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page, testInfo, '?locale=de');
  await page.evaluate(() => { window.__session.slow = 2000; });
  await page.clock.fastForward(MIN);
  const dialog = page.getByRole('alertdialog', { name: 'Ihre Sitzung läuft gleich ab' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('timer')).toHaveText(/2 Minuten/);
  const fits = await dialog.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const buttons = [...el.querySelectorAll('.uix-dialog__footer button')].map((b) => b.getBoundingClientRect());
    return {
      page: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      dialog: el.scrollWidth <= el.clientWidth,
      buttons: buttons.every((b) => b.left >= box.left - 0.5 && b.right <= box.right + 0.5),
    };
  });
  expect(fits).toEqual({ page: true, dialog: true, buttons: true });
  await testInfo.attach(`warning-320-de-${themeOf(testInfo)}`, { body: await page.screenshot(), contentType: 'image/png' });

  const stay = page.getByRole('button', { name: 'Angemeldet bleiben' });
  await stay.click();
  await expect(stay).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByRole('button', { name: 'Abmelden' })).toBeDisabled();
  await page.clock.runFor(2000);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
