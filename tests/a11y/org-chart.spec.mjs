/* OrgChart in a real browser (HAR-1807). jsdom has no layout and no container queries, so the
 * picture is measured here: the harness (tests/org-chart/harness.tsx) is bundled from source in
 * globalSetup.
 *   - chart layout: each manager's card is centred over its reports' row, a row of people
 *     without reports is a column, no two cards overlap, the page never scrolls sideways;
 *   - zoom steps scale the chart, Fit makes its width fit the frame, the level resets to 100%;
 *   - dragging the background pans; one tab stop; the chart keys in a real browser; the
 *     focus ring;
 *   - a failed load shows a row whose Enter retries;
 *   - a revealed person deep in the chart is loaded, scrolled to and focused;
 *   - below 48rem of the chart's own width (375 and 320 px, and a 30rem box on a wide screen):
 *     the list layout, indented per level, the tree keys, no toolbar;
 *   - axe in both themes, chart and list.
 * The component contract itself is in packages/react/src/org-chart-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/org-chart/harness.html';
const GATED = new Set(['serious', 'critical']);

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#wide [data-id="cio"]')).toBeVisible();
});

const item = (page, section, id) => page.locator(`${section} [role="treeitem"][data-id="${id}"]`);
const card = (page, section, id) => item(page, section, id).locator(':scope > .uix-org-chart__node');
const toggle = (page, section, id) => card(page, section, id).locator('.uix-org-chart__toggle');
const layout = (page, section) => page.locator(`${section} .uix-org-chart__viewport`).evaluate((el) => getComputedStyle(el).getPropertyValue('--org-chart-layout').trim());
const pageOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const focusedId = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-id') ?? null);

async function expand(page, section, id) {
  await toggle(page, section, id).click();
  await expect(item(page, section, id)).toHaveAttribute('aria-expanded', 'true');
  await expect(item(page, section, id).locator(':scope > [role="group"] > [role="treeitem"]').first()).not.toHaveAttribute('data-id', /::uix-loading$/);
}

test('chart: managers centred over their reports, leaves stacked, no overlap, no sideways page scroll', async ({ page }, testInfo) => {
  expect(await layout(page, '#wide')).toBe('chart');
  await expand(page, '#wide', 'cio');
  await expand(page, '#wide', 'platform');
  await expand(page, '#wide', 'cfo');
  const m = await page.locator('#wide .uix-org-chart__tree').evaluate((tree) => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2 }; };
    const groups = [...tree.querySelectorAll('[role="group"]')].map((g) => ({
      manager: box(g.parentElement.querySelector(':scope > .uix-org-chart__node')),
      row: box(g),
      stacked: g.hasAttribute('data-stack'),
      reports: [...g.querySelectorAll(':scope > [role="treeitem"] > .uix-org-chart__node')].map(box),
      id: g.parentElement.dataset.id,
    }));
    const cards = [...tree.querySelectorAll('.uix-org-chart__node')].map(box);
    let overlaps = 0;
    for (let i = 0; i < cards.length; i += 1) for (let j = i + 1; j < cards.length; j += 1) {
      const a = cards[i]; const b = cards[j];
      if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) overlaps += 1;
    }
    return { groups, overlaps, cards: cards.length };
  });
  expect(m.overlaps).toBe(0);
  for (const g of m.groups.filter((x) => !x.stacked)) {
    expect(Math.abs(g.manager.cx - g.row.cx), `${g.id}: card centre vs reports' row centre`).toBeLessThanOrEqual(1);
    for (const r of g.reports) expect(r.y, `${g.id}: reports sit below the manager`).toBeGreaterThan(g.manager.y + g.manager.h);
    const ys = new Set(g.reports.map((r) => Math.round(r.y)));
    expect(ys.size, `${g.id}: one row`).toBe(1);
  }
  const stacked = m.groups.find((g) => g.id === 'platform');
  expect(stacked.stacked).toBe(true);
  const xs = new Set(stacked.reports.map((r) => Math.round(r.x)));
  expect(xs.size, 'one column').toBe(1);
  for (let i = 1; i < stacked.reports.length; i += 1) expect(stacked.reports[i].y).toBeGreaterThan(stacked.reports[i - 1].y + stacked.reports[i - 1].h);
  expect(await pageOverflow(page)).toBe(0);
  console.log(`[org-chart] ${testInfo.project.name} chart ${JSON.stringify({ cards: m.cards, groups: m.groups.length, stackedColumnX: [...xs] })}`);
});

test('zoom: steps scale the chart, Fit fits its width into the frame, the level resets to 100%', async ({ page }, testInfo) => {
  for (const id of ['cio', 'cfo', 'risk']) await toggle(page, '#wide', id).click();
  // risk fails its first load: retry from the error row so the chart is at full width
  const failed = item(page, '#wide', 'risk::uix-error');
  await expect(failed).toBeVisible();
  await failed.click();
  await expect(item(page, '#wide', 'mrisk')).toBeVisible();
  await expect(item(page, '#wide', 'desk')).toBeVisible();
  const tree = page.locator('#wide .uix-org-chart__tree');
  const width = async () => (await tree.boundingBox()).width;
  const room = () => page.locator('#wide .uix-org-chart__viewport').evaluate((v) => { const cs = getComputedStyle(v); return v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); });
  const full = await width();
  expect(full, 'seven teams are wider than the frame').toBeGreaterThan(await room());
  const toolbar = page.getByRole('group', { name: 'Zoom' }).first();
  await toolbar.getByRole('button', { name: 'Zoom out' }).click();
  await expect(toolbar.getByRole('button', { name: /^90%/ })).toBeVisible();
  expect(Math.abs((await width()) / full - 0.9)).toBeLessThanOrEqual(0.01);
  await toolbar.getByRole('button', { name: 'Fit' }).click();
  const fitted = await width();
  expect(fitted).toBeLessThanOrEqual((await room()) + 1);
  expect(fitted).toBeGreaterThan((await room()) * 0.9);
  await toolbar.getByRole('button', { name: /reset to 100%/ }).click();
  await expect(toolbar.getByRole('button', { name: /^100%/ })).toBeVisible();
  expect(Math.abs((await width()) - full)).toBeLessThanOrEqual(1);
  console.log(`[org-chart] ${testInfo.project.name} zoom ${JSON.stringify({ full: Math.round(full), fitted: Math.round(fitted), room: Math.round(await room()) })}`);
});

test('opening a manager keeps their card where it was; a zoom keeps the point at the centre', async ({ page }) => {
  await expand(page, '#wide', 'cio');
  const viewport = page.locator('#wide .uix-org-chart__viewport');
  // scroll so the Finance head sits off-centre, then open them: their two teams widen the row
  await viewport.evaluate((v) => { v.scrollLeft = Math.max(0, v.scrollWidth - v.clientWidth); });
  const before = await card(page, '#wide', 'cfo').boundingBox();
  const widthBefore = await page.locator('#wide .uix-org-chart__tree').evaluate((t) => t.getBoundingClientRect().width);
  await expand(page, '#wide', 'cfo');
  expect(await page.locator('#wide .uix-org-chart__tree').evaluate((t) => t.getBoundingClientRect().width)).toBeGreaterThan(widthBefore + 50);
  const after = await card(page, '#wide', 'cfo').boundingBox();
  expect(Math.abs(after.x - before.x), 'the opened card stays put sideways').toBeLessThanOrEqual(2);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
  // zoom: the chart point under the frame's centre stays there
  const centre = () => viewport.evaluate((v) => {
    const frame = v.getBoundingClientRect();
    const x = frame.left + v.clientWidth / 2;
    const y = frame.top + v.clientHeight / 2;
    const tree = v.querySelector('.uix-org-chart__tree').getBoundingClientRect();
    return { fx: (x - tree.left) / tree.width, fy: (y - tree.top) / tree.height };
  });
  const c0 = await centre();
  await page.getByRole('group', { name: 'Zoom' }).first().getByRole('button', { name: 'Zoom out' }).click();
  await expect(page.getByRole('group', { name: 'Zoom' }).first().getByRole('button', { name: /^90%/ })).toBeVisible();
  const c1 = await centre();
  expect(Math.abs(c1.fx - c0.fx)).toBeLessThanOrEqual(0.02);
});

test('a press in the space between reports opens nobody', async ({ page }) => {
  await expand(page, '#wide', 'cio');
  const group = item(page, '#wide', 'ceo').locator(':scope > [role="group"]');
  const box = await group.boundingBox();
  // the row's top edge, between the connector and the reports' cards
  await page.mouse.click(box.x + 4, box.y + 4);
  await expect(page.getByTestId('wide-selected')).toHaveText('');
});

test('the connector lines and the report count stand out from the frame (3:1)', async ({ page }) => {
  const ratio = await page.locator('#wide .uix-org-chart__viewport').evaluate((v) => {
    const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    const lum = ({ r, g, b }) => {
      const ch = (x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const bg = parse(getComputedStyle(v).backgroundColor);
    const toggle = v.querySelector('.uix-org-chart__toggle');
    const line = parse(getComputedStyle(toggle).borderTopColor);
    const mixed = { r: line.r * line.a + bg.r * (1 - line.a), g: line.g * line.a + bg.g * (1 - line.a), b: line.b * line.a + bg.b * (1 - line.a) };
    const [hi, lo] = [lum(mixed), lum(bg)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});

test('dragging the background pans the frame', async ({ page }) => {
  for (const id of ['cio', 'cfo']) await expand(page, '#wide', id);
  const viewport = page.locator('#wide .uix-org-chart__viewport');
  const before = await viewport.evaluate((v) => ({ left: v.scrollLeft, max: v.scrollWidth - v.clientWidth }));
  expect(before.max).toBeGreaterThan(100);
  const box = await viewport.boundingBox();
  // the frame's padding is background, never a card
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + 8, { steps: 4 });
  await page.mouse.up();
  const after = await viewport.evaluate((v) => v.scrollLeft);
  expect(Math.abs(after - Math.min(before.max, before.left + 80))).toBeLessThanOrEqual(2);
});

test('keyboard: one tab stop, arrows follow the picture, Enter opens, Space toggles, a visible ring', async ({ page }) => {
  await page.getByRole('group', { name: 'Zoom' }).first().getByRole('button', { name: 'Fit' }).focus();
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).toBe('ceo');
  const ring = await card(page, '#wide', 'ceo').evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(ring).toBe('solid');
  await page.keyboard.press('ArrowDown');
  expect(await focusedId(page)).toBe('cio');
  await page.keyboard.press('ArrowRight');
  expect(await focusedId(page)).toBe('cfo');
  await page.keyboard.press(' ');
  await expect(item(page, '#wide', 'acc')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  expect(await focusedId(page)).toBe('acc');
  await page.keyboard.press('ArrowLeft');
  expect(await focusedId(page)).toBe('acc', 'the first person of the level stays put');
  await page.keyboard.press('ArrowUp');
  expect(await focusedId(page)).toBe('cfo');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('wide-selected')).toHaveText('cfo');
  await page.keyboard.press('Tab');
  expect(await focusedId(page)).not.toBe('cio', 'the tree is one tab stop');
});

test('a person revealed deep in the chart is loaded, scrolled to and focused', async ({ page }) => {
  await page.evaluate(() => window.__orgReveal('p3', ['ceo', 'cio', 'platform']));
  await expect.poll(() => focusedId(page)).toBe('p3');
  const inView = await page.locator('#wide .uix-org-chart__viewport').evaluate((v) => {
    const target = v.querySelector('[data-id="p3"] > .uix-org-chart__node').getBoundingClientRect();
    const frame = v.getBoundingClientRect();
    return target.left >= frame.left - 1 && target.right <= frame.right + 1 && target.top >= frame.top - 1 && target.bottom <= frame.bottom + 1;
  });
  expect(inView).toBe(true);
  expect(await page.evaluate(() => window.__orgLoads.filter((id) => id === 'cio' || id === 'platform').length)).toBe(2);
});

for (const width of [375, 320]) {
  test(`list layout at ${width} px: indented per level, no toolbar, the tree keys, no sideways scroll`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    expect(await layout(page, '#wide')).toBe('list');
    await expect(page.locator('#wide .uix-org-chart__toolbar')).toBeHidden();
    await item(page, '#wide', 'cio').click();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, '#wide', 'desk')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    expect(await focusedId(page)).toBe('desk', '→ on an open person enters the first report');
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('platform', '↓ is the next visible person');
    await page.keyboard.press('ArrowLeft');
    expect(await focusedId(page)).toBe('cio', '← on a closed person goes to the manager');
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, '#wide', 'cio')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowDown');
    expect(await focusedId(page)).toBe('cfo');
    await expand(page, '#wide', 'cio');
    const x = async (id) => (await card(page, '#wide', id).boundingBox()).x;
    const levels = [await x('ceo'), await x('cio'), await x('desk')];
    expect(levels[1]).toBeGreaterThan(levels[0] + 8);
    expect(levels[2]).toBeGreaterThan(levels[1] + 8);
    const frame = await page.locator('#wide .uix-org-chart').boundingBox();
    const deep = await card(page, '#wide', 'desk').boundingBox();
    expect(Math.abs(deep.x + deep.width - (frame.x + frame.width))).toBeLessThanOrEqual(1);
    expect(await pageOverflow(page)).toBe(0);
    console.log(`[org-chart] ${testInfo.project.name} list@${width} ${JSON.stringify({ indents: levels.map((v) => Math.round(v - levels[0])), deepWidth: Math.round(deep.width) })}`);
  });
}

test('a 30rem box on a wide screen gets the list layout: the chart follows its own width', async ({ page }) => {
  expect(await layout(page, '#wide')).toBe('chart');
  expect(await layout(page, '#box')).toBe('list');
});

test('no serious or critical axe violations, chart and list', async ({ page }) => {
  await expand(page, '#wide', 'cio');
  await expand(page, '#wide', 'platform');
  await item(page, '#wide', 'p2').click();
  const run = async () => (await new AxeBuilder({ page }).include('#root').analyze()).violations
    .filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.length} node(s)`);
  expect(await run()).toEqual([]);
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await run()).toEqual([]);
});
