/* QrCode (HAR-1251; SHOPx PRE-01 poster, the voucher): the rendered symbol scans.
 *
 * Each case screenshots the symbol as Chromium painted it and decodes those pixels with jsQR
 * (a dev-only reference decoder), in the light and dark projects and with print media
 * emulated, at the smallest documented size (2 px per module). The symbol is ink on paper in
 * every theme, keeps its quiet zone, survives forced colours and the print stylesheet, and a
 * value too long for a QR code says so instead of drawing a broken square.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';

const HARNESS = '/tests/display/harness.html?case=qr';
const GATED = new Set(['serious', 'critical']);
const CAMPAIGN = 'https://shopx.example/kampanja/ljetna-akcija-2026?trgovina=SA-0042';
const JSQR = createRequire(import.meta.url).resolve('jsqr');

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#qr-small')).toBeVisible();
  await page.addScriptTag({ path: JSQR });
};

/** What a phone would read from the pixels Chromium painted for `selector`. */
const scan = async (page, selector) => {
  const png = await page.locator(selector).screenshot({ animations: 'disabled' });
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    // dontInvert: a light-on-dark symbol must fail here, as it fails many real scanners
    return window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  }, png.toString('base64'));
};

test('the smallest documented size scans, and so do the poster and the card symbols', async ({ page }, testInfo) => {
  await open(page, testInfo);
  expect(await scan(page, '#qr-small')).toBe(CAMPAIGN);
  expect(await scan(page, '#qr-large')).toBe(CAMPAIGN);
  expect(await scan(page, '#qr-card')).toBe('VOUCHER:2026-10-22:00042');
  const small = await page.locator('#qr-small').evaluate((svg) => ({
    width: svg.getBoundingClientRect().width,
    modules: Number(svg.getAttribute('viewBox').split(' ')[2]),
    version: svg.dataset.version,
  }));
  expect(small).toEqual({ width: 90, modules: 45, version: '5' });
});

test('ink on paper in both themes, with the quiet zone painted as paper', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const colours = await page.locator('#qr-small').evaluate((svg) => ({
    paper: getComputedStyle(svg.querySelector('.uix-qr-code__paper')).fill,
    ink: getComputedStyle(svg.querySelector('.uix-qr-code__ink')).fill,
    path: svg.querySelector('path').getAttribute('d').slice(0, 4),
  }));
  expect(colours).toEqual({ paper: 'rgb(255, 255, 255)', ink: 'rgb(10, 10, 10)', path: 'M4 4' });
});

test('print media: the symbol still scans and keeps its colours', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.emulateMedia({ media: 'print' });
  expect(await scan(page, '#qr-small')).toBe(CAMPAIGN);
  const adjust = await page.locator('#qr-small').evaluate((svg) => getComputedStyle(svg).printColorAdjust);
  expect(adjust).toBe('exact');
});

test('forced colours: the symbol is not repainted in system colours', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.emulateMedia({ forcedColors: 'active' });
  expect(await scan(page, '#qr-small')).toBe(CAMPAIGN);
});

test('at 320 px the card symbol shrinks with its card and still scans', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
  const box = await page.locator('#qr-card').boundingBox();
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  expect(box.width).toBeLessThan(320);
  expect(await scan(page, '#qr-card')).toBe('VOUCHER:2026-10-22:00042');
});

test('a value too long for a QR code is a square that says so, in words a screen reader hears', async ({ page }, testInfo) => {
  await open(page, testInfo);
  // not an image named like a working code (review of PR #166): its words are read
  await expect(page.getByRole('img', { name: 'QR kod', exact: true })).toHaveCount(0);
  const tooLong = page.locator('#qr-too-long');
  await expect(tooLong).toHaveText('QR kod: Predugo za QR kod');
  expect(await tooLong.getAttribute('role')).toBeNull();
  // what the code was for is said to a screen reader only; the eye reads why there is none
  await expect(tooLong.locator('.uix-visually-hidden')).toHaveText(/^QR kod:\s*$/);
  const box = await tooLong.boundingBox();
  expect(Math.round(box.width)).toBe(160);
  expect(Math.round(box.height)).toBe(160);
});

test('axe: every symbol', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.getByRole('img', { name: 'QR kod: ljetna akcija' })).toHaveCount(2);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
