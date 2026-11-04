import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const HARNESS = '/tests/peek/harness.html';
async function open(page, variant = 'full') {
  await page.goto(`${HARNESS}?variant=${variant}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Vorschau öffnen', exact: true }).click();
  const peek = page.getByRole('dialog');
  await expect(peek).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(document.getAnimations().filter(a => Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a => a.finished));
  });
  return peek;
}

for (const width of [1440, 320]) test(`German title and hints retain their rows at ${width}px, including optional regions`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
  for (const variant of ['full', 'nav-no-hint', 'title-close', 'title-only', 'hint-no-nav']) {
    const peek = await open(page, variant);
    const geometry = await peek.evaluate(el => {
      const rect = selector => { const node = el.querySelector(selector); if (!node) return null; const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
      const header = el.querySelector('.uix-peek__header');
      const padding = getComputedStyle(header);
      return { header: rect('.uix-peek__header'), title: rect('.uix-peek__title'), nav: rect('.uix-peek__nav'), hint: rect('.uix-peek__hint'), close: rect('.uix-peek__close'), padLeft: parseFloat(padding.paddingLeft), padRight: parseFloat(padding.paddingRight) };
    });
    if (geometry.nav) {
      expect(geometry.title.top, `${variant}: title below navigation`).toBeGreaterThanOrEqual(geometry.nav.bottom);
      expect(geometry.title.left).toBeCloseTo(geometry.header.left + geometry.padLeft, 0);
      expect(geometry.title.right).toBeCloseTo(geometry.header.right - geometry.padRight, 0);
    } else {
      expect(geometry.title.top, `${variant}: no empty navigation row`).toBeLessThan(geometry.header.top + 30);
    }
    if (geometry.hint) expect(geometry.hint.top, `${variant}: hints below title`).toBeGreaterThanOrEqual(geometry.title.bottom);
    if (geometry.close) expect(geometry.close.top).toBeLessThan(geometry.header.top + 30);
    const labels = await peek.locator('.uix-peek__title,.uix-peek__hint').evaluateAll(elements => elements.map(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const box = el.getBoundingClientRect();
      const rects = [...range.getClientRects()].filter(r => r.width > 0);
      const lines = new Set(rects.map(r => Math.round(r.top))).size;
      const brokenWords = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) for (const match of (node.nodeValue ?? '').matchAll(/\S+/g)) {
        const word = document.createRange(); word.setStart(node, match.index); word.setEnd(node, match.index + match[0].length);
        if (new Set([...word.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size > 1) brokenWords.push(match[0]);
      }
      return { text: el.textContent, lines, charsPerLine: (el.textContent ?? '').length / Math.max(1, lines), brokenWords, clipped: rects.some(r => r.left < box.left - 1 || r.right > box.right + 1) };
    }));
    const measurementsPath = testInfo.outputPath(`${variant}-${width}-measurements.json`);
    await writeFile(measurementsPath, JSON.stringify({ geometry, labels }, null, 2));
    await testInfo.attach(`${variant}-${width}-measurements`, { path: measurementsPath, contentType: 'application/json' });
    for (const label of labels) {
      expect(label.clipped, label.text).toBe(false);
      expect(label.brokenWords, label.text).toEqual([]);
      expect(label.charsPerLine, label.text).toBeGreaterThanOrEqual(18);
    }
    const screenshotPath = testInfo.outputPath(`${variant}-${width}-${testInfo.project.name}.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`${variant}-${width}-${testInfo.project.name}`, { path: screenshotPath, contentType: 'image/png' });
    await expect(peek.getByRole('link', { name: 'Datensatz öffnen' })).toBeInViewport();
  }
});

test('translated controls preserve boundary focus, callbacks, close/escape and footer access', async ({ page }) => {
  const peek = await open(page);
  const previous = peek.getByRole('button', { name: 'Vorheriger Datensatz' });
  const next = peek.getByRole('button', { name: 'Nächster Datensatz' });
  await expect(previous).toHaveAttribute('aria-disabled', 'true');
  await previous.focus(); await page.keyboard.press('Enter');
  await expect(peek).toHaveAccessibleName(/INC-0058/);
  await page.keyboard.press('Tab'); await expect(next).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(peek).toHaveAccessibleName(/INC-0059/);
  await expect(next).toBeFocused(); await expect(next).toHaveAttribute('aria-disabled', 'true');
  await previous.focus(); await page.keyboard.press('Enter');
  await expect(peek).toHaveAccessibleName(/INC-0058/);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(peek.getByRole('button', { name: 'Vorschau schließen' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(peek.getByRole('link', { name: 'Datensatz öffnen' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page).toHaveURL(/#datensatz$/);
  await page.keyboard.press('Escape'); await expect(peek).not.toBeVisible();
  // Native close is queued. Wait for the consumer's close callback/state,
  // rather than racing a new Enter against the still-pending old event.
  await expect(page.getByTestId('open-state')).toHaveText('geschlossen');
  await expect(page.getByRole('button', { name: 'Vorschau öffnen', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(peek).toBeVisible();
  await peek.getByRole('button', { name: 'Vorschau schließen' }).click();
  await expect(peek).not.toBeVisible();
});

test('open Peek has no serious or critical accessibility violations', async ({ page }) => {
  await open(page);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter(v => ['serious', 'critical'].includes(v.impact)).map(v => v.id)).toEqual([]);
});
