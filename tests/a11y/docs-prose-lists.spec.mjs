/* Docs prose list rules never reach kit lists (HAR-617).
 *
 * docs.css is unlayered, so any of its `ul` / `ol` / `li + li` rules that matches a kit list beats every
 * `@layer uix.components` rule: list-based specimens (ul.uix-menu, .uix-tree ul, .uix-prose ul …) pick up
 * prose indents and gaps while every other gate stays green. PR #48 scoped the rules with
 * `:where(:not(...))`; docs/docs.test.js pins the selector text. This spec checks the rendered result:
 *   1. on every example route, no docs.css rule that sets a list's padding/margin matches a kit list
 *      or one of its items (read from the live CSSOM, so a new unscoped rule of any shape fails here);
 *   2. a `ul.uix-menu` inside the docs page has the same padding and item gaps as one outside it.
 * Layout-only, so it runs once (light).
 */
import { test, expect } from '@playwright/test';
import { SHOWCASE_PAGES } from '../../packages/tokens/docs/showcase-data.js';

const ROUTES = SHOWCASE_PAGES.map((page) => page.slug);
const KIT = '[class*="uix-"]:not([class*="uix-docs"])';

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'light', 'layout only'));

const open = async (page, route) => {
  await page.goto(`docs/explorer.html#${route}`, { waitUntil: 'networkidle' });
  await expect(page.locator('.uix-docs__page')).toBeVisible();
};

test('no docs.css list rule matches a kit list on any example route', async ({ page }) => {
  test.setTimeout(120_000);
  const leaks = [];
  for (const route of ROUTES) {
    await open(page, route);
    const found = await page.evaluate((kit) => {
      const sheet = [...document.styleSheets].find((s) => s.href?.endsWith('/docs.css'));
      if (!sheet) return ['docs.css not loaded'];
      const rules = [];
      const collect = (list) => {
        for (const rule of list) {
          if (rule.cssRules && !rule.selectorText) collect(rule.cssRules); // @media / @supports
          else if (rule.selectorText && /\b(ul|ol|li)\b/.test(rule.selectorText)
            && /padding|margin/.test(rule.style.cssText)) rules.push(rule.selectorText);
        }
      };
      collect(sheet.cssRules);
      const lists = [...document.querySelectorAll('.uix-docs__page :is(ul, ol)')]
        .filter((el) => el.matches(`${kit}, ${kit} *`));
      const out = [];
      for (const list of lists) {
        for (const el of [list, ...list.children]) {
          const hit = rules.find((selector) => el.matches(selector));
          if (hit) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.') || '(no class)'} in ${list.className || list.parentElement?.className} ← ${hit}`);
        }
      }
      return out;
    }, KIT);
    leaks.push(...found.map((line) => `${route}: ${line}`));
  }
  expect(leaks, 'kit lists styled by docs prose rules').toEqual([]);
});

test('a ul.uix-menu inside the docs page keeps its own padding and item gaps', async ({ page }) => {
  await open(page, 'examples-data-display');
  const measure = await page.evaluate(() => {
    const build = (host) => {
      const ul = document.createElement('ul');
      ul.className = 'uix-menu';
      ul.innerHTML = '<li class="uix-menu__label">A</li><li class="uix-menu__label">B</li>';
      host.append(ul);
      const style = getComputedStyle(ul);
      const second = getComputedStyle(ul.children[1]);
      const result = { paddingLeft: style.paddingLeft, marginBottom: style.marginBottom, itemGap: second.marginTop };
      ul.remove();
      return result;
    };
    return { inside: build(document.querySelector('.uix-docs__page')), outside: build(document.body) };
  });
  expect(measure.inside).toEqual(measure.outside);
});
