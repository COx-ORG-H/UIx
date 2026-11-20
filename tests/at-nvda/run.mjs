/* NVDA + Playwright's chromium (headed), driven by Guidepup, over the AT-evidence harness
 * (tests/at-evidence/harness.html). Windows only; CI runs it in .github/workflows/at-nvda.yml on a
 * windows-latest runner after `@guidepup/setup install nvda` has put a portable NVDA there.
 *
 * What it proves: the words NVDA actually spoke for each step, captured from NVDA itself (not
 * from the DOM), written to tests/at-nvda/out/nvda-transcript.{json,md}. It is a real NVDA run,
 * but an automated one: Guidepup sends the keys, nobody listens. The results files record it as
 * "NVDA (Guidepup, automated)" with the browser the transcript names, never as a human pass.
 *
 * It fails (exit 1) when a segment's keys did not act, when NVDA did not say what the segment
 * expects (or said a toast more than once), or when a known gap is now heard (see `steps`): an
 * empty or stale transcript must not pass.
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
 * (`arrival`); the log is then cleared, so only what the keys made NVDA say counts. The keys run in
 * segments, and each segment is judged on the speech it alone produced. Every key goes through
 * NVDA as a user would press it (`wait:` lets a debounce or a live region settle, `type:` types).
 * Per segment, all on what happened after its keys:
 *   - `acted`, run in the page: the keys did what the script says (focus moved to 19 November, the
 *     active option changed), so a key that was swallowed fails the run;
 *   - `speak`: phrases NVDA must have said; a miss fails the run;
 *   - `once`: phrases NVDA must have said exactly once (a toast spoken twice fails);
 *   - `gaps`: phrases NVDA should say but did not in run 44725485902, each a known issue in
 *     Docs/a11y/results/. A gap is reported, not failed on; a gap that is now heard fails the run
 *     too, so the result file gets updated instead of going stale. */
/** `acted` runs in the page, so it cannot close over anything here. `active: [input, test, text]`
 * is the one shared check, passed as data: the input's aria-activedescendant option text
 * `startsWith` / `equals` / `includes` the text. */
const activeOption = ([selector, test, text]) => {
  const input = document.querySelector(selector);
  const label = document.getElementById(input?.getAttribute('aria-activedescendant') ?? '')?.textContent ?? '';
  return test === 'equals' ? label === text : test === 'includes' ? label.includes(text) : label.startsWith(text);
};
const steps = [
  { id: 'data-workspace', title: 'DataWorkspace: the first row, ArrowDown, Tab to its checkbox, Space',
    focus: '#workspace tbody tr[tabindex="0"]', segments: [
      { keys: ['ArrowDown'], acted: () => document.activeElement === document.querySelector('#workspace tbody tr:nth-child(2)'),
        gaps: [{ phrase: /VPN drops every hour/, issue: 'a focused row is spoken as "row", without its cells' }] },
      { keys: ['Tab', 'Space'], acted: () => document.querySelector('#workspace tbody tr:nth-child(2) input[type="checkbox"]')?.checked === true,
        speak: [/Select INC-1002/, /(?<!not )\bchecked\b/] },
    ] },
  { id: 'data-workspace-sort', title: 'DataWorkspace: Enter on the Priority header button',
    focus: '#workspace th:nth-child(4) button', segments: [
      { keys: ['Enter', 'wait:500'], acted: () => document.querySelector('#workspace th:nth-child(4)')?.getAttribute('aria-sort') === 'ascending',
        speak: [/sorted ascending/] },
    ] },
  { id: 'command-palette', title: 'CommandPalette (in place): type "rep", clear it, ArrowDown',
    focus: '#palette-inline input', segments: [
      { keys: ['type:rep', 'wait:800'], active: ['#palette-inline input', 'startsWith', 'Reports'], speak: [/\b1 result\b/] },
      { keys: ['Backspace', 'Backspace', 'Backspace', 'wait:800'], active: ['#palette-inline input', 'startsWith', 'Create incident'],
        speak: [/\b6 results\b/] },
      { keys: ['ArrowDown'], active: ['#palette-inline input', 'startsWith', 'Assign to me'], speak: [/Assign to me/] },
    ] },
  { id: 'combobox', title: 'Combobox: Category, ArrowDown twice, Enter',
    focus: '#combobox input', segments: [
      { keys: ['ArrowDown'], active: ['#combobox input', 'equals', 'Printer'], speak: [/Printer/] },
      { keys: ['ArrowDown'], active: ['#combobox input', 'equals', 'Email'],
        gaps: [{ phrase: /Email/, issue: 'moving into the next group speaks the group ("SOFTWARE, grouping"), not the option' }] },
      { keys: ['Enter'], acted: () => document.querySelector('#combobox input')?.value === 'Email', speak: [/Category, combo box/, /Email/] },
    ] },
  { id: 'entity-picker', title: 'EntityPicker: Assignee, type "am", ArrowDown, Enter',
    focus: '#entity-input', segments: [
      { keys: ['type:am', 'wait:1200'], acted: () => !!document.querySelector('#entity [role="option"]'),
        gaps: [{ phrase: /\b1 results?\b/, issue: 'the result count is not spoken' }] },
      { keys: ['ArrowDown'], active: ['#entity-input', 'includes', 'Amra Kovač'],
        gaps: [{ phrase: /Amra Kovač/, issue: 'ArrowDown speaks the list ("Assignee. Search, list"), not the option' }] },
      { keys: ['Enter'], acted: () => !!document.querySelector('#entity button[aria-label="Clear Amra Kovač"]'), speak: [/Amra Kovač/] },
    ] },
  { id: 'date-picker', title: 'DatePicker: Due date, ArrowDown opens the calendar, ArrowLeft, Escape',
    focus: '#date-input', segments: [
      { keys: ['ArrowDown', 'wait:400'], acted: () => document.activeElement?.getAttribute('data-date') === '2026-11-20', speak: [/Calendar, dialog/] },
      { keys: ['ArrowLeft'], acted: () => document.activeElement?.getAttribute('data-date') === '2026-11-19',
        gaps: [{ phrase: /19 November 2026/, issue: 'the focused calendar day is spoken without its date' }] },
      { keys: ['Escape'], acted: () => document.activeElement?.id === 'date-input' && document.getElementById('date-input')?.value === '20/11/2026',
        speak: [/Due date/] },
    ] },
  { id: 'diff-viewer', title: 'DiffViewer: "Accept incoming for $.priority", Enter',
    focus: '#diff button[aria-label^="Accept incoming"]', segments: [
      { keys: ['Enter', 'wait:800'], acted: () => document.querySelector('#diff button[aria-label^="Accept incoming"]')?.getAttribute('aria-pressed') === 'true',
        speak: [/1 of 3 differences resolved/], gaps: [{ phrase: /(^|[ ,])pressed\b(?<!not pressed)/, issue: 'the new pressed state is not spoken' }] },
    ] },
  { id: 'toast-polite', title: 'Toast: Enter on "Show success toast", wait',
    focus: '#toast-polite', segments: [
      { keys: ['Enter', 'wait:2000'], acted: () => document.querySelectorAll('.uix-toaster .uix-toast--success').length === 1,
        once: [/Incident INC-1002 saved/g] },
    ] },
  { id: 'toast-assertive', title: 'Toast: Enter on "Show error toast", wait',
    focus: '#toast-assertive', segments: [
      { keys: ['Enter', 'wait:2000'], acted: () => document.querySelectorAll('.uix-toaster [role="alert"]').length === 1,
        once: [/Could not save INC-1002/g] },
    ] },
];

/** Judge one segment's speech. */
function judge(segment, spoken, acted) {
  const heard = (re) => spoken.some((phrase) => new RegExp(re.source, re.flags.replace('g', '')).test(phrase));
  const missing = (segment.speak ?? []).filter((re) => !heard(re)).map(String);
  const counts = (segment.once ?? []).map((re) => ({ phrase: String(re), times: spoken.reduce((n, phrase) => n + (phrase.match(re)?.length ?? 0), 0) }));
  const notOnce = counts.filter(({ times }) => times !== 1);
  const gaps = (segment.gaps ?? []).map(({ phrase, issue }) => ({ issue, heard: heard(phrase) }));
  const ok = acted && !missing.length && !notOnce.length && !gaps.some((gap) => gap.heard);
  return { keys: segment.keys, spoken, acted, missing, counts, gaps, ok };
}

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
      try {
      await page.locator(step.focus).first().focus();
      await delay(300);
      await nvda.clearSpokenPhraseLog();
      await nvda.perform(NVDAKeyCodeCommands.reportCurrentFocus);
      const arrival = await nvda.lastSpokenPhrase();
      const segments = [];
      for (const segment of step.segments) {
        await nvda.clearSpokenPhraseLog();
        for (const key of segment.keys) {
          if (key.startsWith('type:')) await nvda.type(key.slice(5));
          else if (key.startsWith('wait:')) await delay(Number(key.slice(5)));
          else await nvda.press(key);
          await delay(250);
        }
        const spoken = [...await nvda.spokenPhraseLog()].filter((phrase) => phrase.trim());
        const acted = segment.active ? await page.evaluate(activeOption, segment.active) : await page.evaluate(segment.acted);
        segments.push(judge(segment, spoken, acted));
      }
      results.push({ id: step.id, title: step.title, arrival, segments, ok: segments.every((s) => s.ok) });
      } catch (error) {
        // One step's crash is recorded and fails the run; the others still run and are kept.
        results.push({ id: step.id, title: step.title, arrival: '', segments: [], ok: false, error: String(error?.message ?? error) });
      }
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
    md.push(`## ${r.id} — ${r.ok ? 'ok' : 'FAILED'}`, '', r.title, '', `- on arrival: ${JSON.stringify(r.arrival)}`);
    if (r.error) md.push(`- error: ${r.error}`);
    for (const s of r.segments) {
      const verdict = !s.acted ? 'KEYS DID NOT ACT' : s.missing.length ? 'MISSING SPEECH' : s.counts.some((c) => c.times !== 1) ? 'NOT SPOKEN EXACTLY ONCE'
        : s.gaps.some((g) => g.heard) ? 'KNOWN GAP NOW HEARD: update the result file' : s.gaps.length ? 'ok, known gap' : 'ok';
      md.push(`- **${s.keys.filter((k) => !k.startsWith('wait:')).join(', ')}** (${verdict}): ${s.spoken.map((p) => JSON.stringify(p)).join(' / ') || '(nothing)'}`);
      if (s.missing.length) md.push(`  - not heard: ${s.missing.join(', ')}`);
      for (const c of s.counts) md.push(`  - ${c.phrase} spoken ${c.times} time(s)`);
      for (const g of s.gaps) md.push(`  - known gap: ${g.issue}${g.heard ? ' (now heard)' : ''}`);
    }
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
