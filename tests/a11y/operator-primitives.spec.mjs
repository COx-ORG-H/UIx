/* Tabs overflow="scroll" (with keepMounted), the toned / interactive Stat and CopyButton in a
 * real browser (UIx 2.20.0; the tab overflow closes audit finding UIX-06, owned by RX-125).
 *
 * The harness (tests/operator-primitives/harness.tsx) is bundled from source in globalSetup,
 * so this needs only the tokens build. Scrolling, focus, the clipboard and axe only exist
 * when rendered — the markup contract is in packages/react/src/operator-primitives.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/operator-primitives/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page, context }, testInfo) => {
  const theme = testInfo.project.name;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
});

test('no serious or critical axe violations', async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));
  expect(gated.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
});

test('overflowing tabs keep one row, and only the side with hidden tabs shows an edge button', async ({ page }) => {
  const list = page.getByRole('tablist');
  const box = await list.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(box.scroll, 'the fixture must overflow, or this proves nothing').toBeGreaterThan(box.client);
  const rows = await page.getByRole('tab').evaluateAll(
    (tabs) => new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top))).size,
  );
  expect(rows, 'all tabs on one row').toBe(1);
  await expect(page.locator('.uix-tabs-scroller__prev')).toBeHidden();
  await expect(page.locator('.uix-tabs-scroller__next')).toBeVisible();
});

test('End selects the last tab and scrolls it fully into view; the edge buttons swap', async ({ page }) => {
  await page.getByRole('tab', { name: 'Overview' }).focus();
  await page.keyboard.press('End');
  const last = page.getByRole('tab', { name: 'Audit trail' });
  await expect(last).toHaveAttribute('aria-selected', 'true');
  await expect(last).toBeFocused();
  await expect.poll(() => last.evaluate((tab) => {
    const list = tab.closest('[role="tablist"]').getBoundingClientRect();
    const r = tab.getBoundingClientRect();
    return r.left >= list.left - 1 && r.right <= list.right + 1;
  })).toBe(true);
  await expect(page.locator('.uix-tabs-scroller__prev')).toBeVisible();
  await expect(page.locator('.uix-tabs-scroller__next')).toBeHidden();
});

test('the edge buttons are pointer-only and never take focus', async ({ page }) => {
  const next = page.locator('.uix-tabs-scroller__next');
  await expect(next).toHaveAttribute('aria-hidden', 'true');
  await expect(next).toHaveAttribute('tabindex', '-1');
  const before = await page.getByRole('tablist').evaluate((el) => el.scrollLeft);
  await next.click();
  await expect.poll(() => page.getByRole('tablist').evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
  expect(await next.evaluate((el) => el === document.activeElement)).toBe(false);
});

test('a keepMounted panel keeps what was typed while another tab is shown', async ({ page }) => {
  await page.getByRole('tab', { name: 'Worklog' }).click();
  await page.locator('#worklog-draft').fill('Rolled back the gateway');
  await page.getByRole('tab', { name: 'Overview' }).click();
  await expect(page.locator('#worklog-draft')).toBeHidden();
  await page.getByRole('tab', { name: 'Worklog' }).click();
  await expect(page.locator('#worklog-draft')).toHaveValue('Rolled back the gateway');
});

test('an interactive Stat is one button named "label: value, action" that opens its editor', async ({ page }) => {
  // aria-labelledby joins its parts with spaces, so the computed name is 'Priority : P1 , change';
  // screen readers speak it the same as 'Priority: P1, change'. Match the words and their order.
  const tile = page.getByRole('button', { name: /^Priority\s*:\s*P1\s*,\s*change$/ });
  await expect(tile).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(tile).toHaveAttribute('aria-expanded', 'false');
  await tile.focus();
  await page.keyboard.press('Enter');
  await expect(tile).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('dialog', { name: 'Change priority' })).toBeVisible();
  expect(await page.evaluate(() => window.__op.activations)).toBe(1);
});

test('toned tiles draw a toned outline and value, never a toned label', async ({ page }) => {
  const seen = await page.evaluate(() => {
    const read = (id) => {
      const tile = document.getElementById(id);
      return {
        border: getComputedStyle(tile).borderTopColor,
        value: getComputedStyle(tile.querySelector('.uix-stat__value')).color,
        label: getComputedStyle(tile.querySelector('.uix-stat__label')).color,
      };
    };
    return { danger: read('stat-sla'), warning: read('stat-queue'), neutral: read('stat-priority') };
  });
  expect(seen.danger.border).not.toBe(seen.neutral.border);
  expect(seen.warning.border).not.toBe(seen.neutral.border);
  expect(seen.danger.value).not.toBe(seen.neutral.value);
  expect(seen.danger.label).toBe(seen.neutral.label);
});

test('CopyButton writes the value, shows a check and announces "Copied"', async ({ page }) => {
  const button = page.getByRole('button', { name: 'Copy email' });
  await button.click();
  await expect(button).toHaveAttribute('data-copied', 'true');
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toHaveCount(1);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('ada@example.com');
});

test('a refused copy shows no check and announces the failure', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new DOMException('denied', 'NotAllowedError')) },
    });
  });
  const button = page.getByRole('button', { name: 'Copy email' });
  await button.click();
  await expect(page.getByRole('status').filter({ hasText: 'Could not copy' })).toHaveCount(1);
  await expect(button).not.toHaveAttribute('data-copied', /.*/);
});
