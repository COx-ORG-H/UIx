/* Inset (HAR-1818) on the Card reference page, light and dark: a bordered, sunken well inside the
 * card body, not a second card. It has the hairline border, the md radius, the subtle background
 * that differs from the card's surface, the space-4 / space-3 padding, no shadow, and it stays
 * inside the card body at 320 px with a long Bosnian header in it. Axe is clean on the page. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page, theme, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto('docs/explorer.html#card', { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('[data-component-preview="card"] [data-card-inset-example] .uix-inset').first()).toBeVisible();
}

const tokens = (page, names) => page.evaluate((list) => Object.fromEntries(list.map((n) => {
  const probe = document.createElement('div');
  probe.style.cssText = `background-color: var(${n}); border-top: 1px solid var(${n}); padding-top: var(${n}); border-top-left-radius: var(${n})`;
  document.body.append(probe);
  const s = getComputedStyle(probe);
  const out = { colour: s.backgroundColor, length: s.paddingTop, radius: s.borderTopLeftRadius };
  probe.remove();
  return [n, out];
})), names);

test('the well: hairline border, md radius, subtle background, no shadow, space-4 / space-3 padding', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const wells = await page.locator('[data-component-preview="card"] [data-card-inset-example] .uix-inset').evaluateAll((els) => els.map((el) => {
    const s = getComputedStyle(el);
    const card = getComputedStyle(el.closest('.uix-card'));
    return { border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, radius: s.borderTopLeftRadius, bg: s.backgroundColor, cardBg: card.backgroundColor, shadow: s.boxShadow, padding: s.paddingTop, inBody: !!el.closest('.uix-card__body') };
  }));
  const t = await tokens(page, ['--uix-border', '--uix-radius-md', '--uix-bg-subtle', '--uix-space-4', '--uix-space-3']);
  expect(wells).toHaveLength(2);
  for (const w of wells) {
    expect(w.border).toBe(`1px solid ${t['--uix-border'].colour}`);
    expect(w.radius).toBe(t['--uix-radius-md'].radius);
    expect(w.bg).toBe(t['--uix-bg-subtle'].colour);
    expect(w.bg, 'the well differs from the card surface').not.toBe(w.cardBg);
    expect(w.shadow).toBe('none');
    expect(w.inBody).toBe(true);
  }
  expect(wells[0].padding).toBe(t['--uix-space-4'].length);
  expect(wells[1].padding).toBe(t['--uix-space-3'].length);
});

test('at 320 px a long header stays inside the well and the well inside the card body', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, 320);
  const fit = await page.evaluate(() => {
    const well = document.querySelector('[data-component-preview="card"] [data-card-inset-example] .uix-inset');
    well.querySelector('strong').textContent = 'Javnaustanovanarodnaiuniverzitetskabibliotekaderviš-sušićtuzla';
    const body = well.closest('.uix-card__body').getBoundingClientRect();
    const w = well.getBoundingClientRect();
    const strong = well.querySelector('strong').getBoundingClientRect();
    return { wellInBody: w.left >= body.left - 0.5 && w.right <= body.right + 0.5, textInWell: strong.right <= w.right + 0.5, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(fit).toEqual({ wellInBody: true, textInWell: true, overflow: 0 });
});

test('axe: no serious or critical violations on the Card page', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name);
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id)).toEqual([]);
});
