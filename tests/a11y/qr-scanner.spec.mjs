/* QrScanner (HAR-1254; SHOPx SHOP-07/SHOP-09 till scan, PRE-01 public scan; MOTUS intake).
 *
 * Chromium with its fake camera (a moving test pattern) and its fake permission prompt, light and
 * dark, Bosnian words. A stub decoder stands in for the product's (it "reads" from the fourth
 * frame), so the test proves frames flow from a real MediaStream to the injected decoder:
 *   - every state renders and passes axe: idle (explainer first), asking, scanning, denied,
 *     unsupported, no camera; the manual field is reachable with Tab in each;
 *   - scanning: the video plays, the decoder gets frames, the result is reported once and said
 *     once; the component requests nothing from the network;
 *   - the viewfinder is 4:3 and inside the screen at 320 px; Stop releases the camera;
 *   - reduced motion: the read mark does not move.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/display/harness.html?case=scanner';
const GATED = new Set(['serious', 'critical']);

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }, permissions: ['camera'] });

const open = async (page, testInfo, camera = 'real', viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}&camera=${camera}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#scanner')).toBeVisible();
};
const start = (page) => page.getByRole('button', { name: 'Uključi kameru' }).click();
const status = (page) => page.locator('#scanner').getAttribute('data-status');
const axe = async (page) => {
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};
/** Tab from the top of the scanner until the manual field has focus (at most 8 stops). */
const tabToManual = async (page) => {
  await page.locator('h1').click();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.id === 'manual-code')) return true;
  }
  return false;
};

test('idle: the explainer before any prompt, a start button, the manual field; axe', async ({ page }, testInfo) => {
  await open(page, testInfo);
  expect(await status(page)).toBe('idle');
  await expect(page.locator('.uix-qr-scanner__explainer')).toContainText('Slika ne napušta ovaj uređaj');
  expect(await tabToManual(page)).toBe(true);
  expect(await axe(page)).toEqual([]);
});

test('scanning with a real stream: frames reach the decoder, one result, one announcement, no network', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await open(page, testInfo);
  const before = requests.length;
  await start(page);
  await expect.poll(() => status(page)).toBe('scanning');
  await expect.poll(() => page.evaluate(() => document.querySelector('#scanner video').videoWidth)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__scanner.results)).toEqual(['VOUCHER-0042']);
  await expect(page.locator('#scanner [role="status"]')).toHaveText('Pročitano: VOUCHER-0042');
  await expect(page.locator('#manual-code')).toHaveValue('VOUCHER-0042');
  expect(await page.evaluate(() => window.__scanner.frames)).toBeGreaterThanOrEqual(4);
  expect(requests.slice(before), 'nothing left the page').toEqual([]);
  expect(await tabToManual(page)).toBe(true);
  expect(await axe(page)).toEqual([]);
  // Stop releases the camera
  await page.getByRole('button', { name: 'Isključi kameru' }).click();
  expect(await status(page)).toBe('idle');
  expect(await page.evaluate(() => document.querySelector('#scanner video').srcObject)).toBeNull();
});

for (const [camera, expected, title] of [
  ['denied', 'denied', 'Kamera je blokirana'],
  ['missing', 'no-camera', 'Kamera nije dostupna'],
  ['none', 'unsupported', 'Ovaj preglednik ovdje ne može koristiti kameru'],
  ['asking', 'asking', null],
]) {
  test(`${expected}: says so, keeps the manual field reachable; axe`, async ({ page }, testInfo) => {
    await open(page, testInfo, camera);
    if (camera !== 'none') await start(page);
    await expect.poll(() => status(page)).toBe(expected);
    if (title) await expect(page.locator('.uix-qr-scanner__title')).toHaveText(title);
    expect(await tabToManual(page)).toBe(true);
    expect(await axe(page)).toEqual([]);
  });
}

test('at 320 px the viewfinder is 4:3 and inside the card; nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, 'real', { width: 320, height: 760 });
  await start(page);
  await expect.poll(() => status(page)).toBe('scanning');
  const frame = await page.locator('.uix-qr-scanner__frame').boundingBox();
  const card = await page.locator('.uix-card').boundingBox();
  expect(Math.abs(frame.width / frame.height - 4 / 3)).toBeLessThan(0.02);
  expect(frame.x).toBeGreaterThanOrEqual(card.x);
  expect(frame.x + frame.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
});

test('reduced motion: the read mark changes colour and does not move', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, testInfo);
  await start(page);
  await expect(page.locator('.uix-qr-scanner__frame[data-read]')).toHaveCount(1, { timeout: 10_000 });
  const target = await page.locator('.uix-qr-scanner__target').evaluate((el) => getComputedStyle(el).transform);
  expect(target).toBe('none');
});
