// The UIx page rules (HAR-3874): every rule fires on its shape and stays quiet
// on the allowed one, and the gate fails closed: a new finding, paid debt left in
// the baseline, a stale exemption, a missing config and an empty walk all exit
// non-zero. Pure strings for the rules; a temp product tree for the CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  COUNTED_RULES,
  isHandBuiltPill,
  RULE_ARBITRARY_FONT_SIZE,
  RULE_BREAK_ANYWHERE,
  RULE_HEADING_TWICE,
  RULE_LIST_JOINED,
  RULE_RAW_BUTTON,
  RULE_RAW_FORM_CONTROL,
  RULE_RAW_TABLE,
  RULE_ROW_MENU_UNNAMED,
  RULE_SEVERITY_TONE,
  RULE_STALE_BASELINE,
  RULE_STALE_EXEMPTION,
  RULES,
  run,
  scanSource,
} from './index.mjs';

const rules = (rel, src, options) => scanSource(rel, src, options).map((f) => `${f.rule}@${f.line}`);
const only = (rel, src, rule, options) => scanSource(rel, src, options).filter((f) => f.rule === rule).map((f) => f.line);

test('every counted rule has a fix and a lesson, and the pill rule is held back', () => {
  for (const rule of COUNTED_RULES) {
    assert.ok(RULES[rule].fix.length > 40, rule);
    assert.match(RULES[rule].lesson, /^lessons\/1[23] /, rule);
  }
  assert.ok(!COUNTED_RULES.includes('no-hand-built-pill'));
  // The shape is recognised, so the rule can switch on once HAR-3817 is fixed.
  assert.equal(isHandBuiltPill('rounded-full px-2 text-xs'), true);
  assert.deepEqual(rules('a.tsx', '<span className="rounded-full px-2">x</span>'), []);
});

test('severity: a generic tone helper or a hand map that sends high to red', () => {
  assert.deepEqual(only('a.tsx', "const t = statusTone('severity', row.severity);", RULE_SEVERITY_TONE), [1]);
  assert.deepEqual(only('a.ts', "const tones = { critical: 'critical', high: 'danger', low: 'neutral' };", RULE_SEVERITY_TONE), [1]);
  assert.deepEqual(only('a.ts', 'const tones = { "High": "p1" };', RULE_SEVERITY_TONE), [1]);
  assert.deepEqual(only('a.tsx', "<StatusPill tone={s === 'high' ? 'danger' : 'neutral'} />", RULE_SEVERITY_TONE), [1]);
  assert.deepEqual(only('a.ts', "switch (s) { case 'high': return 'critical'; }", RULE_SEVERITY_TONE), [1]);
  // The ramp itself, other kinds through the helper, and high on amber are fine.
  assert.deepEqual(only('a.tsx', '<StatusPill tone={severityTone(row.severity)} />', RULE_SEVERITY_TONE), []);
  assert.deepEqual(only('a.tsx', "statusTone('incident_state', s)", RULE_SEVERITY_TONE), []);
  assert.deepEqual(only('a.ts', "const tones = { high: 'warning', thigh: 'danger' };", RULE_SEVERITY_TONE), []);
  // A priority matrix cell holds a label, not a tone.
  assert.deepEqual(only('a.ts', "const cells = { 'high:high': 'P1', 'high:medium': 'P2' };", RULE_SEVERITY_TONE), []);
  // The helper list is the product's.
  assert.deepEqual(only('a.ts', "toneOf('severity', s)", RULE_SEVERITY_TONE, { genericToneHelpers: ['toneOf'] }), [1]);
  assert.deepEqual(only('a.ts', "statusTone('severity', s)", RULE_SEVERITY_TONE, { genericToneHelpers: [] }), []);
  // CSS has no severity maps.
  assert.deepEqual(only('a.css', '.x { --high: danger; }', RULE_SEVERITY_TONE), []);
});

test('label-break-anywhere: classes, CSS and style objects; code type is exempt', () => {
  assert.deepEqual(only('a.tsx', '<span className="break-all">x</span>', RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.tsx', '<span className="[overflow-wrap:anywhere]">x</span>', RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.tsx', '<span className="wrap-anywhere">x</span>', RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.tsx', "<span style={{ overflowWrap: 'anywhere' }}>x</span>", RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.tsx', "<span style={{ wordBreak: 'break-all' }}>x</span>", RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.css', '.label {\n  overflow-wrap: anywhere;\n}', RULE_BREAK_ANYWHERE), [2]);
  assert.deepEqual(only('a.css', '.label { word-break: break-all; }', RULE_BREAK_ANYWHERE), [1]);
  assert.deepEqual(only('a.tsx', '<code className="break-all">{hash}</code>', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('a.tsx', '<span className="font-mono break-all">{hash}</span>', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('a.tsx', '<span className="break-words min-w-0">x</span>', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('a.tsx', '// break-all is banned here', RULE_BREAK_ANYWHERE), []);
});

test('an inline ignore needs the rule and a reason, and the kit-control rules take none', () => {
  const ignored = '// uix-page-rules-ignore label-break-anywhere: a 40-character token id\n<span className="break-all">{id}</span>';
  assert.deepEqual(only('a.tsx', ignored, RULE_BREAK_ANYWHERE), []);
  const noReason = '// uix-page-rules-ignore label-break-anywhere\n<span className="break-all">{id}</span>';
  assert.deepEqual(only('a.tsx', noReason, RULE_BREAK_ANYWHERE), [2]);
  const tensorTag = '<span className="break-all">{id}</span> {/* compliance-lint-ignore label-break-anywhere: token */}';
  assert.deepEqual(only('a.tsx', tensorTag, RULE_BREAK_ANYWHERE), []);
  const button = '// uix-page-rules-ignore no-raw-button: custom\n<button onClick={go}>Go</button>';
  assert.deepEqual(only('a.tsx', button, RULE_RAW_BUTTON), [2]);
});

test('heading-said-twice: the PageHeader title said again as a heading, title or caption', () => {
  const literal = [
    '<PageHeader title="Gruppen" />',
    '<Card title="Gruppen">',
    '<h2>Gruppen</h2>',
    '<Card title="Mitglieder">',
  ].join('\n');
  assert.deepEqual(only('p.tsx', literal, RULE_HEADING_TWICE), [2, 3]);
  const keyed = ["<PageHeader title={t('groups.title')} actions={<Button>Neu</Button>} />", "<Table caption={t('groups.title')} />"].join('\n');
  assert.deepEqual(only('p.tsx', keyed, RULE_HEADING_TWICE), [2]);
  assert.deepEqual(only('p.tsx', "<PageHeader title={t('a')} />\n<Table caption={t('b')} />", RULE_HEADING_TWICE), []);
  // next-intl: the same key under another component's namespace is another text.
  const twoNamespaces = [
    "const t = await getTranslations('admin.health');",
    "<PageHeader title={t('title')} />",
    "const t = await getTranslations('admin.health.service');",
    "<Card title={t('title')} />",
  ].join('\n');
  assert.deepEqual(only('p.tsx', twoNamespaces, RULE_HEADING_TWICE), []);
  const oneNamespace = ["const t = useTranslations({ namespace: 'groups' });", "<PageHeader title={t('title')} />", "<EmptyState title={t('title')} />"].join('\n');
  assert.deepEqual(only('p.tsx', oneNamespace, RULE_HEADING_TWICE), [3]);
  // The title prop inside the header is not a repeat; another component can be the title.
  assert.deepEqual(only('p.tsx', '<DetailPage title="Akte" />\n<h2>Akte</h2>', RULE_HEADING_TWICE), []);
  assert.deepEqual(only('p.tsx', '<DetailPage title="Akte" />\n<h2>Akte</h2>', RULE_HEADING_TWICE, { pageTitleComponents: ['DetailPage'] }), [2]);
  const fileLevel = '// uix-page-rules-ignore heading-said-twice: the print view repeats it on purpose\n<PageHeader title="X" />\n<h2>X</h2>';
  assert.deepEqual(only('p.tsx', fileLevel, RULE_HEADING_TWICE), []);
});

test('row-menu-unnamed: a ⋯ menu in a row whose labels do not name the row', () => {
  const unnamed = [
    'rowActions={(row) => (',
    '  <Menu label="Aktionen" trigger={<Button iconOnly aria-label="Aktionen" icon={<MoreIcon />} />}>',
    '    <MenuItem>Öffnen</MenuItem>',
    '  </Menu>',
    ')}',
  ].join('\n');
  assert.deepEqual(only('l.tsx', unnamed, RULE_ROW_MENU_UNNAMED), [2]);
  const named = unnamed.replace('aria-label="Aktionen"', 'aria-label={`Aktionen: ${row.title}`}');
  assert.deepEqual(only('l.tsx', named, RULE_ROW_MENU_UNNAMED), []);
  const keyOnly = "{ id: 'a', cell: ({ row }) => <ActionMenu label={t('row.actions')} /> }";
  assert.deepEqual(only('l.tsx', keyOnly, RULE_ROW_MENU_UNNAMED), [1]);
  const filled = "{ id: 'a', cell: ({ row }) => <ActionMenu label={t('row.actions', { title: row.original.title })} /> }";
  assert.deepEqual(only('l.tsx', filled, RULE_ROW_MENU_UNNAMED), []);
  // A page's own toolbar menu is not a row menu.
  assert.deepEqual(only('l.tsx', '<Menu label="Ansicht" trigger={<Button>Ansicht</Button>} />', RULE_ROW_MENU_UNNAMED), []);
});

test('list-joined-in-cell: a row list joined with ", "; the tooltip that holds the full list is fine', () => {
  assert.deepEqual(only('l.tsx', "render: (row) => row.roles.join(', '),", RULE_LIST_JOINED), [1]);
  assert.deepEqual(only('l.tsx', 'cell: ({ row }) => <span>{row.original.tags.join(", ")}</span>,', RULE_LIST_JOINED), [1]);
  assert.deepEqual(only('l.tsx', "<span title={row.roles.join(', ')}><ListSummary items={row.roles} /></span>", RULE_LIST_JOINED), []);
  assert.deepEqual(only('l.tsx', "const csv = items.join(', ');", RULE_LIST_JOINED), []);
  // A `row` from a plain map in a description list, or a form value, is not a table cell.
  assert.deepEqual(only('l.tsx', "<dd>{row.required_scopes.join(', ')}</dd>", RULE_LIST_JOINED), []);
  assert.deepEqual(only('l.tsx', "<Input value={row.then.enum_subset?.join(', ') ?? ''} />", RULE_LIST_JOINED), []);
  assert.deepEqual(only('l.ts', "render: (row) => row.roles.join(', '),", RULE_LIST_JOINED), []);
});

test('kit controls: raw button, table and form controls, with the structural exceptions', () => {
  const src = [
    '<button onClick={() => go()}>Go</button>',
    '<button type="submit" hidden aria-hidden tabIndex={-1} />',
    '<table className="x"><tbody /></table>',
    '<input value={v} onChange={set} />',
    '<input type="hidden" name="id" value={id} />',
    '<select value={v} />',
    '<textarea rows={3} />',
    "const label = '<button> is not JSX here';",
    '// <table> in a comment',
  ].join('\n');
  assert.deepEqual(rules('f.tsx', src), [
    `${RULE_RAW_BUTTON}@1`,
    `${RULE_RAW_TABLE}@3`,
    `${RULE_RAW_FORM_CONTROL}@4`,
    `${RULE_RAW_FORM_CONTROL}@6`,
    `${RULE_RAW_FORM_CONTROL}@7`,
  ]);
  // Kit components and .ts files are not raw controls.
  assert.deepEqual(rules('f.tsx', '<Button>Go</Button>\n<Input value={v} />\n<Table />'), []);
  assert.deepEqual(rules('f.ts', 'const s = "<button>";'), []);
  // An exemption is per rule and per file.
  const exempt = { [RULE_RAW_TABLE]: { 'print/invoice.tsx': 'a printed grid' } };
  assert.deepEqual(only('print/invoice.tsx', '<table />', RULE_RAW_TABLE, { exempt }), []);
  assert.deepEqual(only('print/other.tsx', '<table />', RULE_RAW_TABLE, { exempt }), [1]);
});

test('no-arbitrary-font-size: literal Tailwind and inline sizes; the kit tokens pass', () => {
  const src = [
    '<span className="text-[13px] font-medium">a</span>',
    '<span className={`px-1 ${on ? "sm:text-[0.7rem]" : ""}`}>b</span>',
    '<span style={{ fontSize: 12 }}>c</span>',
    "<span style={{ fontSize: '0.8rem' }}>d</span>",
    '<span className="text-[length:var(--uix-text-meta)]">e</span>',
    "<span style={{ fontSize: 'var(--uix-text-meta)' }}>f</span>",
    '<span className="text-sm">g</span>',
  ].join('\n');
  assert.deepEqual(only('f.tsx', src, RULE_ARBITRARY_FONT_SIZE), [1, 2, 3, 4]);
});

// ── the CLI over a product tree ──────────────────────────────────────────────

const CLI = fileURLToPath(new URL('./cli.mjs', import.meta.url));

function product(files) {
  const root = mkdtempSync(join(tmpdir(), 'uix-page-rules-'));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

function cli(root, ...args) {
  const lines = [];
  const code = run(args, { cwd: root, stdout: (s) => lines.push(s), stderr: (s) => lines.push(s) });
  return { code, text: lines.join('\n') };
}

const CONFIG = JSON.stringify({ roots: ['src'] });

test('the gate fails closed on config problems and on an empty walk', () => {
  const missing = product({ 'src/a.tsx': '<Button />' });
  try {
    assert.equal(cli(missing).code, 2);
    writeFileSync(join(missing, 'uix-page-rules.config.json'), JSON.stringify({ roots: ['src'], rootz: ['x'] }));
    const typo = cli(missing);
    assert.equal(typo.code, 2);
    assert.match(typo.text, /unknown key\(s\): rootz/);
    writeFileSync(join(missing, 'uix-page-rules.config.json'), JSON.stringify({ roots: ['nope'] }));
    assert.equal(cli(missing).code, 2);
    writeFileSync(join(missing, 'uix-page-rules.config.json'), JSON.stringify({ roots: ['src'], exempt: { 'no-such-rule': {} } }));
    assert.equal(cli(missing).code, 2);
    assert.equal(cli(missing, 'baseline', '--sed').code, 2);
  } finally {
    rmSync(missing, { recursive: true, force: true });
  }
  const empty = product({ 'uix-page-rules.config.json': CONFIG, 'src/a.test.tsx': '<button />', 'src/README.md': 'x' });
  try {
    const r = cli(empty);
    assert.equal(r.code, 2);
    assert.match(r.text, /no source files/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('seed, then a new finding fails, paid debt must shrink the baseline, and growth is refused', () => {
  const root = product({
    'uix-page-rules.config.json': CONFIG,
    'src/old.tsx': '<button onClick={a}>A</button>\n<button onClick={b}>B</button>\n',
    'src/clean.tsx': '<Button>Ok</Button>\n',
    'src/node_modules/x/bad.tsx': '<button />',
  });
  try {
    // No baseline yet: the check fails on the debt and `baseline` refuses without --seed.
    assert.equal(cli(root).code, 1);
    assert.equal(cli(root, 'baseline').code, 1);
    assert.equal(cli(root, 'baseline', '--seed').code, 0);
    const doc = JSON.parse(readFileSync(join(root, 'uix-page-rules-baseline.json'), 'utf8'));
    assert.deepEqual(doc.rules, { [RULE_RAW_BUTTON]: { 'src/old.tsx': 2 } });
    assert.equal(doc.total, 2);

    const clean = cli(root);
    assert.equal(clean.code, 0, clean.text);
    assert.match(clean.text, /2 file\(s\)? scanned|2 files scanned/);

    // One more raw button in a grandfathered file, and one in a clean file.
    writeFileSync(join(root, 'src/old.tsx'), '<button onClick={a}>A</button>\n<button onClick={b}>B</button>\n<button onClick={c}>C</button>\n');
    writeFileSync(join(root, 'src/clean.tsx'), '<Button>Ok</Button>\n<span className="break-all">x</span>\n');
    const red = cli(root);
    assert.equal(red.code, 1);
    assert.match(red.text, /src\/old\.tsx:3 {2}no-raw-button .*\(3 in this file, 2 grandfathered\)/);
    assert.match(red.text, /src\/clean\.tsx:2 {2}label-break-anywhere/);
    assert.match(red.text, /How to fix:/);
    // The generator will not take them in.
    assert.equal(cli(root, 'baseline').code, 1);
    assert.equal(JSON.parse(readFileSync(join(root, 'uix-page-rules-baseline.json'), 'utf8')).total, 2);

    // Pay the debt: the check now fails until the baseline shrinks.
    writeFileSync(join(root, 'src/old.tsx'), '<Button onClick={a}>A</Button>\n');
    writeFileSync(join(root, 'src/clean.tsx'), '<Button>Ok</Button>\n');
    const stale = cli(root);
    assert.equal(stale.code, 1);
    assert.match(stale.text, new RegExp(`src/old\\.tsx:1 {2}${RULE_STALE_BASELINE}`));
    assert.equal(cli(root, 'baseline').code, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'uix-page-rules-baseline.json'), 'utf8')).rules, {});
    assert.equal(cli(root).code, 0);

    const json = run(['--json'], { cwd: root, stdout: () => {}, stderr: () => {} });
    assert.equal(json, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('skip prefixes and exemptions that match nothing fail as stale', () => {
  const root = product({
    'uix-page-rules.config.json': JSON.stringify({
      roots: ['src'],
      skip: { 'src/legacy/': 'retired in HAR-1' },
      exempt: { [RULE_RAW_TABLE]: { 'src/print.tsx': 'printed grid', 'src/gone.tsx': 'was printed' } },
    }),
    'src/legacy/old.tsx': '<button />',
    'src/print.tsx': '<Table />',
    'src/a.tsx': '<Button />',
  });
  try {
    const r = cli(root);
    assert.equal(r.code, 1);
    assert.match(r.text, new RegExp(`${RULE_STALE_EXEMPTION} .*src/gone\\.tsx`));
    assert.match(r.text, new RegExp(`${RULE_STALE_EXEMPTION} .*src/print\\.tsx, which no longer breaks`));
    assert.doesNotMatch(r.text, /src\/legacy/);
    writeFileSync(join(root, 'src/print.tsx'), '<table />');
    writeFileSync(
      join(root, 'uix-page-rules.config.json'),
      JSON.stringify({ roots: ['src'], skip: { 'src/legacy/': 'retired in HAR-1', 'src/nothing/': 'x' }, exempt: { [RULE_RAW_TABLE]: { 'src/print.tsx': 'printed grid' } } }),
    );
    const s = cli(root);
    assert.equal(s.code, 1);
    assert.match(s.text, /skip "src\/nothing\/" matches no source file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the bin runs as a process and its exit code is the gate', () => {
  const root = product({ 'uix-page-rules.config.json': CONFIG, 'src/a.tsx': '<table />\n' });
  try {
    const red = spawnSync(process.execPath, [CLI], { cwd: root, encoding: 'utf8' });
    assert.equal(red.status, 1, red.stderr);
    assert.match(red.stderr, /src\/a\.tsx:1 {2}no-raw-table/);
    const help = spawnSync(process.execPath, [CLI, 'rules'], { cwd: root, encoding: 'utf8' });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /no-hand-built-pill .*HAR-3817/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── review findings, 2026-11-13 (each was a probe that misbehaved) ───────────

test('the lexer skips regex literals and URLs, so they hide no tag', () => {
  // `/\/*$/` used to open a block comment that swallowed the rest of the file.
  assert.deepEqual(only('f.tsx', "const u = s.replace(/\\/*$/, '');\nexport const P = () => <button onClick={go}>Go</button>;", RULE_RAW_BUTTON), [2]);
  // a backtick inside a regex used to start a template literal
  assert.deepEqual(only('f.tsx', "const v = s.replace(/`/g, '');\n<button onClick={go}>Go</button>", RULE_RAW_BUTTON), [2]);
  // `//` after a `:` is a URL in JSX text, not a comment
  assert.deepEqual(only('f.tsx', '<p>see http://x.y <button onClick={go}>x</button></p>', RULE_RAW_BUTTON), [1]);
  // division, `</tag>` and `/>` are not regexes
  assert.deepEqual(only('f.tsx', 'const r = a / b / c;\n<br/>\n<table></table>\n<button onClick={go} />', RULE_RAW_BUTTON), [4]);
  assert.deepEqual(only('f.tsx', 'const r = a / b / c;\n<br/>\n<table></table>\n<button onClick={go} />', RULE_RAW_TABLE), [3]);
});

test('comments are never findings, wherever they sit', () => {
  assert.deepEqual(only('a.ts', 'const a = 1; // never use break-all', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('a.tsx', '<div>{/* break-all */}</div>', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('a.css', '/*\n  word-break: break-all is banned\n*/\n.x { color: red; }', RULE_BREAK_ANYWHERE), []);
  assert.deepEqual(only('p.tsx', "<PageHeader title={t('title')} />\n{/* <h2>{t('title')}</h2> */}", RULE_HEADING_TWICE), []);
  // and a real one after a comment still counts
  assert.deepEqual(only('a.css', '/* note */ .x { overflow-wrap: anywhere; }', RULE_BREAK_ANYWHERE), [1]);
});

test('Prettier-wrapped severity code and TanStack getValue lists are found', () => {
  assert.deepEqual(only('a.ts', "switch (s) {\n  case 'high':\n    return 'danger';\n}", RULE_SEVERITY_TONE), [2]);
  assert.deepEqual(only('a.ts', "const t = statusTone(\n  'severity',\n  v,\n);", RULE_SEVERITY_TONE), [1]);
  assert.deepEqual(only('l.tsx', "{ id: 'roles', cell: ({ getValue }) => getValue().join(', ') },", RULE_LIST_JOINED), [1]);
  assert.deepEqual(only('l.tsx', "{ id: 'roles', cell: (info) => info.getValue<string[]>().join(', ') },", RULE_LIST_JOINED), [1]);
});

test('a visible submitter and a fontSize prop are caught', () => {
  assert.deepEqual(only('f.tsx', '<button type="submit" hidden aria-hidden="false" />', RULE_RAW_BUTTON), [1]);
  assert.deepEqual(only('f.tsx', '<button type="submit" hidden aria-hidden="true" />', RULE_RAW_BUTTON), []);
  assert.deepEqual(only('f.tsx', '<Icon fontSize={12} />\n<Icon fontSize="12px" />\n<Icon fontSize="var(--uix-text-meta)" />', RULE_ARBITRARY_FONT_SIZE), [1, 2]);
});

test('skip matches on a path-segment boundary, test folders are not read, and a bad baseline fails closed', () => {
  const root = product({
    'uix-page-rules.config.json': JSON.stringify({ roots: ['src'], skip: { 'src/legacy': 'retired' } }),
    'src/legacy/old.tsx': '<button />',
    'src/legacy-new/b.tsx': '<button onClick={go} />',
    'src/__tests__/a.tsx': '<button />',
    'src/__mocks__/m.tsx': '<table />',
  });
  try {
    const r = cli(root);
    assert.equal(r.code, 1, r.text);
    assert.match(r.text, /src\/legacy-new\/b\.tsx:1 {2}no-raw-button/);
    assert.doesNotMatch(r.text, /src\/legacy\/old|__tests__|__mocks__/);
    assert.match(r.text, /1 file\(s\) scanned/);

    // a null rule entry is a config error (exit 2), not a crash
    writeFileSync(join(root, 'uix-page-rules-baseline.json'), JSON.stringify({ rules: { 'no-raw-button': null } }));
    const bad = cli(root);
    assert.equal(bad.code, 2, bad.text);
    assert.match(bad.text, /must map files to counts/);
    // --seed repairs it; a plain `baseline` does not
    assert.equal(cli(root, 'baseline').code, 2);
    assert.equal(cli(root, 'baseline', '--seed').code, 0);
    assert.equal(cli(root).code, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('baseline refuses to write while the config has a stale entry', () => {
  const root = product({
    'uix-page-rules.config.json': JSON.stringify({ roots: ['src'], exempt: { [RULE_RAW_TABLE]: { 'src/gone.tsx': 'was printed' } } }),
    'src/a.tsx': '<button onClick={go} />',
  });
  try {
    const r = cli(root, 'baseline', '--seed');
    assert.equal(r.code, 1);
    assert.match(r.text, /baseline was not written/);
    assert.equal(existsSync(join(root, 'uix-page-rules-baseline.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
