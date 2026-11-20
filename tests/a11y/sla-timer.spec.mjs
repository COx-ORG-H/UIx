/* SlaTimer (Docs/specs/2026-11-20-sla-timer.md) in Chromium on tests/sla-timer/harness.html, in both themes:
 *   - axe is clean on the queue, the record header, the formats and the German column at 1280, 390 and 320 px,
 *     with no sideways page scroll and no clipped header text;
 *   - the queue's SLA column sorts by slaSortValue: the breach first, then the least time left, met and no SLA last;
 *   - each cell's spoken text says the time left and the state; its mark is aria-hidden; nothing is a live region;
 *   - the marks clear 3:1 against their row, and their shapes differ (ring, dot, diamond, bars);
 *   - nothing animates, transitions or loops; forced colours keep every mark;
 *   - on the page's clock (page.clock) a timer changes on the minute, crosses a threshold, and the one timer with
 *     `announce` says so once through the polite region.
 * The model, the shared clock, the hidden tab and hydration are pinned in packages/react/src/sla-timer-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/sla-timer/harness.html';
const GATED = new Set(['serious', 'critical']);
const NOW = Date.parse('2026-11-20T12:00:00Z');
const MIN = 60_000;
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const plain = (text) => (text ?? '').replace(/[  ]/g, ' ');

async function open(page, theme) {
  await page.goto(`${HARNESS}?theme=${theme}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#queue .uix-sla').first()).toBeVisible();
}

const spokenOf = (locator) => locator.locator(':scope > .uix-visually-hidden').textContent().then(plain);

for (const width of [1280, 390, 320]) {
  test(`at ${width}px: axe clean, no sideways scroll, header text wraps instead of clipping`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, themeOf(testInfo));
    const { violations } = await new AxeBuilder({ page }).include('#queue').include('#header').include('#formats').include('#de').analyze();
    expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const clipped = await page.locator('.uix-sla--header .uix-sla__label, .uix-sla--header .uix-sla__meta').evaluateAll((els) =>
      els.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent));
    expect(clipped).toEqual([]);
  });
}

test('the queue sorts by slaSortValue and every cell says its time and state', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const rows = page.locator('#queue tbody tr');
  const ids = await rows.evaluateAll((trs) => trs.map((tr) => tr.querySelector('th, td')?.textContent?.trim()));
  expect(ids).toEqual(['INC-0412', 'INC-0419', 'INC-0420', 'INC-0423', 'INC-0426', 'INC-0425', 'INC-0401', 'REQ-0390']);
  const states = await page.locator('#queue tbody .uix-sla').evaluateAll((els) => els.map((el) => el.dataset.state));
  expect(states).toEqual(['breached', 'urgent', 'warning', 'notice', 'paused', 'on-track', 'met', 'none']);
  const first = page.locator('#queue tbody .uix-sla').first();
  expect(await spokenOf(first)).toBe('Breached 35 minutes ago. Deadline 20 Nov 2026, 12:25');
  expect(plain(await page.locator('#queue tbody .uix-sla').nth(1).locator('.uix-sla__time').textContent())).toBe('12 min');
  expect(await spokenOf(page.locator('#queue tbody .uix-sla').nth(1))).toBe('Due in 12 minutes, urgent. Deadline 20 Nov 2026, 13:12');
  expect(await spokenOf(page.locator('#queue tbody .uix-sla').nth(4))).toBe('Paused, 8 hours left. Waiting for the requester');
  // the cell's text is what a screen reader reads in the cell: no live region, the visible copy hidden
  expect(await page.locator('#queue [aria-live], #queue .uix-sla[role]').count()).toBe(0);
  expect(await page.locator('#queue .uix-sla__mark:not([aria-hidden="true"]), #queue .uix-sla__time:not([aria-hidden="true"])').count()).toBe(0);
  // the header cell sorts: aria-sort says so
  await expect(page.locator('#queue th[aria-sort]').filter({ hasText: 'Resolution SLA' })).toHaveAttribute('aria-sort', 'ascending');
});

test('marks: a shape per level, 3:1 against their row; the breach is the only red and never a fill', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const marks = await page.locator('#queue tbody .uix-sla').evaluateAll((els) => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return els.map((el) => {
      const mark = el.querySelector('.uix-sla__mark');
      const s = getComputedStyle(mark);
      const paint = s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? s.backgroundColor : s.borderLeftColor;
      return {
        state: el.dataset.state, radius: s.borderRadius, transform: s.transform, bg: s.backgroundColor,
        borderInline: s.borderLeftWidth, ratio: ratio(paint, bgOf(el)), rootBg: getComputedStyle(el).backgroundColor,
      };
    });
  });
  const by = Object.fromEntries(marks.map((m) => [m.state, m]));
  for (const state of ['notice', 'warning', 'urgent', 'breached', 'paused']) expect(by[state].ratio, state).toBeGreaterThanOrEqual(3);
  expect(by.notice.bg).toBe('rgba(0, 0, 0, 0)'); // a ring
  expect(by.warning.radius).toBe('50%');
  expect(by.urgent.transform).not.toBe('none'); // a diamond
  expect(by.paused.borderInline).toBe('2px'); // two bars
  expect(by['on-track'].bg).toBe('rgba(0, 0, 0, 0)');
  // no state paints its box: dot plus words, never a solid status fill
  for (const m of marks) expect(m.rootBg, m.state).toBe('rgba(0, 0, 0, 0)');
});

test('nothing animates, transitions or loops', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const moving = await page.locator('.uix-sla, .uix-sla *').evaluateAll((els) => els.filter((el) => {
    const s = getComputedStyle(el);
    return el.getAnimations().length > 0 || s.animationName !== 'none' || s.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
  }).map((el) => el.className));
  expect(moving).toEqual([]);
});

test('forced colours keep every mark (CanvasText), and the words stay', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await open(page, themeOf(testInfo));
  const marks = await page.locator('#queue tbody .uix-sla').evaluateAll((els) => els.map((el) => {
    const s = getComputedStyle(el.querySelector('.uix-sla__mark'));
    return { state: el.dataset.state, bg: s.backgroundColor, border: s.borderLeftColor, borderWidth: s.borderLeftWidth };
  }));
  for (const m of marks.filter((x) => ['warning', 'urgent', 'breached'].includes(x.state))) expect(m.bg, m.state).not.toBe('rgba(0, 0, 0, 0)');
  for (const m of marks.filter((x) => ['notice', 'paused'].includes(x.state))) expect(parseFloat(m.borderWidth), m.state).toBeGreaterThan(0);
  await expect(page.locator('#queue tbody .uix-sla').first()).toContainText('35 min over');
});

test('on the page clock: the minute changes, a threshold is crossed and announced once', async ({ page }, testInfo) => {
  await page.clock.install({ time: NOW });
  await open(page, themeOf(testInfo));
  const quiet = page.getByTestId('live-quiet');
  const loud = page.getByTestId('live-announce');
  await expect(quiet.locator('.uix-sla__time')).toHaveText('2 hr');
  await expect(quiet).toHaveAttribute('data-state', 'on-track');
  await expect(loud).toHaveAttribute('data-state', 'warning');
  const announcer = page.locator('body > [data-uix-announcer]');
  expect(await announcer.count() ? plain(await announcer.textContent()) : '').toBe('');

  await page.clock.runFor(30_000);
  await expect(quiet).toHaveAttribute('data-state', 'warning');
  await page.clock.runFor(MIN);
  await expect(quiet.locator('.uix-sla__time')).toHaveText('1 hr 59 min');

  // the announcing timer crosses 30 min left
  await page.clock.runFor(MIN);
  await expect(loud).toHaveAttribute('data-state', 'urgent');
  await expect(announcer).toHaveAttribute('role', 'status');
  await expect.poll(async () => plain(await announcer.textContent())).toMatch(/^Resolution: Due in (29|30) minutes, urgent\./);
  await announcer.evaluate((el) => { el.textContent = ''; });
  await page.clock.runFor(2 * MIN);
  await expect(loud.locator('.uix-sla__time')).toHaveText(/^Due in 2[67] min$/);
  expect(plain(await announcer.textContent())).toBe('');
});
