/* Nav-contract gate (2026-08 TENSOR audit, F8 + sidebar identity primitives).
 *
 * Geometry/behaviour assertions the whole-page axe scan cannot express:
 *   • .uix-navsection (the static section header) must NEVER read as clickable —
 *     no pointer cursor, no hover tint, not focusable, skipped by the Tab order.
 *     (.uix-navitem on a non-focusable element was the false affordance TENSOR shipped.)
 *   • .uix-navitem keeps its pointer affordance (the contrast that makes the contract real).
 *   • The sidebar identity menu is a native popover: it opens from the trigger,
 *     Escape closes it and focus returns to the trigger, aria-expanded tracks state.
 *   • The identity-demo shell stays axe-clean (serious/critical) WITH the menu open —
 *     the whole-page scan only ever sees it closed.
 *   • Rail mode: the identity collapses to the org mark and the footer stacks.
 *
 * Shares the deterministic-theming preamble with the other suites.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const DEMO = '[data-uix-identity-demo]';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name; // 'light' | 'dark'
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('index.html', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
});

test('navsection is static: no pointer, no hover tint, unfocusable, out of the tab order', async ({ page }) => {
  const header = page.locator(`${DEMO} .uix-navsection`);
  await expect(header).toHaveCount(1);

  // not pointer-styled (the false affordance), while a real navitem IS
  await expect(header).toHaveCSS('cursor', 'default');
  await expect(page.locator(`${DEMO} .uix-navitem`).first()).toHaveCSS('cursor', 'pointer');

  // hover paints nothing (navitem's hover tint must not leak onto the header)
  const bgBefore = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  await header.hover();
  const bgAfter = await header.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bgAfter).toBe(bgBefore);

  // not focusable: programmatic focus must not land on it
  const tookFocus = await header.evaluate((el) => { el.focus(); return document.activeElement === el; });
  expect(tookFocus).toBe(false);
  await expect(header).not.toHaveAttribute('tabindex', /.*/);
  await expect(header).not.toHaveAttribute('aria-current', /.*/);

  // tab order skips it: from the navitem above, Tab lands on the first child item below
  await page.locator(`${DEMO} .uix-navitem`, { hasText: 'Incidents' }).focus();
  await page.keyboard.press('Tab');
  const focusedLabel = await page.evaluate(() => document.activeElement?.textContent?.trim());
  expect(focusedLabel).toBe('Compliance & governance');
});

test('identity menu: opens from the trigger, Escape closes and restores focus', async ({ page }) => {
  const trigger = page.locator(`${DEMO} .uix-identity`);
  const menu = page.locator('#acct-menu');

  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  // move focus into the menu, then Escape: closed + focus back on the trigger
  await page.keyboard.press('Tab');
  await expect(menu.locator('.uix-menu__item').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('identity shell is axe-clean with the account menu open', async ({ page }, testInfo) => {
  await page.locator(`${DEMO} .uix-identity`).click();
  await expect(page.locator('#acct-menu')).toBeVisible();

  const { violations } = await new AxeBuilder({ page })
    .include(DEMO)
    .include('#acct-menu')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const gated = violations.filter((v) => GATED.has(v.impact));

  await testInfo.attach('axe-violations.json', {
    body: JSON.stringify(violations, null, 2),
    contentType: 'application/json',
  });
  const summary = gated
    .map((v) => `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
    .join('\n');
  expect(gated, `menu-open identity shell violations:\n${summary}`).toEqual([]);
});

test('rail mode: identity collapses to the org mark, footer stacks vertically', async ({ page }) => {
  const sidebar = page.locator(DEMO);
  await page.locator(`${DEMO} [data-uix-collapse]`).click();
  await expect(sidebar).toHaveAttribute('data-collapsed', /.*/);

  await expect(page.locator(`${DEMO} .uix-identity__lines`)).toBeHidden();
  await expect(page.locator(`${DEMO} .uix-identity__chevron`)).toBeHidden();
  await expect(page.locator(`${DEMO} .uix-avatar--org`)).toBeVisible(); // still the menu trigger
  await expect(page.locator(`${DEMO} .uix-sidebar__footer`)).toHaveCSS('flex-direction', 'column');
  await expect(page.locator(`${DEMO} .uix-navsection__label`)).toBeHidden();
});
