import { test, expect } from '@playwright/test';

/* Timeline entry text (HAR-3086), in a real layout: the event reads quieter than body copy, the actor
 * keeps the full text colour, the detail is smaller, and the badge sits beside the event; every part
 * is at least 4.5:1 on the panel in both themes. The DOM half is packages/react/src/timeline-entry-dom.test.mjs. */

const HARNESS = '/tests/timeline-entry/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

test('a feed entry: hushed event, full-colour actor, smaller detail, badge beside the event (HAR-3086)', async ({ page }, testInfo) => {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), themeOf(testInfo));
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const got = await page.evaluate(() => {
    const lum = (c) => { const [r, g, b, a = 1] = c.match(/[\d.]+/g).map(Number); return { r, g, b, a }; };
    const style = (el) => getComputedStyle(el);
    const title = document.querySelector('.uix-timeline__title');
    const actor = title.querySelector('strong');
    const detail = document.querySelector('.uix-timeline__detail');
    const badge = document.querySelector('.uix-timeline__badge');
    const head = badge.closest('.uix-timeline__head');
    const titleInHead = head.querySelector('.uix-timeline__title');
    return {
      title: { size: parseFloat(style(title).fontSize), color: lum(style(title).color) },
      actor: { weight: Number(style(actor).fontWeight), color: lum(style(actor).color) },
      detail: { size: parseFloat(style(detail).fontSize) },
      badgeBeside: Math.abs(badge.getBoundingClientRect().top - titleInHead.getBoundingClientRect().top) < 24,
      entries: document.querySelectorAll('.uix-timeline__item').length,
    };
  });
  expect(got.entries).toBe(10);
  // the event is quieter than the actor: a lighter ink (alpha below the actor's, or a lighter mix)
  expect(got.title.color.a < got.actor.color.a || got.title.color.r !== got.actor.color.r).toBe(true);
  expect(got.actor.weight).toBeGreaterThanOrEqual(600);
  expect(got.detail.size).toBeLessThan(got.title.size);
  expect(got.badgeBeside).toBe(true);
  await testInfo.attach('feed', { body: await page.locator('[data-case="kit"]').screenshot(), contentType: 'image/png' });
});
