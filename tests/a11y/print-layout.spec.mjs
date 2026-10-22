/* PrintLayout (HAR-986 MEDx S20 "Nalaz i mišljenje" and the day list; HAR-1252 SHOPx PRE-01 A5
 * poster and SHOP-03 one-page readout): a print document frame.
 *
 * The harness is an app shell (sidebar, top bar, a toolbar with a Print button) around an A4
 * findings document long enough for three pages, and an A5 poster with the campaign QR code.
 * Measured in Chromium, light and dark:
 *   - on screen: true paper sizes, ink on paper in both themes;
 *   - with print media: only the documents remain; the frame is a table whose header and footer
 *     groups the browser repeats per page;
 *   - in a real PDF (`page.pdf`, CSS page size): the A4 pages are A4 and the poster's page is
 *     A5, the header and the footer are on every A4 page (each carries a link, and a PDF keeps
 *     one link annotation per drawn link), and the poster is one page;
 *   - the poster's QR code still scans with print media;
 *   - a single-page layout whose content does not fit says so (outline + onOverflowChange).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createRequire } from 'node:module';

const HARNESS = '/tests/display/harness.html?case=print';
const GATED = new Set(['serious', 'critical']);
const JSQR = createRequire(import.meta.url).resolve('jsqr');
const MM = 96 / 25.4;

const open = async (page, testInfo, { query = '', viewport } = {}) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#nalaz')).toBeVisible();
};

/** Page sizes (PDF points) and link URIs per page, read from Chromium's PDF. */
function readPdf(buffer) {
  const text = buffer.toString('latin1');
  const pages = [...text.matchAll(/\/Type\s*\/Page\b(?!s)[\s\S]*?(?=endobj)/g)].map((match) => {
    const box = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(match[0]);
    return { width: box ? Number(box[3]) - Number(box[1]) : NaN, height: box ? Number(box[4]) - Number(box[2]) : NaN };
  });
  const uris = [...text.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((match) => match[1]);
  return { pages, uris };
}

test('on screen: true paper sizes, ink on paper in both themes', async ({ page }, testInfo) => {
  await open(page, testInfo, { viewport: { width: 1280, height: 900 } });
  const sizes = await page.evaluate(() => ['nalaz', 'poster'].map((id) => {
    const el = document.getElementById(id);
    const style = getComputedStyle(el);
    return { width: el.getBoundingClientRect().width, background: style.backgroundColor, color: style.color };
  }));
  expect(sizes[0].width).toBeCloseTo(210 * MM, 0);
  expect(sizes[1].width).toBeCloseTo(148 * MM, 0);
  for (const size of sizes) expect(size).toMatchObject({ background: 'rgb(255, 255, 255)', color: 'rgb(10, 10, 10)' });
  // components inside read the paper tokens: a table cell's text is ink in the dark theme too
  const cell = await page.locator('#nalaz td').first().evaluate((td) => getComputedStyle(td).color);
  expect(cell).toBe('rgb(10, 10, 10)');
});

test('print media: only the documents remain, each a table whose header and footer repeat', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.emulateMedia({ media: 'print' });
  const shown = await page.evaluate(() => ({
    sidebar: getComputedStyle(document.querySelector('.uix-shell__sidebar')).display,
    topbar: getComputedStyle(document.querySelector('.uix-shell__topbar')).display,
    toolbar: getComputedStyle(document.getElementById('print-toolbar')).display,
    main: getComputedStyle(document.querySelector('.uix-shell__main')).overflow,
    frame: getComputedStyle(document.querySelector('#nalaz .uix-print-layout__page')).display,
    header: getComputedStyle(document.querySelector('#nalaz .uix-print-layout__header')).display,
    footer: getComputedStyle(document.querySelector('#nalaz .uix-print-layout__footer')).display,
    page: getComputedStyle(document.getElementById('poster')).page,
  }));
  expect(shown).toEqual({ sidebar: 'none', topbar: 'none', toolbar: 'none', main: 'visible', frame: 'table', header: 'table-header-group', footer: 'table-footer-group', page: 'uix-print-a5-plain' });
});

test('PDF: A4 pages then an A5 poster page, header and footer on every A4 page', async ({ page, browserName }, testInfo) => {
  test.skip(browserName !== 'chromium' || testInfo.project.name !== 'light', 'page.pdf is Chromium only; the PDF is the same in both themes');
  await open(page, testInfo);
  const pdf = readPdf(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  const a4 = pdf.pages.filter((p) => Math.abs(p.width - 595.9) < 2 && Math.abs(p.height - 842.9) < 2);
  const a5 = pdf.pages.filter((p) => Math.abs(p.width - 419.5) < 2 && Math.abs(p.height - 595.3) < 2);
  expect(pdf.pages.length, JSON.stringify(pdf.pages)).toBe(a4.length + a5.length);
  expect(a4.length, 'the findings run over several A4 pages').toBeGreaterThanOrEqual(2);
  expect(a5.length, 'the poster is one A5 page').toBe(1);
  // A link drawn once (in the body) is written once. A header or footer link that repeats is
  // written at least once per page (Chromium writes the links of every repeated fragment into each
  // page's annotations, so the count is pages × pages); one that does not repeat is written once.
  const count = (uri) => pdf.uris.filter((value) => value === uri).length;
  expect(count('https://dom-zdravlja.example/nalaz')).toBe(1);
  expect(count('https://dom-zdravlja.example/'), 'the header on every A4 page').toBeGreaterThanOrEqual(a4.length);
  expect(count('https://dom-zdravlja.example/kontakt'), 'the footer on every A4 page').toBeGreaterThanOrEqual(a4.length);
});

test('the poster’s QR code scans with print media', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.emulateMedia({ media: 'print' });
  await page.addScriptTag({ path: JSQR });
  const png = await page.locator('#poster .uix-qr-code').screenshot();
  const value = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: image.naturalWidth, height: image.naturalHeight });
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return window.jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
  }, png.toString('base64'));
  expect(value).toBe('https://shopx.example/kampanja/ljetna-akcija-2026?uloga=blagajna');
});

test('a single page that does not fit is outlined and reported; the poster fits', async ({ page }, testInfo) => {
  await open(page, testInfo, { query: '&overfull=1' });
  await expect(page.locator('#overfull')).toHaveAttribute('data-overflowing', '');
  await expect(page.locator('#poster')).not.toHaveAttribute('data-overflowing', '');
  await expect.poll(() => page.evaluate(() => window.__printOverflow)).toEqual({ overfull: true });
});

test('at 320 px the preview reflows inside the screen', async ({ page }, testInfo) => {
  await open(page, testInfo, { viewport: { width: 320, height: 800 } });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
});

test('axe: the shell and both documents on screen', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
