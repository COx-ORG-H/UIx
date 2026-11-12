import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* A link that stands on its own in a kit slot owns a 24 px target (WCAG 2.5.8): the sort button in a
 * column header and a data cell's link (HAR-3084), a link in the Peek footer (HAR-3091), a linked
 * eyebrow section label and .uix-section-link (HAR-3097). The element box itself is measured, as
 * axe's target-size rule and TENSOR's council probe measure it, and the drawn text must not move:
 * each target's text sits where the same text sits without the target. */

const HARNESS = '/tests/link-targets/harness.html';

async function open(page, which, theme) {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto(`${HARNESS}?case=${which}`, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled(document.getAnimations().filter((a) => Number.isFinite(a.effect?.getComputedTiming().iterations)).map((a) => a.finished));
  });
}

/** The element's own box, and the box of its first text line. A range over the element's contents
 *  would also return the border boxes of the elements inside it, so only text nodes are measured. */
const measure = (el) => {
  const textTopOf = (node) => {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.nodeValue.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(t);
      const rect = [...range.getClientRects()].find((r) => r.width > 0);
      if (rect) return rect.top;
    }
    return NaN;
  };
  const box = el.getBoundingClientRect();
  return { width: box.width, height: box.height, textTop: textTopOf(el), fontSize: parseFloat(getComputedStyle(el).fontSize) };
};

const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function noTargetSizeViolations(page) {
  const results = await new AxeBuilder({ page }).withRules(['target-size']).analyze();
  expect(results.violations.map((v) => v.nodes.map((n) => n.target.join(' '))).flat()).toEqual([]);
}

test('table: every sort button and every cell link is a 24 px target, and their text stays on the plain text line (HAR-3084)', async ({ page }, testInfo) => {
  await open(page, 'table', themeOf(testInfo));
  const header = await page.locator('thead').evaluate((thead, fn) => {
    const m = new Function(`return (${fn})`)();
    const plain = [...thead.querySelectorAll('th')].find((th) => !th.querySelector('button'));
    return { plainTop: m(plain).textTop, buttons: [...thead.querySelectorAll('.uix-th__sortbtn')].map((b) => ({ name: b.textContent, ...m(b) })) };
  }, measure.toString());
  expect(header.buttons).toHaveLength(3);
  for (const b of header.buttons) {
    expect(b.height, `sort button "${b.name}" height`).toBeGreaterThanOrEqual(24);
    expect(Math.abs(b.textTop - header.plainTop), `sort button "${b.name}" text moved`).toBeLessThanOrEqual(0.5);
  }

  const rows = await page.locator('tbody tr').evaluateAll((trs, fn) => {
    const m = new Function(`return (${fn})`)();
    return trs.map((tr) => {
      const plain = tr.querySelector('[data-text="plain-cell"]');
      const rowH = parseFloat(getComputedStyle(tr).getPropertyValue('--uix-row-h'));
      return { rowHeight: tr.getBoundingClientRect().height, rowH, plainTop: m(plain).textTop, links: [...tr.querySelectorAll('[data-target]')].map((a) => ({ name: a.textContent, kind: a.dataset.target, ...m(a) })) };
    });
  }, measure.toString());
  for (const row of rows) {
    // the row keeps the kit row height (--uix-row-h, plus its 1 px divider)
    expect(row.rowHeight).toBeLessThanOrEqual(row.rowH + 1);
    for (const link of row.links) {
      expect(link.height, `${link.kind} "${link.name}" height`).toBeGreaterThanOrEqual(24);
      expect(Math.abs(link.textTop - row.plainTop), `${link.kind} "${link.name}" text moved`).toBeLessThanOrEqual(0.5);
    }
  }
  await noTargetSizeViolations(page);
  await testInfo.attach('table', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('section heads: a linked eyebrow label is a 24 px target and its text sits where the unlinked one does; a section link is 24 px (HAR-3097)', async ({ page }, testInfo) => {
  await open(page, 'heads', themeOf(testInfo));
  const heads = await page.evaluate((fn) => {
    const m = new Function(`return (${fn})`)();
    const at = (c) => document.querySelector(`[data-case="${c}"]`);
    const textOf = (el) => ({ top: m(el).textTop });
    const unlinked = at('unlinked');
    const linked = at('linked');
    const head = (c) => at(c).querySelector('.uix-section-head').getBoundingClientRect();
    const title = (c) => at(c).querySelector('.uix-section-title');
    const style = getComputedStyle(title('unlinked'));
    return {
      unlinked: { headHeight: head('unlinked').height, textTop: textOf(title('unlinked')).top - unlinked.getBoundingClientRect().top, bodyTop: unlinked.querySelector('p').getBoundingClientRect().top - unlinked.getBoundingClientRect().top },
      linked: { headHeight: head('linked').height, textTop: textOf(title('linked')).top - linked.getBoundingClientRect().top, bodyTop: linked.querySelector('p').getBoundingClientRect().top - linked.getBoundingClientRect().top, link: m(linked.querySelector('.uix-section-title__link')), minHeight: getComputedStyle(linked.querySelector('.uix-section-title__link')).minHeight },
      sectionLink: { ...m(document.querySelector('.uix-section-link')), minHeight: getComputedStyle(document.querySelector('.uix-section-link')).minHeight },
      eyebrow: { fontSize: style.fontSize, textTransform: style.textTransform, fontWeight: style.fontWeight },
    };
  }, measure.toString());
  expect(heads.eyebrow).toEqual({ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' });
  expect(heads.unlinked.headHeight).toBe(24);
  expect(heads.linked.headHeight).toBe(24);
  expect(parseFloat(heads.linked.minHeight)).toBeGreaterThanOrEqual(24);
  expect(heads.linked.link.height).toBeGreaterThanOrEqual(24);
  expect(Math.abs(heads.linked.textTop - heads.unlinked.textTop), 'the linked label text sits where the unlinked one does').toBeLessThanOrEqual(0.5);
  expect(heads.linked.bodyTop).toBe(heads.unlinked.bodyTop);
  expect(parseFloat(heads.sectionLink.minHeight)).toBeGreaterThanOrEqual(24);
  expect(heads.sectionLink.height).toBeGreaterThanOrEqual(24);
  await noTargetSizeViolations(page);
  await testInfo.attach('heads', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('peek footer: a plain link, a classed link and a link Button are 24 px targets at the meta size (HAR-3091)', async ({ page }, testInfo) => {
  await open(page, 'peek', themeOf(testInfo));
  const peek = page.getByRole('dialog');
  await expect(peek).toBeVisible();
  const footer = await peek.evaluate((el, fn) => {
    const m = new Function(`return (${fn})`)();
    const meta = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--uix-text-meta')) * 16;
    return { meta, targets: [...el.querySelectorAll('.uix-peek__footer [data-target]')].map((a) => ({ kind: a.dataset.target, ...m(a) })) };
  }, measure.toString());
  expect(footer.targets.map((t) => t.kind)).toEqual(['footer-plain', 'footer-classed', 'footer-button']);
  for (const t of footer.targets) expect(t.height, `${t.kind} height`).toBeGreaterThanOrEqual(24);
  for (const t of footer.targets.slice(0, 2)) expect(t.fontSize, `${t.kind} at the meta size`).toBeCloseTo(footer.meta, 1);
  // keyboard: the first footer link takes focus and shows the ring
  await page.locator('[data-target="footer-plain"]').focus();
  const ring = await page.locator('[data-target="footer-plain"]').evaluate((a) => getComputedStyle(a).outlineStyle);
  expect(ring).not.toBe('none');
  await noTargetSizeViolations(page);
  await testInfo.attach('peek', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
