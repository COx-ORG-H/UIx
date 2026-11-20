/* TaskTray (Docs/specs/2026-11-20-task-tray.md) in Chromium on tests/task-tray/harness.html, in both themes:
 *   - while a task exists the tray is a named region with a pill (a disclosure button); axe is clean
 *     collapsed and expanded, with one task and with five, at 1280 and 320 px;
 *   - keyboard: Enter opens and focus stays on the pill, Tab goes into the panel, Escape collapses onto
 *     the pill; Cancel hands focus to the same row; dismissing the last task gives focus back;
 *   - a start, a finish and a failure are announced politely, a percentage never;
 *   - the panel grows from the pill and stays inside the motion budget; under reduced motion only
 *     opacity moves; opened from the keyboard it appears at once;
 *   - at phone width nothing scrolls sideways and long titles wrap inside the panel.
 * The store and the React wiring are pinned in packages/react/src/task-tray-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/task-tray/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme, query) {
  await page.goto(`${HARNESS}?${query}&theme=${theme}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

async function axeClean(page) {
  const { violations } = await new AxeBuilder({ page }).include('.uix-task-tray').analyze();
  expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

for (const [scene, width] of [['one', 1280], ['five', 1280], ['five', 320], ['long', 390], ['failure', 1280]]) {
  test(`${scene} at ${width}px: a named region, a disclosure pill, axe clean collapsed and open, no sideways scroll`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, themeOf(testInfo), `scene=${scene}`);
    const region = page.getByRole('region', { name: 'Background tasks' });
    await expect(region).toBeVisible();
    const pill = region.getByRole('button', { name: /^Background tasks: / });
    await expect(pill).toHaveAttribute('aria-expanded', 'false');
    await axeClean(page);
    await pill.click();
    await expect(pill).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('.uix-task-tray__panel');
    await expect(panel).toBeVisible();
    await page.waitForTimeout(400); // the grow-in settles before axe reads colours
    await axeClean(page);
    // the panel and every title stay inside the viewport; titles wrap instead of overflowing
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const clipped = await page.locator('.uix-task-tray__title, .uix-task-tray__line').evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
    expect(clipped).toEqual([]);
    // targets: every control at least 24 px both ways
    const small = await region.locator('button, a').evaluateAll((els) => els.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 24 || r.height < 24;
    }).map((el) => el.textContent || el.getAttribute('aria-label')));
    expect(small).toEqual([]);
  });
}

test('keyboard: Enter opens with focus on the pill, Tab enters the panel, Escape collapses onto the pill', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo), 'scene=five');
  const pill = page.locator('.uix-task-tray__pill');
  await pill.focus();
  await page.keyboard.press('Enter');
  await expect(pill).toHaveAttribute('aria-expanded', 'true');
  await expect(pill).toBeFocused();
  // opened from the keyboard: no transition (motion.css [data-uix-key-opened])
  await expect(page.locator('.uix-task-tray__panel')).toHaveAttribute('data-uix-key-opened', '');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear finished' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.uix-task-tray__task').first().getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pill).toHaveAttribute('aria-expanded', 'false');
  await expect(pill).toBeFocused();
  await expect(page.locator('.uix-task-tray__panel')).toBeHidden();
});

test('Cancel hands focus to the same row; dismissing the last task returns focus to where it came from', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo), 'scene=live&open=1');
  const start = page.locator('#start-export');
  await start.click();
  const cancel = page.locator('.uix-task-tray__task').getByRole('button', { name: 'Cancel' });
  await expect(cancel).toBeVisible();
  await start.focus();
  await cancel.focus(); // focus enters the tray from the Start button
  await page.keyboard.press('Enter');
  const row = page.locator('.uix-task-tray__task[data-status="cancelled"]');
  await expect(row).toBeVisible();
  const dismiss = row.getByRole('button', { name: 'Dismiss' });
  await expect(dismiss).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('section.uix-task-tray')).toHaveCount(0);
  await expect(start).toBeFocused();
});

test('announces a start, a finish and a failure politely, never a percentage', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo), 'scene=live');
  const live = page.locator('[role="status"][aria-live="polite"]').first();
  await expect(live).toHaveText('');
  await page.evaluate(() => { window.__task = window.__tasks.start('Export 4,000 tickets', { value: 0, max: 4000 }); });
  await expect(live).toHaveText('Started: Export 4,000 tickets');
  await page.evaluate(() => window.__task.update({ value: 2000, step: 'Writing CSV' }));
  await expect(live).not.toContainText('%');
  await page.evaluate(() => window.__task.complete({ message: '4,000 rows written' }));
  await expect(live).toContainText('Done: Export 4,000 tickets. 4,000 rows written');
  await page.evaluate(() => window.__tasks.start('Import users.csv').fail({ message: '12 rows are invalid' }));
  await expect(live).toContainText('Failed: Import users.csv. 12 rows are invalid');
  await expect(page.locator('.uix-task-tray__task[aria-busy="true"]')).toHaveCount(0);
});

test('motion: the panel grows from the pill within budget; reduced motion fades only', async ({ page }, testInfo) => {
  const timing = async () => page.locator('.uix-task-tray__panel').evaluate((el) => {
    const cs = getComputedStyle(el);
    const ms = (v) => Math.max(...v.split(',').map((t) => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000)));
    return { props: cs.transitionProperty, duration: ms(cs.transitionDuration), origin: cs.transformOrigin };
  });
  await open(page, themeOf(testInfo), 'scene=one');
  await page.locator('.uix-task-tray__pill').click();
  const normal = await timing();
  expect(normal.props).toContain('transform');
  expect(normal.duration).toBeLessThanOrEqual(300);
  expect(normal.origin.endsWith('100%') || normal.origin.split(' ')[1] !== '0px').toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, themeOf(testInfo), 'scene=one');
  await page.locator('.uix-task-tray__pill').click();
  const reduced = await timing();
  expect(reduced.props).not.toContain('transform');
  expect(reduced.props).toContain('opacity');
  const pillProps = await page.locator('.uix-task-tray__pill').evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(pillProps).not.toContain('transform');
});
