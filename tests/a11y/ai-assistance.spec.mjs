/* The AI primitives (Docs/specs/2026-11-20-ai-proposals.md) in Chromium on tests/ai-assistance/harness.html,
 * in both themes:
 *   - axe is clean with every piece on the page and with the AI panel open, at 1280 and 360 px; nothing
 *     scrolls sideways and every control is at least 24 px;
 *   - the AI mark is a disclosure: focus moves into the panel, Tab reaches its links, Escape and a second
 *     press close it and focus goes back to the mark;
 *   - an edit makes an AI-filled field human; Revert to AI restores it with focus on the control;
 *   - a high proposal never approves by itself (no focus on Approve, Enter in the card does nothing);
 *   - streaming: the status once, "Loading" about every 5 s, the whole reply once, never a partial reply;
 *     under reduced motion no caret and the text arrives in whole sentences.
 * The event seam and the React wiring are pinned in packages/react/src/ai-proposals-dom.test.mjs. */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const HARNESS = '/tests/ai-assistance/harness.html';
const GATED = new Set(['serious', 'critical']);
const themeOf = (testInfo) => (testInfo.project.name === 'dark' ? 'dark' : 'light');
const REPLY = 'The VPN gateway in Sarajevo timed out for about 40 remote users after the certificate rotation. Restarting the gateway service fixed it.';

async function open(page, theme, query = 'scene=all') {
  await page.goto(`${HARNESS}?${query}&theme=${theme}`, { waitUntil: 'networkidle' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('h1')).toBeVisible();
}

async function axeClean(page, include = '#root') {
  const { violations } = await new AxeBuilder({ page }).include(include).analyze();
  expect(violations.filter((v) => GATED.has(v.impact)).map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' ')}`)).toEqual([]);
}

for (const width of [1280, 360]) {
  test(`every AI piece at ${width}px: axe clean closed and with the panel open, no sideways scroll, 24 px targets`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, themeOf(testInfo));
    await axeClean(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const small = await page.locator('#root button, #root a').evaluateAll((els) => els.filter((el) => {
      const r = el.getBoundingClientRect();
      // the AI mark draws a 24 px hit area around its 18 px box (::before)
      const hit = el.classList.contains('uix-ai-label') ? 6 : 0;
      return r.width > 0 && (r.width + hit < 24 || r.height + hit < 24);
    }).map((el) => el.textContent || el.getAttribute('aria-label')));
    expect(small).toEqual([]);

    await page.getByRole('button', { name: 'AI: about Category' }).click();
    const panel = page.getByRole('dialog', { name: /Made with AI/ });
    await expect(panel).toBeVisible();
    await axeClean(page, '.uix-ai-panel');
    const box = await panel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
  });
}

test('the AI mark is a disclosure: focus into the panel, Tab to its links, Escape and a second press close it', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const mark = page.getByRole('button', { name: 'AI: about Category' });
  await expect(mark).toHaveText('AI');
  await mark.focus();
  await page.keyboard.press('Enter');
  await expect(mark).toHaveAttribute('aria-expanded', 'true');
  const panel = page.locator(`[id="${await mark.getAttribute('aria-controls')}"]`);
  await expect(panel).toBeFocused();
  await expect(panel).toContainText('Why');
  await expect(panel).toContainText('The description mentions the VPN gateway');
  await expect(panel).toContainText('AI can be wrong');
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('link', { name: 'KB-204 VPN gateway timeouts' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(mark).toBeFocused();
  await expect(mark).toHaveAttribute('aria-expanded', 'false');

  // a pointer press on the open mark closes it (the browser's light dismiss must not reopen it)
  await mark.click();
  await expect(panel).toBeVisible();
  await mark.click();
  await expect(panel).toBeHidden();
  await expect(mark).toHaveAttribute('aria-expanded', 'false');
});

test('an edit makes the AI-filled field human; Revert to AI restores it with focus on the control', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const input = page.getByRole('textbox', { name: 'Category' });
  await expect(input).toHaveValue('Network › VPN');
  await expect(input).toHaveAttribute('data-warning', 'true');
  await expect(input).toHaveAccessibleDescription('Filled in by AI. Check it.');
  await input.fill('Network › Firewall');
  await expect(input).not.toHaveAttribute('data-warning', 'true');
  await expect(page.getByRole('button', { name: 'AI: about Category' })).toHaveCount(0);
  const revert = page.getByRole('button', { name: 'Revert to AI: Category' });
  await revert.click();
  await expect(input).toHaveValue('Network › VPN');
  await expect(input).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.__said)).toContain('AI value restored');
  const actions = await page.evaluate(() => window.__events.filter((e) => e.proposalId === 'h1-category').map((e) => e.action));
  expect(actions).toEqual(['shown', 'edited', 'reverted']);
  // content-free: no event carries the value
  expect(JSON.stringify(await page.evaluate(() => window.__events))).not.toContain('Firewall');
});

test('suggestion chips: Accept and Dismiss by keyboard, reported with the band', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const second = page.getByRole('group', { name: 'AI suggestion: Service Desk L2' });
  await second.getByRole('button', { name: 'Dismiss Service Desk L2' }).focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveCount(0);
  await page.getByRole('button', { name: 'Accept Network Operations' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('offers').locator('.uix-ai-suggestion')).toHaveCount(0);
  const events = await page.evaluate(() => window.__events.filter((e) => e.kind === 'suggestion' && e.action !== 'shown'));
  expect(events.map((e) => [e.action, e.proposalId, e.consequence])).toEqual([['dismissed', 'h-assign-1', 'medium'], ['accepted', 'h-assign-0', 'medium']]);
});

test('a high proposal never approves by itself; Approve does, once', async ({ page }, testInfo) => {
  await open(page, themeOf(testInfo));
  const card = page.getByRole('region', { name: 'Resolve INC-1042 and notify the caller' });
  await expect(card).toContainText('Needs your approval');
  await expect(card).toContainText('Cannot be undone');
  await expect(card).toContainText('High impact');
  const approve = card.getByRole('button', { name: 'Approve' });
  await expect(approve).not.toBeFocused();
  // Enter on the card's other controls does not approve
  await card.getByRole('button', { name: 'Edit' }).focus();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => window.__events.filter((e) => e.proposalId === 'h1-resolve' && e.action === 'accepted').length)).toBe(0);
  await approve.dblclick();
  await expect(card.getByRole('status')).toHaveText('Applied');
  expect(await page.evaluate(() => window.__events.filter((e) => e.proposalId === 'h1-resolve' && e.action === 'accepted').length)).toBe(1);
  await axeClean(page, '.uix-proposal');
});

test('streaming: the status once, Loading about every 5 s, the whole reply once, never a partial reply', async ({ page }, testInfo) => {
  await page.clock.install();
  await open(page, themeOf(testInfo), 'scene=stream&wordMs=400');
  await page.getByRole('button', { name: 'Generate' }).click();
  await page.clock.runFor(100);
  const body = page.locator('.uix-ai-output__body');
  await expect(body).toHaveAttribute('aria-busy', 'true');
  await expect(body).toHaveAttribute('data-streaming');
  const caret = await body.locator('p').evaluate((el) => getComputedStyle(el, '::after').display);
  expect(caret).toBe('inline-block');
  // 21 words at 400 ms: a little over 8 s
  for (let i = 0; i < 12; i += 1) await page.clock.runFor(1000);
  await expect(page.locator('.uix-ai-output')).toHaveAttribute('data-status', 'done');
  await page.clock.runFor(100);
  const said = await page.evaluate(() => window.__said);
  expect(said[0]).toBe('Summarising 12 work notes');
  expect(said.filter((s) => s === 'Loading').length).toBeGreaterThanOrEqual(1);
  expect(said[said.length - 1]).toBe(`Summary ready. ${REPLY}`);
  // never a piece of the reply on its own
  const partial = said.filter((s) => s !== `Summary ready. ${REPLY}` && REPLY.split(' ').slice(0, 3).some((w) => s.includes(w)));
  expect(partial).toEqual([]);
  // the heartbeat stops with the generation
  const count = said.length;
  await page.clock.runFor(15000);
  expect((await page.evaluate(() => window.__said)).length).toBe(count);
  await axeClean(page, '.uix-ai-output');
});

test('reduced motion: no streaming caret, and the reply arrives in whole sentences', async ({ page }, testInfo) => {
  await page.clock.install();
  await open(page, themeOf(testInfo), 'scene=stream&wordMs=400&motion=reduce');
  await page.getByRole('button', { name: 'Generate' }).click();
  await page.clock.runFor(2500);
  const body = page.locator('.uix-ai-output__body');
  await expect(body).not.toHaveAttribute('data-streaming');
  // five words in: no finished sentence yet, so nothing shows
  await expect(body).toHaveText('');
  await page.clock.runFor(4000);
  // past the first full stop: exactly the first sentence
  await expect(body).toHaveText('The VPN gateway in Sarajevo timed out for about 40 remote users after the certificate rotation.');
  await page.clock.runFor(6000);
  await expect(body).toHaveText(REPLY);
});

const DEMO = '/tests/ai-assistance/demo.html';

test('the docs demo logs the first shown events (its listener is in before the pieces mount)', async ({ page }, testInfo) => {
  await page.goto(`${DEMO}?theme=${themeOf(testInfo)}`, { waitUntil: 'networkidle' });
  const log = page.getByRole('region', { name: 'uix-proposal events' });
  await expect(log).toContainText('shown · field · demo-INC-1042-category');
  await expect(log).toContainText('shown · suggestion · demo-INC-1042-assign · medium');
  await expect(log).toContainText('shown · proposal · demo-INC-1042-resolve-1 · high');
});

test('the docs demo: Stop during the fake model’s reading pause stops it for good', async ({ page }, testInfo) => {
  await page.clock.install();
  await page.goto(`${DEMO}?theme=${themeOf(testInfo)}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Summarise INC-1042' }).click();
  await page.clock.runFor(300); // still "Reading 12 work notes"
  await page.getByRole('button', { name: 'Stop' }).click();
  await page.clock.runFor(20000);
  const card = page.locator('.uix-ai-output');
  await expect(card).toHaveAttribute('data-status', 'stopped');
  await expect(page.locator('.uix-ai-output__body')).toHaveText('');
  // Retry starts one clean run that finishes
  await page.getByRole('button', { name: 'Retry' }).click();
  await page.clock.runFor(20000);
  await expect(card).toHaveAttribute('data-status', 'done');
});
