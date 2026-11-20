/* Sparkline (HAR-2880) in Chromium on tests/sparkline/harness.html, in both themes:
 *   - a screen reader hears "<label>: <value>" for each line, and the written value is that text;
 *   - a gap is a break in the line, the target a dashed line, a crossed threshold a diamond;
 *   - inside a playing Arrive stage the line traces in; under reduced motion nothing on a
 *     sparkline animates, and at rest nothing does either;
 *   - the value sits beside the line without overflowing a narrow stat;
 *   - axe is clean.
 * Markup and scaling are pinned in packages/react/src/sparkline-dom.test.mjs; colours in
 * packages/tokens/tests/sparkline-contrast.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from './axe.mjs';

const HARNESS = '/tests/sparkline/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme) {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#shapes')).toBeVisible();
}

/** Animations running on any sparkline part right now. */
const sparklineMotion = (page) => page.evaluate(() => document.getAnimations()
  .filter((a) => a.effect?.target?.closest?.('.uix-sparkline, .uix-sparkline-group'))
  .map((a) => a.animationName ?? a.transitionProperty));

test('each line is one image named "<label>: <value>", and the written value matches', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const named = (sel) => page.locator(`[data-case="${sel}"] [role="img"]`);
  await expect(named('plain')).toHaveAccessibleName('Offener Rückstand, 11 Wochen: 85 offen');
  await expect(named('gap')).toHaveAccessibleName('Verfügbarkeit, 8 Tage: 99,6 %, zwei Tage ohne Messung');
  await expect(named('target')).toHaveAccessibleName('Lösungsquote: 64 %, Ziel 60 %');
  await expect(named('crossed')).toHaveAccessibleName('Wartende Anfragen: 12, über der Grenze 8');
  await expect(named('empty')).toHaveAccessibleName('Durchsatz: noch keine Messwerte');
  await expect(page.locator('[data-case="empty"] .uix-sparkline__value')).toHaveText('noch keine Messwerte');
  await expect(page.locator('[data-case="decoration"] svg')).toHaveAttribute('aria-hidden', 'true');
  // the grouped svg is hidden from the tree, so the name is not read twice
  await expect(page.locator('[data-case="gap"] svg')).toHaveAttribute('aria-hidden', 'true');
});

test('a gap breaks the line, the target is dashed, a crossed threshold is a diamond', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await expect(page.locator('[data-case="gap"] .uix-sparkline__line')).toHaveCount(2);
  const target = await page.locator('[data-case="target"] .uix-sparkline__target').evaluate((el) => getComputedStyle(el).strokeDasharray);
  expect(target).not.toBe('none');
  await expect(page.locator('[data-case="crossed"] path.uix-sparkline__end--crossed')).toHaveCount(1);
  await expect(page.locator('[data-case="crossed"] circle.uix-sparkline__end')).toHaveCount(0);
  await expect(page.locator('[data-case="empty"] path, [data-case="empty"] circle, [data-case="empty"] line')).toHaveCount(0);
});

test('inside a playing stage the line traces in once, then nothing moves', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const stage = page.locator('#stage');
  await expect(stage).toHaveAttribute('data-uix-arrive', 'play');
  expect(await sparklineMotion(page)).toContain('uix-arrive-trace');
  await expect(stage).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  expect(await sparklineMotion(page)).toEqual([]);
});

test('under reduced motion no sparkline part animates, even while the stage plays', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, themeOf(testInfo));
  await expect(page.locator('#stage')).toHaveAttribute('data-uix-arrive', 'play');
  expect(await sparklineMotion(page)).toEqual([]);
  const dash = await page.locator('[data-case="plain"] .uix-sparkline__line').evaluate((el) => getComputedStyle(el).strokeDasharray);
  expect(dash).toBe('none'); // drawn at once, not hidden behind a dash waiting to trace
});

test('the written value sits beside the line and stays inside a narrow stat', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const row = await page.locator('[data-case="target"] .uix-sparkline-group').evaluate((g) => {
    const svg = g.querySelector('svg').getBoundingClientRect();
    const value = g.querySelector('.uix-sparkline__value').getBoundingClientRect();
    return { gap: Math.round(value.left - svg.right), middle: Math.abs((svg.top + svg.bottom) / 2 - (value.top + value.bottom) / 2) };
  });
  expect(row.gap).toBe(8); // --uix-space-2
  expect(row.middle).toBeLessThanOrEqual(2);
  const fit = await page.locator('#stat').evaluate((stat) => {
    const box = stat.getBoundingClientRect();
    return [...stat.querySelectorAll('.uix-sparkline-group, .uix-sparkline-group *')].every((el) => el.getBoundingClientRect().right <= box.right + 0.5);
  });
  expect(fit).toBe(true);
});

test('in a narrow container the value moves under the line whole and never breaks inside a word', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const narrow = await page.locator('[data-case="narrow"] .uix-sparkline-group').evaluate((g) => {
    const svg = g.querySelector('svg').getBoundingClientRect();
    const value = g.querySelector('.uix-sparkline__value');
    const box = value.getBoundingClientRect();
    // the widest word, set alone in the value's font: it must fit the value's box
    const probe = document.createElement('span');
    probe.className = 'uix-sparkline__value';
    probe.style.cssText = 'position:absolute;white-space:nowrap;visibility:hidden';
    document.body.append(probe);
    const widest = Math.max(...value.textContent.split(/\s+/).map((word) => { probe.textContent = word; return probe.getBoundingClientRect().width; }));
    probe.remove();
    return { below: box.top >= svg.bottom - 0.5, fits: widest <= box.width + 0.5, inside: box.right <= g.parentElement.getBoundingClientRect().right + 0.5 };
  });
  expect(narrow).toEqual({ below: true, fits: true, inside: true });
});

test('axe is clean', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  await expect(page.locator('#stage')).toHaveAttribute('data-uix-arrive', 'rest', { timeout: 3000 });
  const { violations } = await new AxeBuilder({ page }).include('#stage').analyze();
  expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual([]);
});
