/* Screenshots and a recording of the task tray for an operator review (the UIx verification bar).
 *   node tests/task-tray/build.mjs && node tests/task-tray/frames.mjs <base-url> <out-dir>
 * base-url: a static server at the repository root (npm run serve:styleguide), e.g. http://localhost:4178.
 * Writes <scene>-<width>-<theme>[-<flag>].png for every scene, width and theme, and live-<theme>.webm,
 * a recording of jobs starting, stacking, finishing, failing and the panel opening and closing. */
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'http://localhost:4178', out = 'task-tray-frames'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const url = (q) => `${base}/tests/task-tray/harness.html?${q}`;
const browser = await chromium.launch();

async function shot(name, query, { width = 1280, height = 800, theme = 'light', reduced = false, contrast = false, forced = false } = {}) {
  const page = await browser.newPage({
    viewport: { width, height }, colorScheme: theme,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    contrast: contrast ? 'more' : 'no-preference',
    forcedColors: forced ? 'active' : 'none',
  });
  await page.goto(url(`${query}&theme=${theme}`));
  await page.waitForSelector('.uix-task-tray__pill');
  await page.waitForTimeout(700); // the arrival transitions settle
  await page.screenshot({ path: join(out, `${name}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) console.warn(`! ${name}: the page scrolls sideways`);
  await page.close();
}

for (const theme of ['light', 'dark']) {
  for (const width of [320, 390, 768, 1280, 1920]) {
    await shot(`five-open-${width}-${theme}`, 'scene=five&open=1', { width, theme });
  }
  await shot(`one-closed-1280-${theme}`, 'scene=one', { theme });
  await shot(`one-open-1280-${theme}`, 'scene=one&open=1', { theme });
  await shot(`five-closed-1280-${theme}`, 'scene=five', { theme });
  await shot(`long-open-390-${theme}`, 'scene=long&open=1', { width: 390, theme });
  await shot(`long-open-1280-${theme}`, 'scene=long&open=1', { theme });
  await shot(`failure-open-1280-${theme}`, 'scene=failure&open=1', { theme });
  await shot(`done-closed-1280-${theme}`, 'scene=done', { theme });
  await shot(`five-open-1280-${theme}-contrast`, 'scene=five&open=1', { theme, contrast: true });
}
await shot('five-open-1280-light-forced', 'scene=five&open=1', { forced: true });
await shot('five-open-1280-light-reduced', 'scene=five&open=1', { reduced: true });

// focus ring on the pill and on a row action, from the keyboard
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url('scene=five&theme=light'));
  await page.waitForSelector('.uix-task-tray__pill');
  await page.locator('.uix-task-tray__pill').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, 'five-open-1280-light-focus.png') });
  await page.close();
}

// the recording: live jobs, the panel opening and closing, a failure and a retry
for (const [theme, reduced] of [['light', false], ['dark', false], ['light', true]]) {
  const dir = join(out, 'video-tmp');
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }, colorScheme: theme, reducedMotion: reduced ? 'reduce' : 'no-preference',
    recordVideo: { dir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  await page.goto(url(`scene=live&theme=${theme}`));
  await page.waitForSelector('#start-export');
  await page.waitForTimeout(600);
  await page.click('#start-export');
  await page.waitForTimeout(1200);
  await page.click('#start-discovery');
  await page.waitForTimeout(900);
  await page.click('#start-bulk');
  await page.waitForTimeout(900);
  await page.click('.uix-task-tray__pill');
  await page.waitForTimeout(2600);
  await page.locator('.uix-task-tray__btn--action', { hasText: 'Retry' }).click().catch(() => {});
  await page.waitForTimeout(3200);
  await page.click('.uix-task-tray__pill');
  await page.waitForTimeout(1500);
  await page.click('.uix-task-tray__pill');
  await page.waitForTimeout(2500);
  const cancel = page.locator('.uix-task-tray__task[data-status="running"] .uix-task-tray__btn', { hasText: 'Cancel' }).first();
  if (await cancel.count()) await cancel.click();
  await page.waitForTimeout(1500);
  await page.click('.uix-task-tray__btn >> text=Clear finished').catch(() => {});
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);
  await context.close();
  const [file] = readdirSync(dir);
  renameSync(join(dir, file), join(out, `live-${theme}${reduced ? '-reduced' : ''}.webm`));
}

await browser.close();
console.log(out);
