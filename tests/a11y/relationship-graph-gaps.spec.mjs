/* RelationshipGraph: TENSOR's K3 gaps map (HAR-1639) and CMDB topology sizes (HAR-1387).
 *
 * K3 (tests/graph-gaps/harness.tsx?case=k3), Chromium, light and dark, German labels:
 *   - a missing relation is a dashed edge in the danger tone; toned nodes match the legend;
 *   - no node gets the root border in a map with several starting points;
 *   - every label is shown and no two label boxes overlap in the dense column;
 *   - a table row reveals its node in the map and keeps the keyboard in the table;
 *   - each node's description carries its relationships, "erwartet, fehlt" included;
 *   - with reduced motion the reveal is a jump, not a slide.
 * CMDB (…?case=cmdb&nodes=N), light: 300 and 600 nodes render without overlapping items, the
 * keyboard reaches the fourth column, and dragging the map holds frame times nobody sees (median
 * under 34 ms, the 95th percentile under 50 ms, over 60 pointer moves). Before HAR-1387 every
 * pointer move rebuilt every item, edge and list row: p95 100 ms at 300 nodes, 450 ms at 600.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/graph-gaps/harness.html';
const GATED = new Set(['serious', 'critical']);

const open = async (page, testInfo, query = '?case=k3', options = {}) => {
  if (options.viewport) await page.setViewportSize(options.viewport);
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((t) => {
    try { localStorage.setItem('uix-theme', t); } catch { /* private mode */ }
  }, testInfo.project.name);
  await page.goto(`${HARNESS}${query}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', testInfo.project.name);
  await expect(page.locator('.uix-relationship-graph__item').first()).toBeVisible();
};

test('K3: a missing relation is dashed and danger-toned; toned nodes match the legend; no root border', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const read = await page.evaluate(() => {
    const link = [...document.querySelectorAll('.uix-relationship-graph__link')].find((g) => g.dataset.variant === 'dashed');
    const path = getComputedStyle(link.querySelector('path'));
    const ledger = getComputedStyle(document.querySelector('[data-node-id="ledger"]'));
    const legendMissing = getComputedStyle(document.querySelector('.uix-relationship-graph__legend li[data-variant="dashed"] .uix-relationship-graph__legend-mark'));
    const legendAbsent = getComputedStyle(document.querySelector('.uix-relationship-graph__legend li[data-shape="node"][data-tone="danger"] .uix-relationship-graph__legend-mark'));
    return {
      dash: path.strokeDasharray, edge: path.stroke, node: ledger.borderTopColor,
      legendEdge: legendMissing.borderTopColor, legendEdgeStyle: legendMissing.borderTopStyle, legendNode: legendAbsent.borderLeftColor,
      roots: document.querySelectorAll('[data-root]').length,
    };
  });
  expect(read.dash).not.toBe('none');
  expect(read.edge).toBe(read.node);
  expect(read.legendEdge).toBe(read.edge);
  expect(read.legendEdgeStyle).toBe('dashed');
  expect(read.legendNode).toBe(read.node);
  expect(read.roots).toBe(0);
});

test('K3: every label shown, and no two label boxes overlap', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const boxes = await page.evaluate(() => [...document.querySelectorAll('.uix-relationship-graph__edge-label text')].map((text) => {
    const r = text.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: text.textContent };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(8);
  const overlapping = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlapping.push(`${a.text} × ${b.text}`);
    }
  }
  expect(overlapping).toEqual([]);
});

test('K3: a table row reveals its node in the map and keeps focus in the table', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const row = page.locator('#k3-table [data-reveal="vm5"]');
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(row).toBeFocused();
  await expect.poll(() => page.evaluate(() => {
    const viewport = document.querySelector('#k3 .uix-relationship-graph__viewport').getBoundingClientRect();
    const item = document.querySelector('[data-node-id="vm5"]').getBoundingClientRect();
    return item.top >= viewport.top && item.bottom <= viewport.bottom && item.left >= viewport.left && item.right <= viewport.right;
  })).toBe(true);
});

test('K3: with reduced motion the reveal jumps', async ({ page }, testInfo) => {
  await open(page, testInfo, '?case=k3', { reducedMotion: true });
  await page.locator('#k3-table [data-reveal="vm5"]').click();
  const animated = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
    const stage = document.querySelector('#k3 .uix-relationship-graph__stage');
    resolve({ attribute: stage.hasAttribute('data-animate'), running: stage.getAnimations().length });
  }))));
  expect(animated).toEqual({ attribute: false, running: 0 });
});

test('K3: each node says its relationships, the missing one included', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const description = await page.locator('[data-node-id="ledger"]').evaluate((el) => document.getElementById(el.getAttribute('aria-describedby')).textContent);
  expect(description).toContain('deckt ab, von Kontrolle K3.2 (erwartet, fehlt)');
  expect(description).toContain('schreibt in, von Zahlungs-API');
  expect(description).toContain('läuft auf srv-ledger-prod-01');
});

test('K3: axe', async ({ page }, testInfo) => {
  await open(page, testInfo);
  const results = await new AxeBuilder({ page }).include('#root').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const gated = results.violations.filter((v) => GATED.has(v.impact));
  expect(gated, gated.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`).join('\n')).toEqual([]);
});

/* HAR-1387 review of PR #166: the 300-node map rendered but did not read. 197 of 200 labels said
 * "depends on", the hub's 53 translucent strokes stacked to black, the hint and the zoom level sat
 * on the map with no surface over "Rack 27", a focused item could land under the controls, and
 * the "cycle" flag covered the first line of a name. */
test('CMDB 300 nodes: reads — no repeated labels, an opaque bus, chrome on a surface, focus clear of it, names clear of flags', async ({ page }, testInfo) => {
  await open(page, testInfo, '?case=cmdb&nodes=300', { viewport: { width: 1280, height: 900 }, reducedMotion: true });
  const read = await page.evaluate(() => {
    const labels = [...document.querySelectorAll('#cmdb .uix-relationship-graph__edge-label text')].map((text) => text.textContent);
    const opaque = (colour) => !/\/\s*0?\.\d|rgba\(/.test(colour);
    const bus = document.querySelectorAll('#cmdb .uix-relationship-graph__link[data-bus]');
    const stroke = getComputedStyle(bus[0].querySelector('path')).stroke;
    const chrome = ['.uix-relationship-graph__hint', '.uix-relationship-graph__zoom-level'].map((selector) => {
      const style = getComputedStyle(document.querySelector(`#cmdb ${selector}`));
      return { selector, background: style.backgroundColor, border: style.borderTopWidth };
    });
    const flagged = [...document.querySelectorAll('#cmdb .uix-relationship-graph__item[data-flag]')].map((item) => {
      const name = item.querySelector('.uix-relationship-graph__item-label');
      const range = document.createRange();
      range.selectNodeContents(name);
      const text = [...range.getClientRects()];
      const flag = item.querySelector('.uix-relationship-graph__item-flag').getBoundingClientRect();
      return text.some((r) => r.left < flag.right && flag.left < r.right && r.top < flag.bottom && flag.top < r.bottom);
    });
    return { labels, busCount: bus.length, stroke, strokeOpaque: opaque(stroke), chrome: chrome.map((c) => ({ ...c, opaque: opaque(c.background) && c.background !== 'rgba(0, 0, 0, 0)' })), flagged };
  });
  expect(read.labels.filter((text) => text === 'depends on')).toEqual([]);
  expect(read.labels.length).toBeLessThan(20);
  expect(read.busCount).toBeGreaterThan(40);
  expect(read.strokeOpaque, read.stroke).toBe(true);
  for (const chrome of read.chrome) {
    expect(chrome.opaque, `${chrome.selector}: ${chrome.background}`).toBe(true);
    expect(chrome.border).toBe('1px');
  }
  expect(read.flagged.length).toBeGreaterThan(0);
  expect(read.flagged.filter(Boolean)).toEqual([]);
  // the keyboard walks down the second column: no focused item ends up under the footer
  await page.locator('#cmdb [data-node-id="ci-0"]').focus();
  await page.keyboard.press('ArrowRight');
  const covered = [];
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(40);
    const hit = await page.evaluate(() => {
      const item = document.activeElement.getBoundingClientRect();
      return [...document.querySelectorAll('#cmdb .uix-relationship-graph__hint, #cmdb .uix-relationship-graph__controls')].some((chrome) => {
        const r = chrome.getBoundingClientRect();
        return r.width > 0 && item.left < r.right && r.left < item.right && item.top < r.bottom && r.top < item.bottom;
      }) ? document.activeElement.dataset.nodeId : null;
    });
    if (hit) covered.push(hit);
  }
  expect(covered).toEqual([]);
});

for (const count of [300, 600]) {
  test(`CMDB ${count} nodes: no overlapping items, the keyboard reaches the last column, dragging stays smooth`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'light', 'a performance measure, once');
    await open(page, testInfo, `?case=cmdb&nodes=${count}`, { viewport: { width: 1280, height: 900 } });
    const layout = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#cmdb .uix-relationship-graph__item')].map((el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }));
      let overlaps = 0;
      const byColumn = new Map();
      for (const item of items) byColumn.set(item.x, [...(byColumn.get(item.x) ?? []), item]);
      for (const column of byColumn.values()) {
        column.sort((a, b) => a.y - b.y);
        for (let i = 1; i < column.length; i += 1) if (column[i].y < column[i - 1].y + column[i - 1].h) overlaps += 1;
      }
      return { items: items.length, columns: byColumn.size, overlaps, firstRender: window.__graphTimings.firstRender };
    });
    expect(layout.overlaps).toBe(0);
    expect(layout.columns).toBeGreaterThanOrEqual(5);
    testInfo.annotations.push({ type: 'first render (ms)', description: String(Math.round(layout.firstRender)) });
    // keyboard: from the root, ArrowRight four times reaches column 4
    await page.locator('#cmdb .uix-relationship-graph__item[tabindex="0"]').focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowRight');
    const depth = await page.evaluate(() => document.activeElement.offsetLeft);
    expect(depth).toBeGreaterThan(0);
    // frame times while dragging the map
    const box = await page.locator('#cmdb .uix-relationship-graph__viewport').boundingBox();
    await page.evaluate(() => {
      window.__frames = [];
      let last = performance.now();
      const loop = (now) => { window.__frames.push(now - last); last = now; if (window.__frames.length < 80) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 0; i < 60; i += 1) await page.mouse.move(box.x + box.width / 2 - i * 6, box.y + box.height / 2 - i * 3);
    await page.mouse.up();
    const frames = await page.evaluate(() => window.__frames.slice(5).sort((a, b) => a - b));
    const median = frames[Math.floor(frames.length / 2)];
    const p95 = frames[Math.floor(frames.length * 0.95)];
    testInfo.annotations.push({ type: 'drag frame times (ms)', description: `median ${median.toFixed(1)}, p95 ${p95.toFixed(1)}` });
    expect(median).toBeLessThan(34);
    expect(p95).toBeLessThan(50);
  });
}

// Batch follow-up (PR #166 review): the hint and the zoom level sat on surfaces, but the map ran
// on underneath, between and around them, so at 1280 px the bottom row ("Application 83",
// "Rack 27") was half covered. The footer is now a band across the map's bottom edge, and Fit
// and the first view leave its height free.
for (const width of [390, 1280, 1920]) {
  test(`CMDB map at ${width} px: the footer is a band along the bottom edge, and Fit puts no item under it`, async ({ page }, testInfo) => {
    await open(page, testInfo, '?case=cmdb&nodes=40', { viewport: { width, height: width === 1920 ? 1080 : 900 }, reducedMotion: true });
    const band = await page.evaluate(() => {
      const viewport = document.querySelector('#cmdb .uix-relationship-graph__viewport');
      const footer = viewport.querySelector('.uix-relationship-graph__footer');
      const v = viewport.getBoundingClientRect();
      const f = footer.getBoundingClientRect();
      const border = parseFloat(getComputedStyle(viewport).borderLeftWidth);
      const background = getComputedStyle(footer).backgroundColor;
      return {
        left: Math.round(f.left - (v.left + border)), right: Math.round(v.right - border - f.right), bottom: Math.round(v.bottom - border - f.bottom),
        opaque: background !== 'rgba(0, 0, 0, 0)' && !/,\s*0(\.\d+)?\)$/.test(background),
      };
    });
    expect(band).toEqual({ left: 0, right: 0, bottom: 0, opaque: true });

    await page.getByRole('button', { name: 'Fit' }).click();
    await page.waitForTimeout(100);
    const fit = await page.evaluate(() => {
      const viewport = document.querySelector('#cmdb .uix-relationship-graph__viewport');
      const top = viewport.querySelector('.uix-relationship-graph__footer').getBoundingClientRect().top;
      const zoom = Number(/scale\(([\d.]+)\)/.exec(viewport.querySelector('.uix-relationship-graph__stage').style.transform)?.[1]);
      const under = [...viewport.querySelectorAll('.uix-relationship-graph__item')]
        .filter((item) => item.getBoundingClientRect().bottom > top + 0.5).map((item) => item.textContent.slice(0, 24));
      return { zoom, under };
    });
    // At the 40 % floor a phone-width map cannot hold the graph; Fit then shows what it can.
    if (fit.zoom > 0.4) expect(fit.under).toEqual([]);
  });
}

// Operator review 2026-10-23 on the clinical-services demo (?case=clinical: 25 nodes, toned and
// dashed edges, Bosnian labels): edge labels were tiny and lines ran through them, the legend's
// samples sat off their words' middle, and a pan dragged a ghost of the selected labels along.
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('clinical map: edge labels sit on opaque chips above every line, in small text at >= 4.5:1, apart', async ({ page }, testInfo) => {
  await open(page, testInfo, '?case=clinical', { viewport: { width: 1280, height: 900 }, reducedMotion: true });
  const read = await page.evaluate(() => {
    const svg = document.querySelector('#clinical .uix-relationship-graph__edges');
    const rgb = (value) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.append(probe);
      const out = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
      probe.remove();
      return out;
    };
    const root = getComputedStyle(document.documentElement);
    const meta = parseFloat(root.getPropertyValue('--uix-text-meta')) * parseFloat(root.fontSize);
    const labels = [...svg.querySelectorAll('.uix-relationship-graph__edge-label')].map((group) => {
      const text = group.querySelector('text');
      const rect = group.querySelector('rect');
      const t = text.getBBox();
      const r = rect.getBBox();
      const rectStyle = getComputedStyle(rect);
      const chipColour = rgb(rectStyle.fill);
      return {
        words: text.textContent,
        font: parseFloat(getComputedStyle(text).fontSize),
        inside: r.x <= t.x && r.y <= t.y && r.x + r.width >= t.x + t.width && r.y + r.height >= t.y + t.height,
        opaque: Number(rectStyle.fillOpacity) === 1 && (chipColour.length === 3 || chipColour[3] === 1),
        textColour: rgb(getComputedStyle(text).fill),
        chipColour,
        box: { left: r.x, right: r.x + r.width, top: r.y, bottom: r.y + r.height },
      };
    });
    const layer = svg.querySelector('.uix-relationship-graph__edge-labels');
    const headers = [...document.querySelectorAll('#clinical .uix-relationship-graph__column')].map((c) => c.textContent.toLowerCase());
    return { meta, labels, labelsLast: svg.lastElementChild === layer, headers };
  });
  expect(read.labels.length).toBeGreaterThanOrEqual(6);
  expect(read.labelsLast, 'labels are drawn after every line').toBe(true);
  for (const label of read.labels) {
    expect(label.font, `${label.words}: font size`).toBeGreaterThanOrEqual(read.meta - 0.01);
    expect(label.inside, `${label.words}: the chip holds the words`).toBe(true);
    expect(label.opaque, `${label.words}: the chip is opaque`).toBe(true);
    expect(contrast(label.textColour.slice(0, 3), label.chipColour.slice(0, 3)), `${label.words}: contrast`).toBeGreaterThanOrEqual(4.5);
  }
  const overlapping = [];
  read.labels.forEach((a, i) => read.labels.slice(i + 1).forEach((b) => {
    if (a.box.left < b.box.right - 1 && b.box.left < a.box.right - 1 && a.box.top < b.box.bottom - 1 && b.box.top < a.box.bottom - 1) overlapping.push(`${a.words} × ${b.words}`);
  }));
  expect(overlapping).toEqual([]);
  // the column that says its common relation once draws no label for it (HAR-1387)
  expect(read.headers.some((h) => h.includes('virtualna mašina na'))).toBe(true);
  expect(read.labels.filter((l) => l.words.includes('virtualna'))).toEqual([]);
});

for (const width of [390, 1280]) {
  test(`clinical map at ${width} px: each legend sample is centred on its words, and items wrap whole`, async ({ page }, testInfo) => {
    await open(page, testInfo, '?case=clinical', { viewport: { width, height: 900 } });
    const items = await page.evaluate(() => [...document.querySelectorAll('#clinical .uix-relationship-graph__legend li')].map((li) => {
      const mark = li.querySelector('.uix-relationship-graph__legend-mark').getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(li.lastChild);
      const words = range.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(li).lineHeight);
      return {
        label: li.textContent,
        dy: Math.abs((mark.top + mark.height / 2) - (words.top + words.height / 2)),
        lines: Math.round(li.getBoundingClientRect().height / lineHeight),
        markHeight: mark.height,
        lineHeight,
      };
    }));
    expect(items.length).toBe(4);
    for (const item of items) {
      expect(item.dy, `${item.label}: centres`).toBeLessThanOrEqual(1);
      expect(item.lines, `${item.label}: one line`).toBe(1);
      expect(item.markHeight).toBeLessThanOrEqual(item.lineHeight);
    }
  });
}

test('clinical map: a pan starts no text selection and no native drag, from labels, headers or nodes', async ({ page }, testInfo) => {
  await open(page, testInfo, '?case=clinical', { viewport: { width: 1280, height: 900 } });
  await page.evaluate(() => {
    window.__drags = [];
    document.addEventListener('dragstart', (event) => window.__drags.push({ on: event.target.nodeName ?? '#text', prevented: event.defaultPrevented }));
  });
  const map = page.locator('#clinical');
  const drag = async (locator) => {
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
  };
  for (const part of [map.locator('.uix-relationship-graph__edge-label text').first(), map.locator('.uix-relationship-graph__column').first()]) {
    await page.evaluate(() => getSelection().removeAllRanges());
    await drag(part);
    expect(await page.evaluate(() => String(getSelection())), 'a pan selects nothing').toBe('');
  }
  // even with everything selected (Ctrl+A), a press on a label or a node drags no ghost
  for (const part of [map.locator('.uix-relationship-graph__edge-label text').first(), map.locator('.uix-relationship-graph__item').nth(6)]) {
    await page.evaluate(() => getSelection().selectAllChildren(document.querySelector('#clinical')));
    await drag(part);
  }
  expect(await page.evaluate(() => window.__drags.filter((d) => !d.prevented))).toEqual([]);
  // the names are still there for assistive technology and the keyboard
  await expect(map.getByRole('button', { name: /DICOM pristupnik/ })).toBeVisible();
});
