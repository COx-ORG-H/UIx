/* SearchBar (HAR-2030; TENSOR audit UXC-02, B-11): one search field look and behaviour — a
 * leading magnifier, a clear button while there is text, Enter searches, Escape clears — over the
 * `.uix-searchbar` contract. TENSOR hand-built it three ways (14 sites), each with its own clear,
 * icon, label and Enter behaviour.
 *
 * Measured on a React harness (tests/search-bar/harness.tsx) with German labels, in both themes:
 * the keyboard path, the 44 px public floor, a field inside a form and inside a drawer, and the
 * row at 320 px.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/search-bar/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, viewport) => {
  if (viewport) await page.setViewportSize(viewport);
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('#portal')).toBeVisible();
};
const record = (page, key) => page.evaluate((k) => window.__searchBar[k] ?? { submits: [], clears: 0, formSubmits: 0, drawerCloses: 0 }, key);

test('a search landmark named by its label, with one search field', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const landmark = page.getByRole('search', { name: 'Dienste durchsuchen' });
  await expect(landmark).toBeVisible();
  await expect(landmark.getByRole('searchbox', { name: 'Dienste durchsuchen' })).toBeVisible();
});

test('type, Enter searches, Escape clears and keeps focus; the clear button does the same', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const field = page.locator('#portal').getByRole('searchbox');
  const clear = page.getByRole('button', { name: 'Suche leeren' });
  await expect(clear).toHaveCount(0);
  await field.fill('Drucker');
  await expect(clear).toBeVisible();
  await field.press('Enter');
  expect((await record(page, 'portal')).submits).toEqual(['Drucker']);
  await field.press('Escape');
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();
  await expect(clear).toHaveCount(0);
  await field.fill('VPN');
  await clear.click();
  await expect(field).toHaveValue('');
  await expect(field).toBeFocused();
  expect((await record(page, 'portal')).clears).toBe(2);
  // The submit button searches too.
  await field.fill('Laptop');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  expect((await record(page, 'portal')).submits).toEqual(['Drucker', 'Laptop']);
});

test('lg is the 44 px public floor; md is a control-height field; the icon sits inside the field', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const sizes = await page.evaluate(() => Object.fromEntries(['portal', 'header'].map((id) => {
    const root = document.getElementById(id);
    const input = root.querySelector('input');
    const icon = root.querySelector('.uix-searchbar__wrap > svg');
    const button = root.querySelector('.uix-btn');
    const [i, s] = [input.getBoundingClientRect(), icon.getBoundingClientRect()];
    const text = parseFloat(getComputedStyle(input).paddingLeft);
    return [id, { input: i.height, button: button?.getBoundingClientRect().height, iconInside: s.left > i.left && s.right < i.left + text, centred: Math.abs((s.top + s.bottom) / 2 - (i.top + i.bottom) / 2) < 1 }];
  })));
  expect(sizes.portal.input).toBeGreaterThanOrEqual(44);
  expect(sizes.portal.button).toBeGreaterThanOrEqual(44);
  expect(sizes.header.input).toBeLessThan(44);
  for (const id of ['portal', 'header']) {
    expect(sizes[id].iconInside, `${id}: the magnifier sits in the field's left padding`).toBe(true);
    expect(sizes[id].centred, `${id}: the magnifier is centred on the field`).toBe(true);
  }
});

test('the text never runs under the clear button', async ({ page }, testInfo) => {
  await open(page, testInfo);
  for (const id of ['portal', 'header']) {
    await page.locator(`#${id}`).getByRole('searchbox').fill('Netzwerkdrucker im dritten Stock');
    const { textEnd, clearStart } = await page.locator(`#${id}`).evaluate((root) => {
      const input = root.querySelector('input');
      const r = input.getBoundingClientRect();
      return { textEnd: r.right - parseFloat(getComputedStyle(input).paddingRight), clearStart: root.querySelector('.uix-searchbar__clear').getBoundingClientRect().left };
    });
    expect(textEnd, `${id}: the text area ends before the clear button`).toBeLessThanOrEqual(clearStart);
  }
});

test('Enter inside a form searches and never submits the form', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const field = page.locator('#in-form').getByRole('searchbox');
  await field.fill('Vorlage');
  await field.press('Enter');
  const seen = await record(page, 'in-form');
  expect(seen.submits).toEqual(['Vorlage']);
  expect(seen.formSubmits).toBe(0);
});

test('in a drawer: Escape clears a field with text, and closes the drawer once it is empty', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#open-drawer').click();
  const dialog = page.locator('dialog#drawer');
  await expect(dialog).toHaveJSProperty('open', true);
  const field = page.locator('#in-drawer').getByRole('searchbox');
  await field.fill('Passwort');
  await field.press('Escape');
  await expect(field).toHaveValue('');
  await expect(dialog).toHaveJSProperty('open', true);
  await field.press('Escape');
  await expect(dialog).toHaveJSProperty('open', false);
  await expect.poll(async () => (await record(page, 'in-drawer')).drawerCloses).toBe(1);
});

test('at 320 px the portal search fits, with a German label, and nothing scrolls sideways', async ({ page }, testInfo) => {
  await open(page, testInfo, { width: 320, height: 800 });
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(doc.scroll).toBe(doc.client);
  const fits = await page.locator('#portal').evaluate((root) => {
    const r = root.getBoundingClientRect();
    return [...root.querySelectorAll('input, .uix-btn')].every((el) => { const b = el.getBoundingClientRect(); return b.left >= r.left - 0.5 && b.right <= r.right + 0.5 && b.width > 40; });
  });
  expect(fits).toBe(true);
  // An md field keeps its button beside it; the lg portal field may stack its button below.
  const row = await page.locator('#toolbar').evaluate((root) => {
    const [input, button] = [root.querySelector('input').getBoundingClientRect(), root.querySelector('.uix-btn').getBoundingClientRect()];
    return { sameRow: Math.abs(input.top - button.top) < 8, inside: button.right <= root.getBoundingClientRect().right + 0.5 };
  });
  expect(row).toEqual({ sameRow: true, inside: true });
});

test('axe: every search field, with text', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await page.locator('#portal').getByRole('searchbox').fill('Drucker');
  await page.locator('#header').getByRole('searchbox').fill('Netzwerk');
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.passes.length).toBeGreaterThan(0);
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});
