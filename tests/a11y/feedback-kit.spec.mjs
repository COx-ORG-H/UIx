/* The state-feedback kit in a real browser (motion rollout WP2: HAR-2580..2582). The harness
 * (tests/feedback-kit/harness.tsx) fakes a server whose answer time is picked on the page; the
 * page clock is installed and paused, so timers move only with runFor (axe takes seconds) while
 * CSS transitions still render in real time.
 *   - Button loading: blocks at once, nothing visible for 300 ms, then a spinner in full colour;
 *     a fast action never shows one; the result crossfades in, is announced outside the button,
 *     holds 1.5 s; the button and its neighbours never move.
 *   - BusyRegion and TableWrap refreshing: the rows stay, aria-busy at once, the dim and the
 *     bar after 300 ms; reduced motion turns the sweep into a full, breathing bar.
 *   - Spinner / LoadingState delay; SaveStatus says nothing for a fast save.
 *   - axe in both themes, at rest and mid-feedback; nothing scrolls sideways at 320 px.
 * The timing contract is unit-tested in packages/react/src/feedback-pending-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/feedback-kit/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.clock.install();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(HARNESS);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.getByTestId('save')).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
});

const latency = async (page, ms, fail = false) => {
  await page.locator('#latency').getByLabel(`${ms} ms`).check();
  await page.locator('#latency').getByLabel('and fails').setChecked(fail);
};
const spinner = (locator) => locator.evaluate((el) => getComputedStyle(el, '::after').content !== 'none');
const xs = (page) => page.getByTestId('row').evaluate((row) => [...row.children].map((b) => Math.round(b.getBoundingClientRect().x)));
const axe = async (page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test('Button loading: blocked at once, quiet for 300 ms, then a full-colour spinner; the result holds 1.5 s', async ({ page }) => {
  const save = page.getByTestId('save');
  const status = page.locator('body > [role="status"]').first();
  const before = await xs(page);
  const width = (await save.boundingBox()).width;

  await save.click();
  await page.clock.runFor(200);
  await expect(save).toHaveAttribute('aria-busy', 'true');
  await expect(save).toHaveAttribute('aria-disabled', 'true');
  expect(await spinner(save), 'a spinner inside the first 300 ms').toBe(false);
  await expect(save).toHaveCSS('opacity', '1');

  await page.clock.runFor(150);
  expect(await spinner(save), 'no spinner after 300 ms').toBe(true);
  await expect(save).toHaveCSS('opacity', '1');

  await page.clock.runFor(900);
  await expect(save.locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');
  await expect(save.locator('[data-kind="success"]')).toHaveCSS('opacity', '1');
  await expect(save.locator('.uix-btn__label')).toHaveCSS('opacity', '0');
  await expect(status).toHaveText('Saved');
  await expect(save).toHaveAccessibleName('Save');
  expect(await xs(page), 'a neighbour moved').toEqual(before);
  expect((await save.boundingBox()).width).toBeCloseTo(width, 0);

  await page.clock.runFor(1500);
  await expect(save.locator('.uix-btn__face')).not.toHaveAttribute('data-result', /./);
  await expect(save.locator('.uix-btn__label')).toHaveCSS('opacity', '1');
  await expect(status).toHaveText('');
});

test('Button: a fast action never shows a spinner; a failure says so in words', async ({ page }) => {
  await latency(page, 150);
  const assign = page.getByTestId('assign');
  await assign.click();
  for (let t = 0; t < 4; t += 1) {
    await page.clock.runFor(50);
    expect(await spinner(assign), `spinner at ${(t + 1) * 50} ms`).toBe(false);
  }
  await expect(assign.locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');

  await page.clock.runFor(1600);
  await latency(page, 1200, true);
  await assign.click();
  await page.clock.runFor(1300);
  await expect(assign.locator('.uix-btn__face')).toHaveAttribute('data-result', 'error');
  await expect(assign.locator('[data-kind="error"]')).toHaveText('Not assigned');
  await expect(page.locator('body > [role="status"]').nth(1)).toHaveText('Not assigned');
});

test('BusyRegion and TableWrap refreshing keep the rows; aria-busy at once, dim and bar after 300 ms', async ({ page }) => {
  const region = page.getByTestId('region');
  const table = page.getByTestId('table');
  const firstRow = table.locator('tbody tr').first();
  await expect(firstRow).toContainText('INC-0412');

  await page.getByTestId('refetch').click();
  await page.clock.runFor(200);
  await expect(region).toHaveAttribute('aria-busy', 'true');
  await expect(table).toHaveAttribute('aria-busy', 'true');
  await expect(region.locator('.uix-busy-bar')).toHaveCSS('opacity', '0');
  await expect(region.locator('li')).toHaveCount(3);

  await page.clock.runFor(150);
  await expect(region.locator('.uix-busy-bar')).toHaveCSS('opacity', '1');
  await expect(region.locator('.uix-busy-region__content')).toHaveCSS('opacity', '0.6');
  await expect(region.locator('ul'), 'the children keep their own opacity and transitions').toHaveCSS('opacity', '1');
  await expect(table.locator('tbody')).toHaveCSS('opacity', '0.6');
  await expect(table.locator('thead')).toHaveCSS('opacity', '1');
  const bar = await table.locator('.uix-busy-bar').evaluate((el) => {
    const cs = getComputedStyle(el);
    const before = getComputedStyle(el, '::before');
    const wrap = el.parentElement;
    return { position: cs.position, height: el.getBoundingClientRect().height, stripe: parseFloat(before.height), animation: before.animationName, sideways: wrap.scrollWidth - wrap.clientWidth };
  });
  // the bar takes no room, draws a 2 px stripe, and its sweep never widens the scroll area
  expect(bar).toEqual({ position: 'sticky', height: 0, stripe: 2, animation: 'uix-busy-sweep', sideways: 0 });
  await expect(firstRow, 'the rows were swapped for skeletons').toContainText('INC-0412');

  await page.clock.runFor(1000);
  await expect(region).not.toHaveAttribute('aria-busy', /./);
  await expect(firstRow).toContainText('INC-0421');
  await expect(region.locator('.uix-busy-region__content')).toHaveCSS('opacity', '1');
});

test('reduced motion: the bar is a full, pulsing bar instead of a sweep', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('refetch').click();
  await page.clock.runFor(350);
  const bar = await page.getByTestId('region').locator('.uix-busy-bar').evaluate((el) => {
    const before = getComputedStyle(el, '::before');
    return { animation: before.animationName, duration: parseFloat(before.animationDuration), iterations: before.animationIterationCount, width: Math.round(parseFloat(before.width)), barWidth: Math.round(el.getBoundingClientRect().width), transform: before.transform };
  });
  expect(bar.animation).toBe('uix-pulse');
  // the kit's reduced-motion policy ends keyframes at once; the bar must opt back in and keep breathing
  expect(bar.duration).toBeGreaterThan(1);
  expect(bar.iterations).toBe('infinite');
  expect(bar.width).toBe(bar.barWidth);
  expect(bar.transform).toBe('none');
});

test('Spinner and LoadingState delay; SaveStatus skips "Saving…" for a fast save', async ({ page }) => {
  await page.getByTestId('load').click();
  await page.clock.runFor(200);
  await expect(page.getByTestId('spinner')).toHaveCount(0);
  await expect(page.locator('#loaders .uix-skeleton')).toHaveCount(0);
  await page.clock.runFor(150);
  await expect(page.getByTestId('spinner')).toHaveText('Loading the queue');
  await expect(page.locator('#loaders .uix-skeleton')).toHaveCount(3);

  await page.clock.runFor(1000);
  await latency(page, 150);
  const status = page.getByTestId('save-status');
  await page.locator('#save-status input').fill('Printer on floor 2');
  await page.clock.runFor(400);
  for (let t = 0; t < 4; t += 1) {
    await page.clock.runFor(50);
    await expect(status).not.toHaveAttribute('data-state', 'saving');
  }
  await expect(status).toHaveAttribute('data-state', 'saved');
  await expect(status.getByRole('status')).toHaveText('Saved');
});

// axe schedules its own timers, so it cannot run on the paused clock; with the clock running a
// 1.5 s result would be gone before it finished. Each mid-feedback state is copied into a static
// block first (the copy keeps its attributes and computed look), then the clock runs and axe
// checks the copies along with the live page.
const freeze = (page, testIds) => page.evaluate((ids) => {
  const block = document.createElement('div');
  block.dataset.frozen = '';
  for (const id of ids) {
    const copy = document.querySelector(`[data-testid="${id}"]`).cloneNode(true);
    for (const el of [copy, ...copy.querySelectorAll('[data-testid]')]) el.removeAttribute('data-testid');
    block.append(copy);
  }
  document.getElementById('root').append(block);
}, testIds);

test('axe: no serious or critical violations at rest, mid-spinner, on a result and while refreshing', async ({ page }) => {
  await page.getByTestId('save').click();
  await page.getByTestId('refetch').click();
  await page.clock.runFor(400);
  await freeze(page, ['row', 'region', 'table']);
  await page.clock.runFor(900);
  await expect(page.getByTestId('save').locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');
  await freeze(page, ['row']);
  await expect(page.locator('[data-frozen] .uix-btn__face[data-result="success"]')).toHaveCount(1);
  await expect(page.locator('[data-frozen] .uix-busy-bar[data-shown]')).toHaveCount(2);
  await page.clock.resume();
  expect(await axe(page)).toEqual([]);
});

test('in a modal the result is announced inside the dialog; an icon button shows the mark alone', async ({ page }) => {
  await page.getByTestId('open-dialog').click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('dialog-save').click();
  await page.clock.runFor(1300);
  await expect(dialog.getByTestId('dialog-save').locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');
  // the body is inert behind a modal: the region must live in the dialog
  await expect(dialog.locator(':scope > [role="status"], [role="status"]').filter({ hasText: 'Saved' })).toHaveCount(1);
  await page.keyboard.press('Escape');

  const pin = page.getByTestId('pin');
  const box = await pin.boundingBox();
  await pin.click();
  await page.clock.runFor(1300);
  await expect(pin.locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');
  await expect(pin.locator('[data-kind="success"] .uix-btn__result-text')).toBeHidden();
  const after = await pin.boundingBox();
  expect([after.width, after.height]).toEqual([box.width, box.height]);
  await expect(pin).toHaveAccessibleName('Pin view');
  await expect(page.locator('body > [role="status"]').filter({ hasText: 'Pinned' })).toHaveCount(1);
});

test('right to left: the bar sweeps from the right edge leftwards', async ({ page }) => {
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.getByTestId('refetch').click();
  await page.clock.runFor(350);
  const name = await page.getByTestId('region').locator('.uix-busy-bar').evaluate((el) => getComputedStyle(el, '::before').animationName);
  expect(name).toBe('uix-busy-sweep-rtl');
});

test('320 px: nothing scrolls sideways, and the result keeps the button inside the row', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByTestId('save').click();
  await page.clock.runFor(1300);
  await expect(page.getByTestId('save').locator('.uix-btn__face')).toHaveAttribute('data-result', 'success');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  const row = await page.getByTestId('row').boundingBox();
  const save = await page.getByTestId('save').boundingBox();
  expect(save.x + save.width).toBeLessThanOrEqual(row.x + row.width + 0.5);
});

// ── Release B: ChangeHighlight, Count, useOptimisticValue (HAR-2583, HAR-2585, HAR-2587) ──────

const animations = (locator) => locator.evaluate((el) => el.getAnimations({ subtree: false }).map((a) => a.animationName));

test('ChangeHighlight: nothing on load; a live update tints the row cells and rings the pill, then clears; announced', async ({ page }) => {
  const row = page.getByTestId('changed-row');
  const pill = page.getByTestId('changed-pill');
  await expect(row).not.toHaveAttribute('data-uix-changed', /.*/);
  expect(await page.locator('[data-uix-changed]').count(), 'something flashed on first render').toBe(0);

  await page.getByTestId('live-update').click();
  await expect(row).toHaveAttribute('data-uix-changed', '');
  await expect(pill).toHaveAttribute('data-uix-changed', '');
  expect(await animations(row.locator('td').first())).toEqual(['uix-changed']);
  expect(await animations(row), 'the row itself must not tint over its cells').toEqual([]);
  expect(await animations(pill)).toEqual(['uix-changed-ring']);
  const tint = await row.locator('td').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(tint, 'no tint at the start of the highlight').not.toBe('rgba(0, 0, 0, 0)');

  await page.clock.runFor(1);
  await expect(page.locator('body > [data-uix-announcer]')).toHaveText('INC-0412 status changed to Waiting for customer by A. Novak');
  // the attribute goes when the animation ends (real time: CSS animations do not follow the page clock)
  await expect(row).not.toHaveAttribute('data-uix-changed', /.*/, { timeout: 5000 });
  await expect(pill).not.toHaveAttribute('data-uix-changed', /.*/, { timeout: 5000 });
});

test('ChangeHighlight under reduced motion: a steady outline on the row as one box, no tint', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('live-update').click();
  const row = page.getByTestId('changed-row');
  expect(await animations(row)).toEqual(['uix-changed-static']);
  expect(await animations(row.locator('td').first())).toEqual([]);
  const outline = await row.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).toBe('solid');
});

test('the in-app reduced-motion choice (data-motion="reduce", OS at no-preference) gets the same outline and fade', async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
  await page.getByTestId('live-update').click();
  expect(await animations(page.getByTestId('changed-row'))).toEqual(['uix-changed-static']);
  expect(await animations(page.getByTestId('changed-pill'))).toEqual(['uix-changed-static-ring']);
  await page.getByTestId('unread-up').click();
  expect(await animations(page.getByTestId('badge').locator('.uix-count'))).toEqual(['uix-count-fade']);
});

test('ChangeHighlight under reduced motion: the ring stays outside the pill', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('live-update').click();
  const pill = page.getByTestId('changed-pill');
  expect(await animations(pill)).toEqual(['uix-changed-static-ring']);
  expect(await pill.evaluate((el) => parseFloat(getComputedStyle(el).outlineOffset))).toBeGreaterThan(0);
});

test('ChangeHighlight in forced colours: the row is outlined, and the highlight ends', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByTestId('live-update').click();
  const row = page.getByTestId('changed-row');
  expect(await animations(row)).toEqual(['uix-changed-static']);
  expect(await animations(row.locator('td').first())).toEqual([]);
  await expect(row).not.toHaveAttribute('data-uix-changed', /.*/, { timeout: 5000 });
});

test('ChangeHighlight on a pinned column keeps the cell opaque while tinted', async ({ page }) => {
  await page.getByTestId('live-update').click();
  const alpha = await page.getByTestId('changed-row').locator('td').first().evaluate((el) => {
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
    const parts = m ? m[1].split(',').map(Number) : [];
    return parts.length === 4 ? parts[3] : 1;
  });
  expect(alpha).toBe(1);
});

test('Count: one tick per change, in its direction; nothing moves beside it', async ({ page }) => {
  // the tick lasts 160 ms: slow CSS animations down so a loaded machine still reads it running
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.05 });
  const badge = page.getByTestId('badge').locator('.uix-count');
  await expect(badge).toHaveText('4');
  await expect(badge).not.toHaveAttribute('data-uix-tick', /.*/);
  const box = await page.getByTestId('badge').boundingBox();
  await page.getByTestId('unread-up').click();
  await expect(badge).toHaveText('5');
  expect(await animations(badge)).toEqual(['uix-count-up']);
  await page.getByTestId('unread-down').click();
  expect(await animations(badge)).toEqual(['uix-count-down']);
  expect((await page.getByTestId('badge').boundingBox()).x).toBe(box.x);
  await expect(badge).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('unread-up').click();
  expect(await animations(badge), 'reduced motion still slides').toEqual(['uix-count-fade']);
});

test('useOptimisticValue: the star shows at once; a failed save brings it back, flashes it and says so', async ({ page }) => {
  const section = page.locator('#optimistic');
  const star = section.getByRole('button', { name: /Major incidents/ });
  await expect(page.getByTestId('star-state')).toHaveText('Not starred');
  await latency(page, 1200, true);
  await star.click();
  await expect(page.getByTestId('star-state')).toHaveText('Starred');
  await expect(star).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('star-wrap')).not.toHaveAttribute('data-uix-changed', /.*/);
  await page.clock.runFor(1250);
  await expect(page.getByTestId('star-state')).toHaveText('Not starred');
  await expect(star).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('star-wrap')).toHaveAttribute('data-uix-changed', '');
  await expect(page.getByTestId('star-message')).toContainText('it is back as it was');
  await page.clock.runFor(1);
  await expect(page.locator('body > [data-uix-announcer]')).toHaveText('Favourite restored');
  await expect(star, 'focus left the star').toBeFocused();
});
