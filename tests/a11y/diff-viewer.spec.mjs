/* DiffViewer's translated action names and controlSize in a real browser (UIx 2.24.0; the
 * MOTUS programme conflict comparison, EPE-07, needs Bosnian words and 60px controls).
 *
 * The harness (tests/diff-viewer/harness.tsx) is bundled from source in globalSetup, so this
 * needs only the tokens build. Rendered heights, focus and axe only exist in a browser — the
 * markup contract is in packages/react/src/phase-components.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/diff-viewer/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#programme .uix-diff-viewer')).toBeVisible();
});

test('no serious or critical axe violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('every action is named in the page language for the entry it resolves', async ({ page }) => {
  const programme = page.locator('#programme');
  const group = programme.getByRole('group', { name: 'Razriješi $.startsAt' });
  await expect(group.getByRole('button')).toHaveCount(3);
  await expect(group.getByRole('button', { name: 'Prihvati dolazno za $.startsAt', exact: true })).toHaveText('Prihvati dolazno');
  await expect(group.getByRole('button', { name: 'Zadrži trenutno za $.startsAt', exact: true })).toHaveText('Zadrži trenutno');
  await expect(group.getByRole('button', { name: 'Označi na čekanju za $.startsAt', exact: true })).toHaveText('Označi na čekanju');
  await expect(programme).not.toContainText(/Accept incoming|Keep current|Mark pending|Resolve/);
  // The English defaults name their entry too, so two viewers never share an ambiguous name.
  await expect(page.locator('#compact').getByRole('button', { name: 'Accept incoming for $.retentionDays', exact: true })).toBeVisible();
});

test('controlSize md follows the theme control height (60px); lg is 44px; sm stays 28px', async ({ page }) => {
  const heights = (scope) => page.locator(`${scope} .uix-diff-viewer__entry[open]`).first().evaluate((entry) => ({
    buttons: [...entry.querySelectorAll('.uix-diff-viewer__actions button')].map((b) => Math.round(b.getBoundingClientRect().height)),
    summary: Math.round(entry.querySelector('summary').getBoundingClientRect().height),
  }));
  const programme = await heights('#programme');
  expect(programme.buttons).toEqual([60, 60, 60]);
  expect(programme.summary).toBeGreaterThanOrEqual(60);
  const large = await heights('#large');
  expect(large.buttons).toEqual([44, 44, 44]);
  expect(large.summary).toBeGreaterThanOrEqual(44);
  expect((await heights('#compact')).buttons).toEqual([28, 28, 28]);
});

test('resolving by keyboard presses the button and announces progress', async ({ page }) => {
  const programme = page.locator('#programme');
  const accept = programme.getByRole('button', { name: 'Prihvati dolazno za $.startsAt', exact: true });
  await accept.focus();
  await page.keyboard.press('Enter');
  await expect(accept).toHaveAttribute('aria-pressed', 'true');
  await expect(programme.locator('[aria-live="polite"]')).toHaveText('Riješeno 1 od 2 razlika.');
  await page.keyboard.press('Tab');
  await expect(programme.getByRole('button', { name: 'Zadrži trenutno za $.startsAt', exact: true })).toBeFocused();
  expect(await page.evaluate(() => window.__diff.changes)).toEqual([['$.startsAt', 'accept']]);
});
