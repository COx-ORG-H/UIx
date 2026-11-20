/* Assistive-technology status per component (Carbon's status tags, GOV.UK's known issues), shown on
 * the Accessibility page. One row per result file in Docs/a11y/results/; tests/a11y-results.test.mjs
 * fails when a row and its file's header disagree, so this table cannot claim a run the repository
 * has no record of. Verdicts: pass | fail | na | not-run (Docs/a11y/manual-sr-protocol.md §1). */

/** The pairings of protocol 2, in the order of the result header. */
export const AT_PAIRINGS = [
  { key: 'nvda-chrome', label: 'NVDA + Chrome', tier: 'T1' },
  { key: 'jaws-chrome', label: 'JAWS + Chrome', tier: 'T1' },
  { key: 'jaws-edge', label: 'JAWS + Edge', tier: 'T2' },
  { key: 'voiceover-safari', label: 'VoiceOver + Safari (macOS)', tier: 'T2' },
  { key: 'voiceover-ios', label: 'VoiceOver (iOS)', tier: 'T2' },
  { key: 'talkback-chrome', label: 'TalkBack + Chrome', tier: 'T2' },
  { key: 'nvda-firefox', label: 'NVDA + Firefox', tier: 'T3' },
  { key: 'narrator-edge', label: 'Narrator + Edge', tier: 'T3' },
];

/** The automated evidence, never counted as a pairing. */
export const AT_AUTOMATED = [
  { key: 'automated-tree', label: 'Accessibility tree (Playwright, Chromium)' },
  { key: 'nvda-guidepup', label: 'NVDA speech capture (Guidepup, CI)' },
];

const notRun = Object.fromEntries(AT_PAIRINGS.map(({ key }) => [key, 'not-run']));

export const AT_STATUS = [
  {
    id: 'button', name: 'Button', protocol: 1, version: '2.6.0', date: '2026-07-03', tester: 'Haris',
    results: { 'nvda-firefox': 'pass', 'jaws-chrome': 'pass', 'voiceover-safari': 'not-run' },
    knownIssues: ['VoiceOver + Safari not run.', 'Recorded under protocol 1 as its worked example; NVDA + Chrome (now T1) not run.'],
  },
  {
    id: 'data-workspace', name: 'DataWorkspace', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'fail' },
    knownIssues: [
      'NVDA (automated) announces a focused row as "row" with none of its cells.',
      'Selecting rows does not announce the count: "N selected" in the bulk toolbar is not a live region.',
      'A focused row is named by all its cells, the ID three times ("Select INC-1001 INC-1001 Open INC-1001 …"): verbosity to judge by ear.',
      'Whether readers speak the aria-sort change while focus stays on the header button is unverified.',
    ],
  },
  {
    id: 'command-palette', name: 'CommandPalette', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'pass' },
    knownIssues: ['Active-option speech through aria-activedescendant is unverified on VoiceOver macOS.'],
  },
  {
    id: 'combobox', name: 'Combobox, EntityPicker', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'fail' },
    knownIssues: [
      'EntityPicker, NVDA (automated): ArrowDown spoke the list ("Assignee. Search, list"), not the option; the result count was not spoken.',
      'Combobox clears its text on re-focus (it opens with the full list); the chosen option is active and selected, but the field reads blank.',
      'EntityPicker says "1 results": its count is not plural-aware yet.',
    ],
  },
  {
    id: 'date-picker', name: 'DatePicker', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'fail' },
    knownIssues: [
      'NVDA (automated): the focused day in the calendar is spoken as "toggle button, not pressed", without its date.',
      'Today is aria-current="date"; whether readers say so is unverified.',
    ],
  },
  {
    id: 'diff-viewer', name: 'DiffViewer', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'fail' },
    knownIssues: [
      'NVDA (automated): the new pressed state after Enter on a resolution button is not spoken; the progress line is.',
      'Each conflict adds three named regions (Base, Current, Incoming value), so the landmark list grows with the conflicts: to judge by ear.',
    ],
  },
  {
    id: 'toast', name: 'Toast and live regions', protocol: 2, version: '2.70.0', date: '2026-11-20', tester: 'none',
    results: { ...notRun, 'automated-tree': 'pass', 'nvda-guidepup': 'pass' },
    knownIssues: ['Fixed after 2.70.0 (#302): in a React StrictMode (development) build a polite toast was spoken twice.'],
  },
];
