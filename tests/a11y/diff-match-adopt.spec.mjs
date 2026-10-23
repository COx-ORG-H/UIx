/* HAR-1369 (MOTUS B-A9) in Chromium: a DiffViewer whose entries are named for people, whose values
 * the product renders and whose versions say where they came from; a MatchReview in adopt mode,
 * operated with the keyboard, with the busy state only after 300 ms, a failure that keeps the
 * choice, and a phone layout that keeps the table's semantics. Bosnian/German harness:
 * tests/diff-match-adopt/harness.tsx. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/diff-match-adopt/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('.harness-match')).toBeVisible();
};

test('DiffViewer: names instead of paths, values as the product shows them, where each came from', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const diff = page.locator('.harness-diff');
  await expect(diff.locator('.uix-diff-viewer__name')).toHaveText(['Oznake', 'Autori', 'Naslov', 'Dvorana', 'Godina prvog izdanja']);
  await expect(diff.locator('code')).toHaveCount(0);
  await expect(diff.getByRole('region', { name: 'Njihovo: Oznake' }).locator('.uix-chip')).toHaveText(['roman', 'klasik', 'lektira']);
  await expect(diff.getByRole('region', { name: 'Moje: Oznake' })).toContainText('Izmijenila Ana, 12. 10. 2026');
  await diff.getByRole('button', { name: 'Preuzmi njihovo za Oznake' }).click();
  await expect(diff.getByRole('button', { name: 'Preuzmi njihovo za Oznake' })).toHaveAttribute('aria-pressed', 'true');
});

test('adopt with the keyboard: Space checks, the button says how many, busy only after 300 ms, the result is announced', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const dnb = page.getByRole('region', { name: 'Deutsche Nationalbibliothek' });
  await expect(dnb.getByRole('checkbox')).toHaveCount(3);
  await dnb.getByRole('checkbox', { name: 'Autor von Deutsche Nationalbibliothek übernehmen' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(dnb.getByRole('checkbox', { name: 'Verlag von Deutsche Nationalbibliothek übernehmen' })).toBeFocused();
  await page.keyboard.press('Space');
  const adopt = dnb.getByRole('button', { name: '2 Felder übernehmen' });
  await adopt.click();
  const early = await adopt.evaluate((b) => new Promise((resolve) => setTimeout(() => resolve(b.querySelector('[data-uix-btn-busy]') ? 'spinner' : null), 150)));
  expect(early, 'no spinner for the first 300 ms').toBeNull();
  await expect(adopt.locator('[data-uix-btn-busy]')).toHaveCount(1);
  await expect(dnb.getByRole('status')).toHaveText('2 Felder von Deutsche Nationalbibliothek übernommen');
  expect(await page.evaluate(() => window.__adopt.adopted)).toEqual([['dnb-1', ['author', 'publisher']]]);
});

test('a failed adopt keeps the choice and says so; a resolved candidate has no actions', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const dnb = page.getByRole('region', { name: 'Deutsche Nationalbibliothek' });
  await dnb.getByRole('checkbox', { name: /ISBN/ }).check();
  await dnb.getByRole('button', { name: '1 Felder übernehmen' }).click();
  await expect(dnb.getByRole('status')).toHaveText('Übernehmen fehlgeschlagen. Bitte erneut versuchen.');
  await expect(dnb.getByRole('checkbox', { name: /ISBN/ })).toBeChecked();
  const wikidata = page.getByRole('region', { name: 'Wikidata' });
  await expect(wikidata.getByRole('button')).toHaveCount(0);
  await expect(wikidata.locator('summary')).toHaveText('Herkunft');
});

test('at 320 px each field is a block, the table keeps its roles, nothing scrolls sideways; axe', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  const dnb = page.getByRole('region', { name: 'Deutsche Nationalbibliothek' });
  await expect(dnb.getByRole('table')).toBeVisible();
  await expect(dnb.getByRole('rowheader')).toHaveText(['Titel', 'Autor', 'Jahr', 'ISBN', 'Verlag']);
  await expect(dnb.getByRole('cell', { name: 'Meša Selimović' })).toBeVisible();
  const words = await dnb.locator('tbody th').evaluateAll((ths) => ths.map((th) => th.getClientRects().length));
  expect(words.every((n) => n === 1), 'no field name breaks across lines').toBe(true);
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
