import { test, expect } from '@playwright/test';

/* Markdown as a document (HAR-3096): an article's own sections are at least as prominent as the
 * SectionHead after the body ("Ähnliche Artikel"), in both themes, and sit a section's room below
 * the text before them; inline Markdown keeps its sections below the page's headings (<h4>, the
 * h3 size). The DOM half is packages/react/src/markdown-document-dom.test.mjs. */

const HARNESS = '/tests/markdown-document/harness.html';
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');

async function open(page, theme) {
  await page.addInitScript((t) => localStorage.setItem('uix-theme', t), theme);
  await page.goto(HARNESS, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

test('a document\'s ## sections are at least as prominent as the SectionHead after the body (HAR-3096)', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const got = await page.evaluate(() => {
    const style = (el) => { const s = getComputedStyle(el); return { tag: el.tagName, size: parseFloat(s.fontSize), weight: Number(s.fontWeight), color: s.color }; };
    const doc = document.querySelector('[data-case="document"]');
    const sections = [...doc.querySelectorAll('.uix-prose--document h3')];
    const head = doc.querySelector('.uix-section-title');
    const para = doc.querySelector('.uix-prose--document p');
    const inline = document.querySelector('[data-case="inline"] .uix-prose');
    const gap = (h) => h.getBoundingClientRect().top - h.previousElementSibling.getBoundingClientRect().bottom;
    return {
      sections: sections.map(style), head: style(head), para: style(para),
      gaps: sections.map(gap),
      inline: [...inline.querySelectorAll('h4')].map(style),
      inlineTags: [...inline.querySelectorAll('h2, h3, h4')].map((el) => el.tagName),
    };
  });
  expect(got.sections.map((s) => s.tag)).toEqual(['H3', 'H3', 'H3']);
  for (const s of got.sections) {
    expect(s.size).toBeGreaterThanOrEqual(got.head.size);
    expect(s.weight).toBeGreaterThanOrEqual(got.head.weight);
    expect(s.size).toBeGreaterThan(got.para.size);
  }
  // each section has a section's room above it: --uix-space-6 (24 px), twice the prose's --uix-space-3
  for (const g of got.gaps) expect(g).toBeGreaterThanOrEqual(23);
  // inline (a comment): ## stays <h4>, the small section size
  expect(got.inlineTags).toEqual(['H4', 'H4', 'H4']);
  for (const s of got.inline) expect(s.size).toBeLessThan(got.head.size);
  await testInfo.attach('article', { body: await page.locator('[data-case="document"]').screenshot(), contentType: 'image/png' });
});
