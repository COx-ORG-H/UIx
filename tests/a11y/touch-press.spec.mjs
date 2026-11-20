/* EXPERIMENT (not adopted): a deeper press under a finger. docs → Foundations → Motion → touch-press.
 *
 * Under `(pointer: coarse)` only, a Button presses to .96 (in over --uix-dur-exit-fast, back on the
 * --uix-ease-pop spring over --uix-dur-pop) and a Switch thumb stretches 1.18× into its track while
 * held. A fine pointer and reduced motion (the OS setting or data-motion="reduce") keep today's .97
 * and a still thumb. :active is held through DevTools' forced pseudo-state: headless Chromium does
 * not set :active from synthetic touches. Fixture: tests/touch-press/fixture.html (static CSS).
 */
import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/touch-press/fixture.html';
const TOUCH = { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } };

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'theme-independent'));

/** A page in a context of its own, with a helper that holds or lets go of :active on a selector. */
async function open(browser, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  await page.goto(FIXTURE, { waitUntil: 'networkidle' });
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const press = async (selector, held = true) => {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: held ? ['active'] : [] });
  };
  return { context, page, press };
}

/** Run every transition to its end, then read the settled transforms. */
const settled = (page) => page.evaluate(() => {
  for (const a of document.getAnimations()) a.finish();
  const thumb = (id) => getComputedStyle(document.querySelector(`#${id} .uix-switch__track`), '::after').transform;
  return {
    button: getComputedStyle(document.getElementById('btn')).transform,
    disabledButton: getComputedStyle(document.getElementById('btn-disabled')).transform,
    off: thumb('sw-off'),
    on: thumb('sw-on'),
    disabledSwitch: thumb('sw-disabled'),
  };
});

const holdAll = async (press) => {
  for (const selector of ['#btn', '#btn-disabled', '#sw-off', '#sw-on', '#sw-disabled']) await press(selector);
};

const TODAY = {
  button: 'matrix(0.97, 0, 0, 0.97, 0, 0)',
  disabledButton: 'none',
  off: 'none',
  on: 'matrix(1, 0, 0, 1, 16, 0)',
  disabledSwitch: 'none',
};

test('under a finger the press is deeper and the switch thumb stretches into its track', async ({ browser }) => {
  const { context, page, press } = await open(browser, TOUCH);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  await holdAll(press);
  expect(await settled(page)).toEqual({
    button: 'matrix(0.96, 0, 0, 0.96, 0, 0)',
    disabledButton: 'none',
    off: 'matrix(1.18, 0, 0, 1, 1.44, 0)', // the outer (left) edge stays at 2 px
    on: 'matrix(1.18, 0, 0, 1, 14.56, 0)', // the outer (right) edge stays at 34 px
    disabledSwitch: 'none',
  });
  await context.close();
});

test('the press goes in fast and comes back on the pop spring', async ({ browser }) => {
  const { context, page, press } = await open(browser, TOUCH);
  const tokenMs = (name) => page.evaluate((n) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const match = /^(\d*\.?\d+)(ms|s)$/.exec(value);
    if (!match) throw new Error(`${n} is not a time: "${value}"`);
    return Number(match[1]) * (match[2] === 's' ? 1000 : 1);
  }, name);
  const timing = () => page.evaluate(() => document.getElementById('btn').getAnimations()
    .filter((a) => a.transitionProperty === 'transform')
    .map((a) => ({ duration: a.effect.getTiming().duration, easing: a.effect.getTiming().easing })));

  await press('#btn');
  const pressIn = await timing();
  expect(pressIn).toHaveLength(1);
  expect(pressIn[0].duration).toBe(await tokenMs('--uix-dur-exit-fast'));

  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await press('#btn', false);
  const release = await timing();
  expect(release).toHaveLength(1);
  expect(release[0].duration).toBe(await tokenMs('--uix-dur-pop'));
  expect(release[0].easing).toMatch(/^linear\(/); // --uix-ease-pop
  await context.close();
});

test('a mouse or trackpad keeps today\'s press', async ({ browser }) => {
  const { context, page, press } = await open(browser);
  expect(await page.evaluate(() => matchMedia('(pointer: fine)').matches)).toBe(true);
  await holdAll(press);
  expect(await settled(page)).toEqual(TODAY);
  await context.close();
});

for (const reduce of ['os', 'attribute']) {
  test(`reduced motion (${reduce}) turns the experiment off under a finger`, async ({ browser }) => {
    const { context, page, press } = await open(browser, { ...TOUCH, reducedMotion: reduce === 'os' ? 'reduce' : 'no-preference' });
    if (reduce === 'attribute') await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
    await holdAll(press);
    expect(await settled(page)).toEqual(TODAY);
    await context.close();
  });
}
