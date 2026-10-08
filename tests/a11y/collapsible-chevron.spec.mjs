/* CollapsibleSection chevron (HAR-1571; operator review HAR-1550, point 8).
 *
 * The chevron used to be the text character U+2304, drawn by an OS fallback font (the Inter
 * subset does not cover it): narrow, different on every OS, and its ink sat 6.7 px below the
 * title centre closed and 6.3 px above it open, so it jumped ~13 px on every toggle. It is now
 * the UIx ChevronDown svg in a fixed 16 x 16 box. jsdom has no layout, so the geometry is
 * measured here in Chromium on the docs specimen:
 *   1. the chevron is an svg on the `m6 9 6 6 6-6` path, with no text node, 16 x 16;
 *   2. its centre is within 0.5 px of the title centre, open and closed;
 *   3. toggling only rotates it: the centre does not move, at rest or mid-transition;
 *   4. reduced motion collapses the transition to <= 0.001 ms;
 *   5. hovering the summary darkens the chevron from muted to the text colour;
 *   6. at 320 px (WCAG 1.4.10) it keeps its 16 x 16 box and stays inside the viewport.
 */
import { test, expect } from '@playwright/test';

const ROUTE = 'docs/explorer.html#collapsible-section';
const SECTION = '[data-component-preview="collapsible-section"] .uix-collapsible';

const open = async (page, testInfo) => {
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(ROUTE, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(SECTION)).toBeVisible();
};

/* Geometry of the chevron wrapper, its svg and the title, after the chevron's transition ended. */
const measure = (page) => page.evaluate(async (selector) => {
  const section = document.querySelector(selector);
  const chevron = section.querySelector('.uix-collapsible__chevron');
  await Promise.all(chevron.getAnimations().map((a) => a.finished.catch(() => {})));
  const centre = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
  const title = section.querySelector('.uix-collapsible__title');
  const line = document.createRange();
  line.selectNodeContents(title);
  const lineRect = line.getClientRects()[0];
  const svg = chevron.querySelector('svg');
  return {
    open: section.open,
    box: centre(chevron),
    svg: centre(svg),
    title: centre(title),
    titleInk: { y: lineRect.y + lineRect.height / 2 },
    transform: getComputedStyle(chevron).transform,
  };
}, SECTION);

const setOpen = async (page, value) => {
  await page.evaluate(([selector, v]) => { document.querySelector(selector).open = v; }, [SECTION, value]);
  // `toggle` is async and the rotation is a transition: wait until it is over
  await page.evaluate(async (selector) => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const chevron = document.querySelector(selector).querySelector('.uix-collapsible__chevron');
    await Promise.all(chevron.getAnimations().map((a) => a.finished.catch(() => {})));
  }, SECTION);
};

test('the chevron is the UIx ChevronDown svg with no text node, 16 x 16', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const chevron = page.locator(`${SECTION} .uix-collapsible__chevron`);
  await expect(chevron).toHaveAttribute('aria-hidden', 'true');
  await expect(chevron.locator('svg path')).toHaveAttribute('d', 'm6 9 6 6 6-6');
  expect(await chevron.evaluate((el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).length)).toBe(0);
  expect((await chevron.textContent()).trim()).toBe('');
  const m = await measure(page);
  expect({ w: m.box.w, h: m.box.h }).toEqual({ w: 16, h: 16 });
  expect({ w: m.svg.w, h: m.svg.h }).toEqual({ w: 16, h: 16 });
});

test('the chevron centre is within 0.5 px of the title centre, open and closed', async ({ page }, testInfo) => {
  await open(page, testInfo);
  for (const value of [true, false]) {
    await setOpen(page, value);
    const m = await measure(page);
    expect(m.open).toBe(value);
    expect(Math.abs(m.box.y - m.title.y), `box vs title (open=${value})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.svg.y - m.title.y), `svg vs title (open=${value})`).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.box.y - m.titleInk.y), `box vs title line (open=${value})`).toBeLessThanOrEqual(0.5);
  }
});

test('toggling only rotates the chevron; its centre never moves, even mid-transition', async ({ page }, testInfo) => {
  await open(page, testInfo);
  await setOpen(page, false);
  const closed = await measure(page);
  expect(closed.transform).toBe('none');

  // sample the svg's bounding box on every frame of the closed -> open rotation
  const samples = await page.evaluate(async (selector) => {
    const section = document.querySelector(selector);
    const svg = section.querySelector('.uix-collapsible__chevron svg');
    const out = [];
    const read = () => { const r = svg.getBoundingClientRect(); out.push({ x: r.x + r.width / 2, y: r.y + r.height / 2 }); };
    section.open = true;
    await new Promise((resolve) => {
      const started = performance.now();
      const tick = () => { read(); if (performance.now() - started > 400) resolve(); else requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    return out;
  }, SECTION);
  const opened = await measure(page);
  expect(opened.transform).toMatch(/^matrix\(-1, /); // rotate(180deg)
  expect(samples.length).toBeGreaterThan(3);
  for (const s of [...samples, { x: opened.svg.x, y: opened.svg.y }]) {
    expect(Math.abs(s.x - closed.svg.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(s.y - closed.svg.y)).toBeLessThanOrEqual(0.5);
  }
  expect(Math.abs(opened.box.x - closed.box.x)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(opened.box.y - closed.box.y)).toBeLessThanOrEqual(0.01);
});

test('under reduced motion the chevron transition is <= 0.001 ms', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, testInfo);
  const ms = await page.locator(`${SECTION} .uix-collapsible__chevron`).evaluate((el) => {
    const parse = (s) => (s.endsWith('ms') ? parseFloat(s) : parseFloat(s) * 1000);
    return getComputedStyle(el).transitionDuration.split(',').map((d) => parse(d.trim()));
  });
  expect(ms.length).toBeGreaterThan(0);
  for (const d of ms) expect(d).toBeLessThanOrEqual(0.001);
});

test('hovering the summary turns the chevron from muted to the text colour', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const chevron = page.locator(`${SECTION} .uix-collapsible__chevron`);
  const colourOf = () => chevron.evaluate(async (el) => {
    await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {})));
    return getComputedStyle(el).color;
  });
  await page.mouse.move(1, 1);
  const rest = await colourOf();
  const expected = await page.evaluate((selector) => {
    const probe = (token) => {
      const p = document.createElement('span');
      p.style.color = `var(${token})`;
      document.querySelector(selector).append(p);
      const c = getComputedStyle(p).color;
      p.remove();
      return c;
    };
    return { muted: probe('--uix-text-muted'), text: probe('--uix-text') };
  }, SECTION);
  expect(rest).toBe(expected.muted);
  await page.locator(`${SECTION} .uix-collapsible__summary`).hover();
  expect(await colourOf()).toBe(expected.text);
});

test('at 320 px the chevron keeps its 16 x 16 box inside the viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await open(page, testInfo);
  await page.evaluate((selector) => {
    // the longest realistic title, so the summary has to wrap
    document.querySelector(selector).querySelector('.uix-collapsible__title').textContent = 'Advanced notification and escalation settings for the service desk';
  }, SECTION);
  for (const value of [true, false]) {
    await setOpen(page, value);
    const m = await measure(page);
    expect({ w: m.box.w, h: m.box.h }).toEqual({ w: 16, h: 16 });
    expect(m.box.x + m.box.w / 2).toBeLessThanOrEqual(320);
    expect(m.box.x - m.box.w / 2).toBeGreaterThanOrEqual(0);
  }
  // the section itself does not overflow: the chevron stays inside its own right edge
  const fits = await page.evaluate((selector) => {
    const section = document.querySelector(selector);
    const box = section.getBoundingClientRect();
    const chevron = section.querySelector('.uix-collapsible__chevron').getBoundingClientRect();
    return { scroll: section.scrollWidth <= section.clientWidth, inside: chevron.right <= box.right && chevron.left >= box.left };
  }, SECTION);
  expect(fits).toEqual({ scroll: true, inside: true });
});
