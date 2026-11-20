/* NVDA + Playwright's chromium (headed), driven by Guidepup, over the AT-evidence harness
 * (tests/at-evidence/harness.html). Windows only; CI runs it in .github/workflows/at-nvda.yml on a
 * windows-latest runner after `@guidepup/setup install nvda` has put a portable NVDA there.
 *
 * What it proves: the words NVDA actually spoke for each step, captured from NVDA itself (not
 * from the DOM), written to tests/at-nvda/out/nvda-transcript.{json,md}. It is a real NVDA run,
 * but an automated one: Guidepup sends the keys, nobody listens. The results files record it as
 * "NVDA (Guidepup, automated)" with the browser the transcript names, never as a human pass.
 *
 * It fails (exit 1) when a step's keys did not act, when NVDA did not say what the step expects, or
 * when a known gap is now heard (see `steps`): an empty or stale transcript must not pass.
 *
 *   npm i --no-save @guidepup/guidepup@0.40.0
 *   npx @guidepup/setup@0.29.3 setup --ci && npx @guidepup/setup@0.29.3 install nvda
 *   node tests/at-evidence/build.mjs && npx serve -l 4178 .   (in another shell)
 *   node tests/at-nvda/run.mjs
 *
 * The move-to-web-content steps follow @guidepup/playwright's navigateNVDAtoWebContent (MIT),
 * inlined because that package needs @playwright/test >= 1.62.1 and the kit pins 1.61. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import guidepup from '@guidepup/guidepup';

const { nvda, NVDAKeyCodeCommands, WindowsKeyCodes, WindowsModifiers } = guidepup;
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
const URL = process.env.AT_HARNESS_URL ?? 'http://localhost:4178/tests/at-evidence/harness.html';
// The window title NVDA reports for Playwright's chromium (as @guidepup/playwright names it); only
// used to find the window. The transcript records the launched executable itself.
const APP = 'Google Chrome For Testing';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function focusBrowser(pageTitle) {
  for (let attempt = 0; attempt <= 10; attempt++) {
    await nvda.perform(NVDAKeyCodeCommands.reportTitle);
    const title = clean(await nvda.lastSpokenPhrase());
    if ((pageTitle && title.startsWith(clean(pageTitle))) || title.includes(clean(APP))) return;
    await nvda.perform({ keyCode: [WindowsKeyCodes.Escape], modifiers: [WindowsModifiers.Alt] }, { capture: false });
    await delay(500);
  }
  throw new Error(`NVDA never reached the "${pageTitle}" window.`);
}

async function toWebContent(page) {
  await nvda.perform(NVDAKeyCodeCommands.exitFocusMode, { capture: false });
  await delay(100);
  await focusBrowser(await page.title());
  await page.bringToFront();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await nvda.perform(NVDAKeyCodeCommands.readNextFocusableItem, { capture: false });
  await delay(100);
  await nvda.perform(NVDAKeyCodeCommands.toggleBetweenBrowseAndFocusMode, { capture: false });
  await delay(100);
  await nvda.perform(NVDAKeyCodeCommands.toggleBetweenBrowseAndFocusMode, { capture: false });
  await delay(100);
  await nvda.perform(NVDAKeyCodeCommands.exitFocusMode, { capture: false });
  await nvda.clearSpokenPhraseLog();
}

/** One scripted step. Playwright puts DOM focus on the widget and NVDA reports what it landed on
 * (`arrival`); the log is then cleared, so only what the keys made NVDA say counts. Every key goes
 * through NVDA as a user would press it (`wait:` lets a debounce or a live region settle, `type:`
 * types characters). Three checks, all on what happened after the keys:
 *   - `acted`, run in the page: the keys did what the script says (a box checked, a value chosen),
 *     so a step whose navigation silently did nothing fails;
 *   - `speak`: phrases NVDA must have said; a miss fails the run;
 *   - `gap`: a phrase NVDA should say but did not in run 44725485902, recorded as a known issue in
 *     Docs/a11y/results/. A gap is reported, not failed on; a gap that is now heard fails the run
 *     too, so the result file gets updated instead of going stale. */
const steps = [
  { id: 'data-workspace', title: 'DataWorkspace: the first row, ArrowDown, Tab to its checkbox, Space',
    focus: '#workspace tbody tr[tabindex="0"]', keys: ['ArrowDown', 'Tab', 'Space'],
    acted: () => document.querySelector('#workspace tbody tr:nth-child(2) input[type="checkbox"]')?.checked === true,
    speak: [/Select INC-1002/, /(?<!not )\bchecked\b/], gap: { phrase: /VPN drops every hour/, issue: 'a focused row is spoken as "row", without its cells' } },
  { id: 'data-workspace-sort', title: 'DataWorkspace: Enter on the Priority header button',
    focus: '#workspace th:nth-child(4) button', keys: ['Enter', 'wait:500'],
    acted: () => document.querySelector('#workspace th:nth-child(4)')?.getAttribute('aria-sort') === 'ascending',
    speak: [/sorted ascending/] },
  { id: 'command-palette', title: 'CommandPalette (in place): the field, type "rep", ArrowDown',
    focus: '#palette-inline input', keys: ['type:rep', 'wait:800', 'ArrowDown'],
    acted: () => {
      const input = document.querySelector('#palette-inline input');
      return (document.getElementById(input?.getAttribute('aria-activedescendant') ?? '')?.textContent ?? '').startsWith('Reports');
    },
    speak: [/\b1 result\b/] },
  { id: 'combobox', title: 'Combobox: Category, ArrowDown twice, Enter',
    focus: '#combobox input', keys: ['ArrowDown', 'ArrowDown', 'Enter'],
    acted: () => document.querySelector('#combobox input')?.value === 'Email',
    speak: [/Printer/, /Category, combo box/, /Email/] },
  { id: 'entity-picker', title: 'EntityPicker: Assignee, type "am", ArrowDown, Enter',
    focus: '#entity-input', keys: ['type:am', 'wait:1200', 'ArrowDown', 'Enter'],
    acted: () => !!document.querySelector('#entity button[aria-label="Clear Amra Kovač"]'),
    speak: [/Amra Kovač/], gap: { phrase: /\b1 results?\b/, issue: 'the result count is not spoken, and ArrowDown speaks the list, not the option' } },
  { id: 'date-picker', title: 'DatePicker: Due date, ArrowDown opens the calendar, ArrowLeft, Escape',
    focus: '#date-input', keys: ['ArrowDown', 'wait:400', 'ArrowLeft', 'Escape'],
    acted: () => document.activeElement?.id === 'date-input' && document.getElementById('date-input')?.value === '20/11/2026',
    speak: [/Calendar, dialog/, /Due date/], gap: { phrase: /19 November 2026/, issue: 'the focused calendar day is spoken without its date' } },
  { id: 'diff-viewer', title: 'DiffViewer: "Accept incoming for $.priority", Enter',
    focus: '#diff button[aria-label^="Accept incoming"]', keys: ['Enter', 'wait:800'],
    acted: () => document.querySelector('#diff button[aria-label^="Accept incoming"]')?.getAttribute('aria-pressed') === 'true',
    speak: [/1 of 3 differences resolved/], gap: { phrase: /(^|[ ,])pressed\b(?<!not pressed)/, issue: 'the new pressed state is not spoken' } },
  { id: 'toast-polite', title: 'Toast: Enter on "Show success toast", wait',
    focus: '#toast-polite', keys: ['Enter', 'wait:2000'],
    acted: () => document.querySelectorAll('.uix-toaster .uix-toast--success').length === 1,
    speak: [/Incident INC-1002 saved/] },
  { id: 'toast-assertive', title: 'Toast: Enter on "Show error toast", wait',
    focus: '#toast-assertive', keys: ['Enter', 'wait:2000'],
    acted: () => document.querySelectorAll('.uix-toaster [role="alert"]').length === 1,
    speak: [/Could not save INC-1002/] },
];

async function run() {
  mkdirSync(OUT, { recursive: true });
  const results = [];
  let browser;
  let browserMeta = {};
  await nvda.start();
  try {
    browser = await chromium.launch({ headless: false, args: ['--start-maximized', '--force-renderer-accessibility'] });
    // What was actually launched, so a transcript never names a browser it did not run.
    browserMeta = { browser: `Playwright chromium ${browser.version()}`, executable: chromium.executablePath() };
    const page = await browser.newPage({ viewport: null });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    await toWebContent(page);
    for (const step of steps) {
      await page.locator(step.focus).first().focus();
      await delay(300);
      await nvda.clearSpokenPhraseLog();
      await nvda.perform(NVDAKeyCodeCommands.reportCurrentFocus);
      const arrival = await nvda.lastSpokenPhrase();
      await nvda.clearSpokenPhraseLog();
      for (const key of step.keys) {
        if (key.startsWith('type:')) await nvda.type(key.slice(5));
        else if (key.startsWith('wait:')) await delay(Number(key.slice(5)));
        else await nvda.press(key);
        await delay(250);
      }
      const spoken = [...await nvda.spokenPhraseLog()].filter((phrase) => phrase.trim());
      const heard = (re) => spoken.some((phrase) => re.test(phrase));
      const acted = await page.evaluate(step.acted);
      const missing = step.speak.filter((re) => !heard(re)).map(String);
      const gap = step.gap ? { issue: step.gap.issue, heard: heard(step.gap.phrase) } : null;
      const ok = acted && missing.length === 0 && !gap?.heard;
      results.push({ id: step.id, title: step.title, arrival, spoken, acted, missing, gap, ok });
      await page.keyboard.press('Escape').catch(() => {});
    }
  } finally {
    await browser?.close().catch(() => {});
    await nvda.stop().catch(() => {});
  }
  const meta = { date: new Date().toISOString(), runner: process.env.RUNNER_NAME ?? 'local', at: 'NVDA (Guidepup portable build)', ...browserMeta, url: URL };
  writeFileSync(join(OUT, 'nvda-transcript.json'), JSON.stringify({ meta, results }, null, 2));
  const md = [`# NVDA transcript (automated, Guidepup)`, '', `- date: ${meta.date}`, `- runner: ${meta.runner}`, `- AT: ${meta.at}`, `- browser: ${meta.browser}`, `- executable: ${meta.executable}`, ''];
  for (const r of results) {
    const verdict = !r.acted ? 'KEYS DID NOT ACT' : r.missing.length ? 'MISSING SPEECH' : r.gap?.heard ? 'KNOWN GAP NOW HEARD: update the result file' : r.gap ? 'ok, known gap' : 'ok';
    md.push(`## ${r.id} — ${verdict}`, '', r.title, '', `- on arrival: ${JSON.stringify(r.arrival)}`, ...r.spoken.map((phrase) => `- ${JSON.stringify(phrase)}`));
    if (r.missing.length) md.push(`- not heard: ${r.missing.join(', ')}`);
    if (r.gap) md.push(`- known gap: ${r.gap.issue}${r.gap.heard ? ' (now heard)' : ''}`);
    md.push('');
  }
  writeFileSync(join(OUT, 'nvda-transcript.md'), md.join('\n'));
  console.log(md.join('\n'));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error(`NVDA evidence incomplete: ${failed.map((r) => r.id).join(', ')}`);
    process.exit(1);
  }
}

await run();
