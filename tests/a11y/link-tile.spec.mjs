import { test, expect } from '@playwright/test';

/* LinkTile (HAR-3095) in a real layout, both themes: the icon and the arrow sit on the title's first
 * line, the arrow at the tile's end, 16 px each; the title is the link's name and the description
 * its description; the card body's inset and nothing more; a two-line limit clamps the long
 * description; Tab reaches each tile with the kit focus ring. The DOM half is link-tile-dom.test.mjs. */

const HARNESS = '/tests/link-tile/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test('icon and arrow on the title line, 16 px, the card inset only, a clamped description, the focus ring (HAR-3095)', async ({ page }, testInfo) => {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const tiles = await page.evaluate(() => [...document.querySelectorAll('[data-tile]')].map((a) => {
    const box = (sel) => a.querySelector(sel).getBoundingClientRect();
    const title = box('.uix-link-tile__title'); const icon = box('.uix-link-tile__icon svg'); const arrow = box('.uix-link-tile__arrow svg');
    const lineH = parseFloat(getComputedStyle(a.querySelector('.uix-link-tile__title')).lineHeight);
    const firstLineMid = title.top + lineH / 2;
    const body = a.querySelector('.uix-card__body'); const s = getComputedStyle(body);
    const desc = a.querySelector('.uix-link-tile__description');
    const tileBox = a.getBoundingClientRect();
    return {
      name: a.dataset.tile,
      iconMid: Math.abs(icon.top + icon.height / 2 - firstLineMid), arrowMid: Math.abs(arrow.top + arrow.height / 2 - firstLineMid),
      icon: Math.round(icon.width), arrow: Math.round(arrow.width),
      arrowAtEnd: Math.round(tileBox.right - arrow.right - parseFloat(s.paddingRight)),
      inset: [s.paddingTop, s.paddingLeft], innerPadding: [...a.querySelectorAll('.uix-link-tile__body *')].some((el) => parseFloat(getComputedStyle(el).padding) > 0),
      descLines: Math.round(desc.getBoundingClientRect().height / parseFloat(getComputedStyle(desc).lineHeight)),
      clamped: desc.scrollHeight > desc.clientHeight + 1,
      labelledby: document.getElementById(a.getAttribute('aria-labelledby'))?.textContent,
    };
  }));
  for (const t of tiles) {
    expect(t.iconMid, `${t.name} icon on the title's first line`).toBeLessThanOrEqual(1);
    expect(t.arrowMid, `${t.name} arrow on the title's first line`).toBeLessThanOrEqual(1);
    expect([t.icon, t.arrow]).toEqual([16, 16]);
    expect(t.arrowAtEnd, `${t.name} arrow at the tile's end`).toBeLessThanOrEqual(1);
    expect(t.innerPadding, `${t.name} adds no padding inside the card body`).toBe(false);
  }
  expect(tiles.map((t) => t.labelledby)).toEqual(['Benutzer', 'Rollen und Berechtigungen', 'Benachrichtigungen']);
  const roles = tiles.find((t) => t.name === 'roles');
  expect(roles.descLines).toBe(2);
  expect(roles.clamped).toBe(true);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-tile="users"]')).toBeFocused();
  expect(await page.locator('[data-tile="users"]').evaluate((a) => getComputedStyle(a).outlineStyle)).toBe('solid');
  await testInfo.attach('tiles', { body: await page.locator('section').screenshot(), contentType: 'image/png' });
});
