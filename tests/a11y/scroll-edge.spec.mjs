/* Scroll edges (styles/scroll-edge.css) in a real browser, in Chromium, Firefox and WebKit.
 *
 *   - Where scroll timelines run (Chromium, WebKit; Firefox from 159), a soft edge fades only while
 *     content is under it: the top after the first pixels of scroll, the bottom until the last. A
 *     list that fits has no fade. A pinned header's firmer divider appears over the first pixels.
 *   - Where they do not (Playwright's Firefox 151 today), nothing is masked and nothing animates:
 *     the static fallback is a plain edge. The same Firefox with its scroll-timeline pref on runs
 *     the timeline path too.
 *   - Reduced motion (the OS setting and <html data-motion="reduce">) is static in every engine: no
 *     animation on the scroller or the divider, no fade, the same values at every scroll position.
 *     The global policy only shortens durations, which does not stop a scroll-linked animation, so
 *     this is the explicit rule's proof.
 *   - More contrast and forced colours drop the soft fade; a focused scroller drops it too.
 * Fixture: tests/scroll-edge/fixture.html (plain kit markup, built CSS). */
import { test, expect } from '@playwright/test';

/* the dark project is dark; every other project (light, chromium, firefox, webkit) is light */
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const SCROLLERS = ['list', 'drawer-body', 'menu', 'headed', 'table'];

const open = async (page, testInfo, { motion } = {}) => {
  await page.goto(`/tests/scroll-edge/fixture.html${themeOf(testInfo) === 'dark' ? '?theme=dark' : ''}`, { waitUntil: 'networkidle' });
  if (motion) await page.evaluate((m) => document.documentElement.setAttribute('data-motion', m), motion);
  await expect(page.locator('#rows tr')).toHaveCount(40);
};

const timelines = (page) => page.evaluate(() => CSS.supports('animation-timeline: scroll()'));

/** Scroll every scroller to `to` (a number, or 'end'), then read each one's edges and divider. */
const readAt = (page, to) => page.evaluate(async (to) => {
  for (const id of ['list', 'drawer-body', 'menu', 'headed', 'table']) {
    const el = document.getElementById(id);
    el.scrollTop = to === 'end' ? el.scrollHeight : to;
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return Object.fromEntries(['list', 'short', 'drawer-body', 'menu', 'headed', 'table'].map((id) => {
    const el = document.getElementById(id);
    const cs = getComputedStyle(el);
    const divider = id === 'table' ? getComputedStyle(el, '::before') : id === 'headed' ? getComputedStyle(document.getElementById('head'), '::after') : null;
    return [id, {
      start: cs.getPropertyValue('--uix-edge-start').trim(),
      end: cs.getPropertyValue('--uix-edge-end').trim(),
      masked: cs.maskImage !== 'none',
      animations: el.getAnimations({ subtree: true }).filter((a) => /^uix-edge/.test(a.animationName ?? '')).length,
      divider: divider ? { content: divider.content, opacity: Number(divider.opacity) } : null,
    }];
  }));
}, to);

test.describe('scroll edges without a motion preference', () => {
  test('a soft edge fades only where content is under it, and a list that fits has none', async ({ page }, testInfo) => {
    await open(page, testInfo);
    test.skip(!(await timelines(page)), 'no scroll timelines here: the static fallback test covers this engine');
    const rest = await readAt(page, 0);
    for (const id of ['list', 'drawer-body', 'menu']) {
      expect(rest[id], `${id} at rest`).toMatchObject({ start: '0px', end: '16px', masked: true });
    }
    expect(rest.short, 'a list that fits').toMatchObject({ start: '0px', end: '0px' });
    const mid = await readAt(page, 60);
    for (const id of ['list', 'drawer-body', 'menu']) expect(mid[id], `${id} mid-scroll`).toMatchObject({ start: '16px', end: '16px' });
    const end = await readAt(page, 'end');
    for (const id of ['list', 'drawer-body', 'menu']) expect(end[id], `${id} at the end`).toMatchObject({ start: '16px', end: '0px' });
  });

  test('a pinned header keeps a hard top edge and its divider appears over the first pixels', async ({ page }, testInfo) => {
    await open(page, testInfo);
    test.skip(!(await timelines(page)), 'no scroll timelines here: the static fallback test covers this engine');
    const rest = await readAt(page, 0);
    for (const id of ['headed', 'table']) {
      expect(rest[id].divider, `${id} divider at rest`).toEqual({ content: '""', opacity: 0 });
      expect(rest[id].start, `${id} has no top fade`).toBe('0px');
    }
    const mid = await readAt(page, 60);
    for (const id of ['headed', 'table']) {
      expect(mid[id].divider.opacity, `${id} divider after 60 px`).toBe(1);
      expect(mid[id].start, `${id} still has no top fade`).toBe('0px');
    }
  });

  test('the table edge takes no room, and only a header row pinned at the top gets one', async ({ page }, testInfo) => {
    await open(page, testInfo);
    // a wrap that fits is exactly as tall as its table: the divider's box gives back its own height
    const fit = await page.locator('#table-short').evaluate((w) => [w.scrollHeight, w.querySelector('table').offsetHeight]);
    expect(fit[0]).toBe(fit[1]);
    test.skip(!(await timelines(page)), 'no divider without scroll timelines');
    const read = (id) => page.locator(id).evaluate((w) => { w.scrollTop = 60; return { content: getComputedStyle(w, '::before').content, padTop: getComputedStyle(w).scrollPaddingTop }; });
    expect(await read('#table-headless'), 'no <thead>: no divider, nothing to clear').toEqual({ content: 'none', padTop: '0px' });
    expect((await read('#table-caption')).content, 'a caption above the header: no divider').toBe('none');
    expect(await read('#table-cards'), 'card mode: no divider, nothing to clear').toEqual({ content: 'none', padTop: '0px' });
    expect(await read('#table-caption-bottom'), 'a caption below the rows keeps the edge').toEqual({ content: '""', padTop: '44px' });
    expect((await read('#table')).padTop, 'a pinned header: rows stop below it').toBe('44px');
  });

  test('without scroll timelines every edge is the static one', async ({ page }, testInfo) => {
    await open(page, testInfo);
    test.skip(await timelines(page), 'this engine runs scroll timelines');
    for (const to of [0, 60, 'end']) {
      const now = await readAt(page, to);
      for (const id of SCROLLERS) {
        expect(now[id], `${id} at ${to}`).toMatchObject({ masked: false, animations: 0 });
        if (now[id].divider) expect(now[id].divider.content, `${id} divider at ${to}`).toBe('none');
      }
    }
  });

  test('more contrast keeps the hard edges and drops the soft fade', async ({ page }, testInfo) => {
    await open(page, testInfo);
    await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'more'));
    const mid = await readAt(page, 60);
    for (const id of SCROLLERS) expect(mid[id].masked, `${id} under more contrast`).toBe(false);
    if (await timelines(page)) expect(mid.table.divider.opacity).toBe(1);
  });

  test('forced colours drop the soft fade', async ({ page }, testInfo) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await open(page, testInfo);
    const mid = await readAt(page, 60);
    for (const id of SCROLLERS) expect(mid[id].masked, `${id} in forced colours`).toBe(false);
  });

  test('a scroller with keyboard focus is read without a fade', async ({ page }, testInfo) => {
    await open(page, testInfo);
    test.skip(!(await timelines(page)), 'nothing is masked here');
    await page.locator('#list').evaluate((el) => { el.scrollTop = 60; });
    await page.keyboard.press('Tab');
    await expect(page.locator('#list')).toBeFocused();
    expect(await page.locator('#list').evaluate((el) => getComputedStyle(el).maskImage)).toBe('none');
  });
});

/* Firefox ships scroll timelines from 159; Playwright's Firefox (151) has them behind a pref. The
   tests above run it as an engine without them (the static fallback); this runs its timeline path,
   so CI checks the edges in all three engines, not only by hand. The pref is ignored elsewhere. */
test.describe('Firefox with scroll timelines on', () => {
  test.use({ launchOptions: { firefoxUserPrefs: { 'layout.css.scroll-driven-animations.enabled': true } } });

  test('the soft edges and the header divider run as in Chromium and WebKit', async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'firefox', 'Chromium and WebKit run the timelines in the tests above');
    await open(page, testInfo);
    expect(await timelines(page), 'the pref turned scroll timelines on').toBe(true);
    const rest = await readAt(page, 0);
    expect(rest.list).toMatchObject({ start: '0px', end: '16px', masked: true });
    expect(rest.short).toMatchObject({ start: '0px', end: '0px' });
    expect(rest.table.divider.opacity).toBe(0);
    const mid = await readAt(page, 60);
    expect(mid.list).toMatchObject({ start: '16px', end: '16px' });
    expect(mid.table.divider.opacity).toBe(1);
    const end = await readAt(page, 'end');
    expect(end.list).toMatchObject({ start: '16px', end: '0px' });
  });
});

for (const [name, how] of [['prefers-reduced-motion: reduce', 'media'], ['<html data-motion="reduce">', 'attribute']]) {
  test(`under ${name} every scroll edge is static`, async ({ page }, testInfo) => {
    if (how === 'media') await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, testInfo, how === 'attribute' ? { motion: 'reduce' } : {});
    const seen = [];
    for (const to of [0, 6, 60, 'end']) seen.push(await readAt(page, to));
    for (const now of seen) {
      for (const id of [...SCROLLERS, 'short']) {
        expect(now[id], `${id}`).toMatchObject({ start: '0px', end: '0px', masked: false, animations: 0 });
        if (now[id].divider) expect(now[id].divider.content, `${id} divider`).toBe('none');
      }
    }
    // the same at every scroll position: nothing is linked to scroll
    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    expect(seen[3]).toEqual(seen[0]);
  });
}
