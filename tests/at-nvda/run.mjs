/* NVDA + Chrome for Testing, driven by Guidepup, over the AT-evidence harness
 * (tests/at-evidence/harness.html). Windows only; CI runs it in .github/workflows/at-nvda.yml on a
 * windows-latest runner after `npx @guidepup/setup` has put a portable NVDA there.
 *
 * What it proves: the words NVDA actually spoke for each step, captured from NVDA itself (not
 * from the DOM), written to tests/at-nvda/out/nvda-transcript.{json,md}. It is a real NVDA run,
 * but an automated one: Guidepup sends the keys, nobody listens. The results files record it as
 * "NVDA (Guidepup) + Chrome for Testing, automated" and never as a human pass.
 *
 * It fails (exit 1) when NVDA spoke nothing at all, or when a toast's text never reached speech:
 * an empty transcript must not pass as evidence.
 *
 *   npm i --no-save @guidepup/guidepup@0.40.0 && npx @guidepup/setup@0.29.3
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

/** One scripted step: Playwright puts DOM focus on the widget, NVDA reports what it landed on,
 * then every key goes through NVDA as a user would press it. `wait:` lets a debounce or a live
 * region settle; `type:` types characters. */
const steps = [
  { id: 'data-workspace', title: 'DataWorkspace: the first row, ArrowDown, Tab to its checkbox, Space',
    focus: '#workspace tbody tr[tabindex="0"]', keys: ['ArrowDown', 'Tab', 'Space'] },
  { id: 'data-workspace-sort', title: 'DataWorkspace: Enter on the Priority header button',
    focus: '#workspace th:nth-child(4) button', keys: ['Enter', 'wait:500'] },
  { id: 'command-palette', title: 'CommandPalette (in place): the field, type "rep", ArrowDown',
    focus: '#palette-inline input', keys: ['type:rep', 'wait:800', 'ArrowDown'] },
  { id: 'combobox', title: 'Combobox: Category, ArrowDown twice, Enter',
    focus: '#combobox input', keys: ['ArrowDown', 'ArrowDown', 'Enter'] },
  { id: 'entity-picker', title: 'EntityPicker: Assignee, type "am", ArrowDown, Enter',
    focus: '#entity-input', keys: ['type:am', 'wait:1200', 'ArrowDown', 'Enter'] },
  { id: 'date-picker', title: 'DatePicker: Due date, ArrowDown opens the calendar, ArrowLeft, Escape',
    focus: '#date-input', keys: ['ArrowDown', 'wait:400', 'ArrowLeft', 'Escape'] },
  { id: 'diff-viewer', title: 'DiffViewer: "Accept incoming for $.priority", Enter',
    focus: '#diff button[aria-label^="Accept incoming"]', keys: ['Enter', 'wait:800'] },
  { id: 'toast-polite', title: 'Toast: Enter on "Show success toast", wait',
    focus: '#toast-polite', keys: ['Enter', 'wait:2000'], mustSpeak: 'Incident INC-1002 saved' },
  { id: 'toast-assertive', title: 'Toast: Enter on "Show error toast", wait',
    focus: '#toast-assertive', keys: ['Enter', 'wait:2000'], mustSpeak: 'Could not save INC-1002' },
];

async function run() {
  mkdirSync(OUT, { recursive: true });
  const results = [];
  let browser;
  await nvda.start();
  try {
    browser = await chromium.launch({ headless: false, args: ['--start-maximized', '--force-renderer-accessibility'] });
    const page = await browser.newPage({ viewport: null });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    await toWebContent(page);
    for (const step of steps) {
      await nvda.clearSpokenPhraseLog();
      await page.locator(step.focus).first().focus();
      await delay(300);
      await nvda.perform(NVDAKeyCodeCommands.reportCurrentFocus);
      const arrival = await nvda.lastSpokenPhrase();
      for (const key of step.keys) {
        if (key.startsWith('type:')) await nvda.type(key.slice(5));
        else if (key.startsWith('wait:')) await delay(Number(key.slice(5)));
        else await nvda.press(key);
        await delay(250);
      }
      const spoken = [...await nvda.spokenPhraseLog()];
      const ok = step.mustSpeak ? spoken.some((phrase) => phrase.includes(step.mustSpeak)) : spoken.length > 0;
      results.push({ id: step.id, title: step.title, arrival, spoken, ok, mustSpeak: step.mustSpeak ?? null });
      await page.keyboard.press('Escape').catch(() => {});
    }
  } finally {
    await browser?.close().catch(() => {});
    await nvda.stop().catch(() => {});
  }
  const meta = { date: new Date().toISOString(), runner: process.env.RUNNER_NAME ?? 'local', at: 'NVDA (Guidepup portable build)', browser: APP, url: URL };
  writeFileSync(join(OUT, 'nvda-transcript.json'), JSON.stringify({ meta, results }, null, 2));
  const md = [`# NVDA transcript (automated, Guidepup)`, '', `- date: ${meta.date}`, `- runner: ${meta.runner}`, `- AT: ${meta.at}`, `- browser: ${meta.browser}`, ''];
  for (const r of results) {
    md.push(`## ${r.id} — ${r.ok ? 'spoke' : 'MISSING'}`, '', r.title, '', `- on arrival: ${JSON.stringify(r.arrival)}`, ...r.spoken.map((s) => `- ${JSON.stringify(s)}`), '');
  }
  writeFileSync(join(OUT, 'nvda-transcript.md'), md.join('\n'));
  console.log(md.join('\n'));
  const failed = results.filter((r) => !r.ok);
  if (!results.some((r) => r.spoken.length) || failed.length) {
    console.error(`NVDA evidence incomplete: ${failed.map((r) => r.id).join(', ') || 'nothing spoken at all'}`);
    process.exit(1);
  }
}

await run();
