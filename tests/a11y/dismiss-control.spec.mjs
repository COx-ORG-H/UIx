/* The tag and chip remove "x" in a real browser (HAR-1569): one spec for `.uix-tag__remove` and
 * `<Chip onRemove>` (`.uix-chip__remove`). jsdom has no layout, so every number in the issue's
 * acceptance criteria is measured here, in both themes, at 1280 and 320 px:
 *   - an icon, no text node; the glyph's ink centre on the button centre (±0.5 px)
 *   - a 20 px circle as the hover shape, a concentric hit area of at least 24 px
 *   - the button centred on the pill (±0.5 px), 2 px from its trailing edge, pill height unchanged
 *   - a round focus ring; hover ≥ 1.4:1 against the pill; visible in forced colours.
 * The tag is measured on the docs specimen (explorer.html#tag-input) and in the harness; the chip
 * in the harness (tests/dismiss-control/harness.tsx, bundled in globalSetup).
 * The rule-set parity of the two classes is pinned in packages/tokens/tests/dismiss-control.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/dismiss-control/harness.html';
const DOCS = 'docs/explorer.html#tag-input';
const REMOVE = '.uix-tag__remove, .uix-chip__remove';
const GATED = new Set(['serious', 'critical']);
// The measured hit area: 24 px nominal, less the 0.25 px scan step. Hit-testing uses the box snapped to
// whole pixels, so a button at a fractional position (the tag sits at y = n.3125) reads up to 0.5 px
// off-centre plus the scan step; the drawn circle and glyph are held to 0.5 px separately.
const HIT_MIN = 23.75;
const HIT_CENTRE = 0.75;

/** Runs in the page: every number the acceptance criteria name, for one remove button. */
function geometry(btn) {
  const pill = btn.closest('.uix-tag, .uix-chip');
  const r = btn.getBoundingClientRect();
  const p = pill.getBoundingClientRect();
  const ps = getComputedStyle(pill);
  const bs = getComputedStyle(btn);
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  // the glyph's ink box, from the SVG geometry in screen space
  const svg = btn.querySelector('svg');
  const ctm = svg.getScreenCTM();
  let ink = null;
  for (const shape of svg.querySelectorAll('path, line, polyline, circle, rect')) {
    const b = shape.getBBox();
    for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y + b.height]]) {
      const pt = new DOMPoint(x, y).matrixTransform(ctm);
      ink = ink
        ? { l: Math.min(ink.l, pt.x), t: Math.min(ink.t, pt.y), r: Math.max(ink.r, pt.x), b: Math.max(ink.b, pt.y) }
        : { l: pt.x, t: pt.y, r: pt.x, b: pt.y };
    }
  }
  // the pill's own text line (tag: its first text node; chip: the label)
  const label = pill.querySelector('.uix-chip__label');
  const range = document.createRange();
  if (label) range.selectNodeContents(label);
  else range.selectNodeContents(pill.firstChild);
  const text = range.getBoundingClientRect();
  // hit area: scan out from the centre along each axis and diagonal (0.25 px steps) to where the
  // button stops being the hit target. Chromium snaps the ::before box to whole pixels, so a
  // 24 px circle measures 23.5–24.5 depending on where the button lands on the pixel grid.
  const hits = (dx, dy) => document.elementFromPoint(cx + dx, cy + dy)?.closest('.uix-tag__remove, .uix-chip__remove') === btn;
  const reach = (ux, uy) => { let t = 0; while (t < 20 && hits(ux * (t + 0.25), uy * (t + 0.25))) t += 0.25; return t; };
  const s = Math.SQRT1_2;
  const reaches = { right: reach(1, 0), left: reach(-1, 0), down: reach(0, 1), up: reach(0, -1), diag: Math.min(reach(s, s), reach(-s, s), reach(s, -s), reach(-s, -s)) };
  const hitW = reaches.left + reaches.right;
  const hitH = reaches.up + reaches.down;
  // pill height with and without the button: the button must not grow it
  const height = p.height;
  btn.style.display = 'none';
  const bare = pill.getBoundingClientRect().height;
  btn.style.display = '';
  return {
    textNodes: [...btn.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()).length,
    svgs: btn.querySelectorAll('svg').length,
    size: [r.width, r.height],
    radius: parseFloat(bs.borderTopLeftRadius),
    glyphDx: (ink.l + ink.r) / 2 - cx,
    glyphDy: (ink.t + ink.b) / 2 - cy,
    inkSize: [ink.r - ink.l, ink.b - ink.t],
    pillDy: cy - (p.top + p.height / 2),
    textDy: (ink.t + ink.b) / 2 - (text.top + text.height / 2),
    trailingGap: p.right - parseFloat(ps.borderRightWidth) - r.right,
    height,
    bare,
    hit: [hitW, hitH],
    hitOffset: [(reaches.right - reaches.left) / 2, (reaches.down - reaches.up) / 2],
    hitDiagonal: reaches.diag,
  };
}

/** Runs in the page: the hover fill composited on the pill, and its contrast with the pill. */
function hoverContrast(btn) {
  const parse = (c) => {
    let m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const [r, g, b, a = '1'] = m[1].split(/[\s,/]+/).filter(Boolean);
      return [+r / 255, +g / 255, +b / 255, +a];
    }
    m = c.match(/^color\(srgb ([^)]+)\)$/);
    if (m) {
      const [r, g, b, a = '1'] = m[1].split(/[\s/]+/).filter(Boolean);
      return [+r, +g, +b, +a];
    }
    throw new Error(`unparsed colour ${c}`);
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const effective = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] >= 1) break;
    }
    return layers.reverse().reduce((under, top) => over(top, under), [1, 1, 1, 1]);
  };
  const lum = ([r, g, b]) => [r, g, b]
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const pill = effective(btn.closest('.uix-tag, .uix-chip'));
  const hover = over(parse(getComputedStyle(btn).backgroundColor), pill);
  const icon = parse(getComputedStyle(btn).color);
  return { hover: ratio(hover, pill), icon: ratio(icon, pill), fill: getComputedStyle(btn).backgroundColor };
}

const expectGeometry = (g, name) => {
  expect(g.textNodes, `${name}: no text glyph`).toBe(0);
  expect(g.svgs, `${name}: one svg icon`).toBe(1);
  expect(g.size, `${name}: a 20 px box`).toEqual([20, 20]);
  expect(g.radius, `${name}: a circle`).toBeGreaterThanOrEqual(10);
  expect(Math.abs(g.glyphDx), `${name}: glyph centred (x)`).toBeLessThanOrEqual(0.5);
  expect(Math.abs(g.glyphDy), `${name}: glyph centred (y)`).toBeLessThanOrEqual(0.5);
  expect(Math.abs(g.pillDy), `${name}: centred on the pill`).toBeLessThanOrEqual(0.5);
  expect(Math.abs(g.textDy), `${name}: centred on the text line`).toBeLessThanOrEqual(1);
  expect(Math.abs(g.trailingGap - 2), `${name}: 2 px trailing gap`).toBeLessThanOrEqual(0.5);
  expect(g.height, `${name}: the button does not grow the pill`).toBeCloseTo(g.bare, 1);
  for (const side of g.hit) {
    expect(side, `${name}: a 24 px hit area`).toBeGreaterThanOrEqual(HIT_MIN);
    expect(side, `${name}: the hit area stays a 24 px circle`).toBeLessThanOrEqual(25);
  }
  for (const off of g.hitOffset) expect(Math.abs(off), `${name}: the hit area is concentric`).toBeLessThanOrEqual(HIT_CENTRE);
  expect(g.hitDiagonal, `${name}: the hit area is round`).toBeGreaterThanOrEqual(11);
  expect(g.hitDiagonal, `${name}: the hit area is round, not square`).toBeLessThan(14);
};

async function open(page, theme, url, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(REMOVE).first()).toBeVisible();
}

for (const width of [1280, 320]) {
  for (const [where, url] of [['docs specimen', DOCS], ['harness', HARNESS]]) {
    test(`${where} @${width}: icon, centring, circle, hit area, trailing gap and pill height`, async ({ page }, testInfo) => {
      await open(page, testInfo.project.name, url, width);
      const buttons = page.locator(REMOVE);
      const count = await buttons.count();
      expect(count).toBeGreaterThan(0);
      const report = [];
      for (let i = 0; i < count; i += 1) {
        const btn = buttons.nth(i);
        await btn.scrollIntoViewIfNeeded();
        const name = await btn.getAttribute('aria-label');
        const g = await btn.evaluate(geometry);
        report.push({ name, ...g });
        expectGeometry(g, name);
      }
      await testInfo.attach('geometry.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
      if (process.env.UIX_PRINT) console.log(JSON.stringify({ project: testInfo.project.name, where, width, report }));
    });
  }
}

test('hover is a visible circle on every pill (≥ 1.4:1) and the icon reads (≥ 3:1)', async ({ page }, testInfo) => {
  const report = [];
  for (const url of [DOCS, HARNESS]) {
    await open(page, testInfo.project.name, url, 1280);
    const buttons = page.locator(REMOVE);
    for (let i = 0; i < await buttons.count(); i += 1) {
      const btn = buttons.nth(i);
      if (await btn.isDisabled()) continue;
      await btn.hover();
      // the fill eases in over --uix-dur-fast
      await expect.poll(() => btn.evaluate((el) => el.getAnimations().length)).toBe(0);
      const c = await btn.evaluate(hoverContrast);
      report.push({ name: await btn.getAttribute('aria-label'), ...c });
      expect(c.hover, `${await btn.getAttribute('aria-label')}: hover vs pill`).toBeGreaterThanOrEqual(1.4);
      expect(c.icon, `${await btn.getAttribute('aria-label')}: icon vs pill`).toBeGreaterThanOrEqual(3);
      await page.mouse.move(0, 0);
    }
  }
  if (process.env.UIX_PRINT) console.log(JSON.stringify({ project: testInfo.project.name, hover: report }));
});

test('the keyboard focus ring is round and concentric', async ({ page }, testInfo) => {
  for (const url of [DOCS, HARNESS]) {
    await open(page, testInfo.project.name, url, 1280);
    const buttons = page.locator(REMOVE);
    for (let i = 0; i < await buttons.count(); i += 1) {
      const btn = buttons.nth(i);
      if (await btn.isDisabled()) continue;
      await page.keyboard.press('Shift'); // keyboard modality, so programmatic focus is :focus-visible
      await btn.focus();
      const ring = await btn.evaluate((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          visible: el.matches(':focus-visible'),
          style: s.outlineStyle,
          width: parseFloat(s.outlineWidth),
          offset: parseFloat(s.outlineOffset),
          radius: parseFloat(s.borderTopLeftRadius),
          square: r.width === r.height,
        };
      });
      expect(ring.visible).toBe(true);
      expect(ring.style).toBe('solid');
      expect(ring.width).toBe(2);
      expect(ring.offset).toBe(1);
      // the outline follows border-radius: a square box with a radius ≥ half its side is a circle
      expect(ring.square).toBe(true);
      expect(ring.radius).toBeGreaterThanOrEqual(10);
    }
  }
});

test('forced colours: the icon keeps a system colour and hover draws an outline', async ({ page }, testInfo) => {
  await page.emulateMedia({ forcedColors: 'active' });
  for (const url of [DOCS, HARNESS]) {
    await open(page, testInfo.project.name, url, 1280);
    const buttons = page.locator(REMOVE);
    for (let i = 0; i < await buttons.count(); i += 1) {
      const btn = buttons.nth(i);
      if (await btn.isDisabled()) continue;
      await btn.hover();
      const c = await btn.evaluate(hoverContrast);
      const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
      expect(c.icon, 'the icon against the forced pill').toBeGreaterThanOrEqual(3);
      expect(outline, 'hover shows as an outline when the tint is stripped').toBe('solid');
      await page.mouse.move(0, 0);
    }
  }
});

test('Chip onRemove fires from the x; the harness has no serious axe violations', async ({ page }, testInfo) => {
  await open(page, testInfo.project.name, HARNESS, 1280);
  const { violations } = await new AxeBuilder({ page }).include('#chips').include('#tags').analyze();
  expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  await page.getByRole('button', { name: 'Remove Open' }).click();
  await expect(page.locator('[data-removed]')).toHaveText('Open');
});
