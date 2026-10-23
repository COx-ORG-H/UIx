/* AuditLog (HAR-987; MEDx S50 "Historija pristupa", POSx PRT-01) in Chromium on a Bosnian harness
 * (tests/audit-log/harness.tsx) with a fake server: filtering with the keyboard through the filter
 * chips, the rows kept during the reload (BusyRegion), keyset "Prikaži starije" with focus kept and
 * the count announced, Details, every state, 320 px and axe, light + dark. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/audit-log/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#history .uix-audit-log__row')).toHaveCount(6);
};
const history = (page) => page.locator('#history');

test('a row says who, what, to what, and when (relative and exact); Details opens with the keyboard', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const list = history(page).getByRole('list', { name: 'Historija pristupa' });
  const first = list.getByRole('listitem').first();
  await expect(first).toContainText('dr. Amra Kovač');
  await expect(first).toContainText('Otvoreno');
  await expect(first).toContainText('Karton pacijenta 1042');
  await expect(first.locator('time')).toHaveAttribute('datetime', '2026-10-22T10:30:00.000Z');
  await expect(first.locator('.uix-audit-log__exact')).toHaveText(/22\. 10\. 2026\./);
  const summary = list.getByRole('listitem').nth(1).locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(list.getByRole('listitem').nth(1).locator('.uix-audit-log__detail')).toBeVisible();
});

test('filter by action with the keyboard: the rows stay while it reloads, then only matches; the chip clears it', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await history(page).locator('.uix-chip--add', { hasText: 'Šta' }).focus();
  await page.keyboard.press('Enter');
  const pop = page.locator('#history [popover]:popover-open');
  await expect(pop).toBeVisible();
  await pop.getByRole('checkbox', { name: 'Izvezeno' }).check();
  await pop.getByRole('checkbox', { name: 'Izvezeno' }).press('Enter');
  await expect(pop).toHaveCount(0);
  const region = history(page).locator('.uix-busy-region');
  await expect(region).toHaveAttribute('aria-busy', 'true');
  await expect(history(page).locator('.uix-audit-log__row')).toHaveCount(6, { timeout: 200 });
  await expect(history(page).locator('.uix-audit-log__row')).toHaveCount(5);
  await expect(region).not.toHaveAttribute('aria-busy', 'true');
  for (const row of await history(page).locator('.uix-audit-log__row').all()) await expect(row).toContainText('Izvezeno');
  await expect(history(page).locator('.uix-chip', { hasText: 'Šta: Izvezeno' })).toBeVisible();
  await history(page).getByRole('button', { name: 'Očisti filtere' }).click();
  await expect(history(page).locator('.uix-audit-log__row')).toHaveCount(6);
});

test('"Prikaži starije" loads the next page, keeps focus, and says how many came', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const more = history(page).getByRole('button', { name: 'Prikaži starije' });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(history(page).locator('.uix-audit-log__row')).toHaveCount(12);
  await expect(more).toBeFocused();
  await expect(history(page).getByRole('status')).toHaveText('Prikazano još 6 unosa');
  expect(await page.evaluate(() => window.__audit.requests.filter((r) => r.startsWith('after')))).toEqual(['after e6']);
});

test('states: first load, empty, error with retry, forbidden; 320 px; axe', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  await expect(page.locator('#state-loading [role="status"]').first()).toContainText('Učitavam historiju');
  await expect(page.locator('#state-empty')).toContainText('Još nema zabilježenih pristupa');
  await expect(page.locator('#state-error').getByRole('button', { name: 'Pokušaj ponovo' })).toBeVisible();
  await expect(page.locator('#state-forbidden')).toContainText('Nemate pristup ovoj historiji');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && !a.effect?.target?.closest?.('.uix-skeleton, [class*="skeleton"]')).length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
