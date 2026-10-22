/* CodeDisplay (HAR-1253; SHOPx PRE-08 till pairing, the voucher code): a one-time code shown large.
 *
 * In Chromium, light and dark, with Bosnian words: the accessible name spells the code, the
 * countdown is not a live region, the expired state differs from the live one in words (not
 * only colour), groups wrap whole at 320 px and a long voucher code stays inside its box, the
 * copy button sits on the code's line, and axe passes in every state.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/display/harness.html?case=code';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#code-live')).toBeVisible();
};

test('a group named by its label that spells the code; the drawn code is hidden from assistive technology', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const live = page.getByRole('group', { name: 'Kod za uparivanje kase' }).first();
  await expect(live).toBeVisible();
  const snapshot = await page.locator('#code-live').ariaSnapshot();
  expect(snapshot).toContain('K 7 Q, 4 P X, 9 M W');
  expect(snapshot).not.toContain('K7Q');
  await expect(page.locator('#code-live .uix-code-display__meta')).toHaveText(/^Ističe za (9:5\d|10:00)$/);
  await expect(page.locator('#code-live [aria-live]')).toHaveCount(0);
});

test('expired differs from live in words and in the drawn code, not only in colour', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#code-expired')).toHaveAttribute('data-state', 'expired');
  await expect(page.locator('#code-expired .uix-code-display__meta')).toHaveText('Kod je istekao. Zatražite novi.');
  await expect(page.locator('#code-expired .uix-copy-button')).toHaveCount(0);
  const lines = await page.evaluate(() => ['code-live', 'code-expired'].map((id) => getComputedStyle(document.querySelector(`#${id} .uix-code-display__code`)).textDecorationLine));
  expect(lines).toEqual(['none', 'line-through']);
  await expect(page.locator('#code-soon')).toHaveAttribute('data-state', 'soon');
});

test('the copy button sits on the code’s line, centred on it, and copies the bare code', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, testInfo);
  const geometry = await page.locator('#code-live').evaluate((root) => {
    const code = root.querySelector('.uix-code-display__code').getBoundingClientRect();
    const copy = root.querySelector('.uix-copy-button').getBoundingClientRect();
    return { centred: Math.abs((code.top + code.bottom) / 2 - (copy.top + copy.bottom) / 2), after: copy.left - code.right, size: copy.height };
  });
  expect(geometry.centred).toBeLessThan(3);
  expect(geometry.after).toBeGreaterThanOrEqual(8);
  expect(geometry.size).toBeGreaterThanOrEqual(24);
  await page.locator('#code-live').getByRole('button', { name: 'Kopiraj kod' }).click();
  await expect(page.locator('#code-live [role="status"]').first()).toHaveText('Kopirano');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('K7Q4PX9MW');
});

test('at 320 px groups wrap whole, the long voucher stays in its box, nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
  for (const id of ['code-lg', 'code-voucher', 'code-live']) {
    const fits = await page.locator(`#${id}`).evaluate((root) => {
      const box = root.parentElement.getBoundingClientRect();
      return [...root.querySelectorAll('.uix-code-display__group')].every((group) => {
        const r = group.getBoundingClientRect();
        // a group is one line: as tall as one line box of the code
        const line = parseFloat(getComputedStyle(group.parentElement).lineHeight) || r.height;
        return r.left >= box.left - 0.5 && r.right <= box.right + 0.5 && r.height <= line * 1.2;
      });
    });
    expect(fits, `${id}: every group whole and inside`).toBe(true);
  }
});

test('beside a form: the code lines up under its label like a field', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const offsets = await page.evaluate(() => {
    const field = document.querySelector('form .uix-field__label').getBoundingClientRect();
    const label = document.querySelector('#code-form .uix-code-display__label').getBoundingClientRect();
    return { labelTops: Math.abs(field.top - label.top) };
  });
  expect(offsets.labelTops).toBeLessThan(6);
});

test('axe: live, last minute, expired, large, voucher', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
