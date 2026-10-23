/* ContactCard (HAR-1379; MOTUS C-15, TENSOR incident people card): a person at a glance.
 *
 * In Chromium, light and dark, with Bosnian words: Email / Call are links named for the person,
 * an erased contact offers nothing that reaches anyone, a long name and address stay inside a
 * 15rem column and at 320 px, the actions are at least 24 px tall, a bare card inside a Card
 * has no second padding, and axe passes in every state.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/display/harness.html?case=contact';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#contact-active')).toBeVisible();
};

test('Email and Call are mailto: and tel: links named for the person', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const card = page.locator('#contact-active');
  await expect(card.getByRole('link', { name: 'E-pošta: Amra Hadžić' })).toHaveAttribute('href', 'mailto:amra.hadzic@dom-zdravlja.example');
  await expect(card.getByRole('link', { name: 'Pozovi: Amra Hadžić' })).toHaveAttribute('href', 'tel:+38761234567');
  await expect(card.getByRole('link', { name: 'Amra Hadžić', exact: true })).toHaveAttribute('href', '#amra');
  for (const link of await card.locator('.uix-contact__actions > a').all()) {
    expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(24);
  }
});

test('an erased contact offers nothing that reaches anyone; an unavailable one keeps only its name', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await expect(page.locator('#contact-purged').getByRole('link')).toHaveCount(0);
  await expect(page.locator('#contact-purged')).toContainText('Uklonjen kontakt');
  await expect(page.locator('#contact-purged')).not.toContainText('Edin');
  await expect(page.locator('#contact-unavailable').getByRole('link')).toHaveCount(0);
  await expect(page.locator('#contact-unavailable')).toContainText('Selma Đurđević');
  await expect(page.locator('#contact-unavailable')).toContainText('Kontakt podaci nisu dostupni');
});

for (const width of [320, 1280]) {
  test(`at ${width} px a long name and address stay inside their card`, async ({ page }, testInfo) => {
    await open(page, testInfo, { width, height: 900 });
    const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(doc.scroll).toBe(doc.client);
    const inside = await page.locator('#contact-long').evaluate((card) => {
      const box = card.getBoundingClientRect();
      return [...card.querySelectorAll('.uix-contact > *, .uix-contact__actions > *')].every((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= box.left - 0.5 && r.right <= box.right + 0.5;
      });
    });
    expect(inside).toBe(true);
  });
}

test('bare inside a Card: the card body’s padding is the only padding', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const pad = await page.locator('#contact-bare').evaluate((el) => getComputedStyle(el).paddingTop);
  expect(pad).toBe('0px');
});

test('keyboard: the name, Email and Call are reached in order with a visible focus ring', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#contact-active .uix-contact__name a').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#contact-active').getByRole('link', { name: 'E-pošta: Amra Hadžić' })).toBeFocused();
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(ring).not.toBe('none');
  await page.keyboard.press('Tab');
  await expect(page.locator('#contact-active').getByRole('link', { name: 'Pozovi: Amra Hadžić' })).toBeFocused();
});

test('axe: active, erased, unavailable, long, bare', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
