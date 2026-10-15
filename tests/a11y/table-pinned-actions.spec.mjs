/* The frozen trailing actions column (`.uix-table--pinned-actions`, `<Table pinnedActions>`) in a
 * real browser, in both themes. jsdom has no layout or sticky positioning, so all of it is
 * measured here, on tests/table-pinned/harness.tsx (bundled in globalSetup):
 *   - however far a too-wide table is scrolled sideways, each row's Peek button stays inside the
 *     wrap and is the element under the pointer (the control table proves it would leave);
 *   - the header's last cell sticks on both axes and stays above the body cells under it;
 *   - a pinned cell is opaque and looks exactly like the rest of its row, at rest and on hover,
 *     for zebra, line-divider, pinned and selected rows. The dark pinned and selected tints are
 *     translucent, so a cell that painted them bare showed the scrolled cells through it; the
 *     same check covers the first-column pin;
 *   - the leading hairline, and an expanded detail row's own tint. */
import { test, expect } from '@playwright/test';

const HARNESS = '/tests/table-pinned/harness.html';

test.beforeEach(async ({ page }, testInfo) => {
  const theme = testInfo.project.name;
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, theme);
  // no background transition, so a hover reads its final colour at once
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('#control tbody tr').first()).toBeVisible();
});

const wrapOf = (page, id) => page.locator(`#${id} .uix-table-wrap`);

/** Scrolls the wrap, then reports where each row's Peek button is and what is under its centre. */
function peekGeometry(wrap, { left, top = 0 }) {
  wrap.scrollLeft = left === 'max' ? wrap.scrollWidth : left;
  wrap.scrollTop = top;
  const w = wrap.getBoundingClientRect();
  const inner = {
    left: w.left + wrap.clientLeft, right: w.left + wrap.clientLeft + wrap.clientWidth,
    top: w.top + wrap.clientTop, bottom: w.top + wrap.clientTop + wrap.clientHeight,
  };
  const rows = [...wrap.querySelectorAll('tbody tr:not(.uix-table__detail)')];
  return {
    scrollLeft: wrap.scrollLeft,
    overflow: wrap.scrollWidth - wrap.clientWidth,
    inner,
    peeks: rows.map((tr) => {
      const btn = tr.querySelector('.uix-rowact');
      const r = btn.getBoundingClientRect();
      const visibleY = r.top >= inner.top && r.bottom <= inner.bottom;
      const hit = visibleY ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return {
        row: tr.dataset.row, left: r.left, right: r.right, visibleY,
        hitIsButton: hit ? hit.closest('button') === btn : null,
      };
    }),
  };
}

for (const id of ['both', 'no-zebra']) {
  test(`${id}: every Peek button stays in the wrap and on top at any horizontal scroll`, async ({ page }) => {
    const wrap = wrapOf(page, id);
    for (const left of [0, 180, 'max']) {
      const g = await wrap.evaluate(peekGeometry, { left });
      expect(g.overflow, 'the table must be wider than its wrap').toBeGreaterThan(300);
      for (const p of g.peeks) {
        expect(p.right, `${p.row} at scrollLeft ${g.scrollLeft}`).toBeLessThanOrEqual(g.inner.right + 0.5);
        expect(p.left, `${p.row} at scrollLeft ${g.scrollLeft}`).toBeGreaterThanOrEqual(g.inner.left - 0.5);
        if (p.visibleY) expect(p.hitIsButton, `${p.row} at scrollLeft ${g.scrollLeft}: covered`).toBe(true);
      }
    }
  });
}

test('control: without pinnedActions the Peek button sits past the right edge', async ({ page }) => {
  const g = await wrapOf(page, 'control').evaluate(peekGeometry, { left: 0 });
  expect(g.overflow).toBeGreaterThan(300);
  for (const p of g.peeks) expect(p.left, p.row).toBeGreaterThan(g.inner.right);
});

test('the header corner cells stick on both axes and stay above the body', async ({ page }) => {
  const wrap = wrapOf(page, 'both');
  for (const left of [0, 'max']) {
    const g = await wrap.evaluate((el, left) => {
      el.scrollLeft = left === 'max' ? el.scrollWidth : left;
      el.scrollTop = 120; // body rows now run under the sticky header
      const w = el.getBoundingClientRect();
      const inner = { left: w.left + el.clientLeft, right: w.left + el.clientLeft + el.clientWidth, top: w.top + el.clientTop };
      const ths = el.querySelectorAll('thead th');
      const cell = (th) => {
        const r = th.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { left: r.left, right: r.right, top: r.top, onTop: hit?.closest('th') === th, z: Number(getComputedStyle(th).zIndex) };
      };
      const td = el.querySelector('tbody tr td:last-child');
      return {
        scrollTop: el.scrollTop, inner, first: cell(ths[0]), last: cell(ths[ths.length - 1]),
        bodyZ: Number(getComputedStyle(td).zIndex),
      };
    }, left);
    expect(g.scrollTop, 'the wrap must scroll vertically too').toBeGreaterThan(100);
    expect(g.last.top).toBeCloseTo(g.inner.top, 0);
    expect(g.last.right).toBeCloseTo(g.inner.right, 0);
    expect(g.last.onTop, 'last header cell covered').toBe(true);
    expect(g.first.top).toBeCloseTo(g.inner.top, 0);
    expect(g.first.left).toBeCloseTo(g.inner.left, 0);
    expect(g.first.onTop, 'first header cell covered').toBe(true);
    expect(g.last.z).toBeGreaterThan(g.bodyZ);
  }
});

/** Runs in the page: each body row's own look (its background over the wrap's surface) next to
 * the look of its pinned cells (a gradient tint over the cell's own colour). */
function rowPaint(wrap) {
  const rgba = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [r, g, b, a];
  };
  const over = (top, bottom) => {
    if (!top || top[3] === 0) return bottom;
    const a = top[3] + bottom[3] * (1 - top[3]);
    return [0, 1, 2].map((i) => Math.round((top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a)).concat(a);
  };
  const surface = rgba(getComputedStyle(wrap).backgroundColor);
  const table = wrap.querySelector('table');
  const pinnedCells = (tr) => [
    ...(table.classList.contains('uix-table--pinned-col') ? [tr.firstElementChild] : []),
    ...(table.classList.contains('uix-table--pinned-actions') ? [tr.lastElementChild] : []),
  ];
  return [...wrap.querySelectorAll('tbody tr:not(.uix-table__detail)')].map((tr) => {
    const row = over(rgba(getComputedStyle(tr).backgroundColor), surface);
    return {
      row: tr.dataset.row,
      state: tr.dataset.selected != null ? 'selected' : tr.dataset.pinned != null ? 'pinned' : 'plain',
      expected: row,
      cells: pinnedCells(tr).map((td) => {
        const cs = getComputedStyle(td);
        const base = rgba(cs.backgroundColor);
        const tint = cs.backgroundImage === 'none' ? null : rgba(cs.backgroundImage);
        return { base, painted: over(tint, base), shadow: cs.boxShadow };
      }),
    };
  });
}

const sameColour = (a, b, msg) => {
  for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i]), `${msg}: ${a} vs ${b}`).toBeLessThanOrEqual(1);
};

for (const id of ['both', 'no-zebra']) {
  test(`${id}: pinned cells are opaque and match their row at rest and on hover`, async ({ page }) => {
    const wrap = wrapOf(page, id);
    const rest = await wrap.evaluate(rowPaint);
    expect(new Set(rest.map((r) => r.state))).toEqual(new Set(['plain', 'pinned', 'selected']));
    for (const r of rest) {
      for (const c of r.cells) {
        expect(c.base[3], `${r.row}: the pinned cell must be opaque`).toBe(1);
        sameColour(c.painted, r.expected, `${r.row} (${r.state}) at rest`);
      }
    }
    if (id === 'both') {
      // zebra: two neighbouring plain rows differ, and the pinned cells follow
      const plain = rest.filter((r) => r.state === 'plain');
      expect(plain[0].expected).not.toEqual(plain[1].expected);
    }

    for (const key of ['INC-4822', 'INC-4823', 'INC-4825']) { // even, pinned, selected
      await page.locator(`#${id} tr[data-row="${key}"] td:nth-child(3)`).hover();
      const r = (await wrap.evaluate(rowPaint)).find((x) => x.row === key);
      expect(r.expected, `${key}: the hover must change the row`).not.toEqual(rest.find((x) => x.row === key).expected);
      for (const c of r.cells) {
        expect(c.base[3]).toBe(1);
        sameColour(c.painted, r.expected, `${key} (${r.state}) on hover`);
      }
    }
  });
}

test('the pinned actions cell draws a leading hairline; the first-column pin a trailing one', async ({ page }) => {
  const [row] = await wrapOf(page, 'both').evaluate(rowPaint);
  expect(row.cells).toHaveLength(2);
  expect(row.cells[0].shadow).toMatch(/(^|\s)1px 0px 0px/);
  expect(row.cells[1].shadow).toMatch(/-1px 0px 0px/);
});

test('an expanded detail row keeps its own tint under both pins', async ({ page }) => {
  const g = await wrapOf(page, 'both').evaluate((wrap) => {
    const td = wrap.querySelector('tr.uix-table__detail > td');
    const probe = document.createElement('div');
    probe.style.background = 'var(--uix-bg-subtle)';
    document.body.append(probe);
    const want = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { got: getComputedStyle(td).backgroundColor, want };
  });
  expect(g.got).toBe(g.want);
});
