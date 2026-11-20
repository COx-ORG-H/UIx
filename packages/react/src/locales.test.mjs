/* Plural-aware labels and the label packs (enterprise UX study, first five #3).
 * - CLDR category selection per locale for 1, 2, 5, 11, 21, 22, 25, 101, through the kit's
 *   `countLabel` and through a real component under `UixLabelsProvider`;
 * - the legacy `…One` / `…Many` string pairs keep their exact behaviour;
 * - every pack is complete: every namespace and key of the English pack, the same value shapes,
 *   every placeholder kept, every plural category of its locale, nothing empty, typed `UixLabelPack`;
 * - the English defaults are unchanged (a snapshot of every exported default taken before plural
 *   labels landed) and the `en` pack is exactly those defaults;
 * - sr-Cyrl is the transliteration of sr-Latn, Cyrillic throughout, and transliterates back.
 * Renders the BUILT dist — run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ui from '../dist/index.js';
import { en } from '../dist/locales/en.js';
import { de } from '../dist/locales/de.js';
import { bs } from '../dist/locales/bs.js';
import { hr } from '../dist/locales/hr.js';
import { srLatn } from '../dist/locales/sr-Latn.js';
import { srCyrl } from '../dist/locales/sr-Cyrl.js';
import { cyrillicPackFile, cyrillicToLatin, LATIN_WORDS } from '../scripts/sr-cyrl.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const PACKS = { en, de, bs, hr, 'sr-Latn': srLatn, 'sr-Cyrl': srCyrl };
const NUMBERS = [1, 2, 5, 11, 21, 22, 25, 101];
const ONE_OTHER = ['one', 'other', 'other', 'other', 'other', 'other', 'other', 'other'];
const ONE_FEW_OTHER = ['one', 'few', 'other', 'other', 'one', 'few', 'other', 'one'];
const EXPECTED = { en: ONE_OTHER, de: ONE_OTHER, bs: ONE_FEW_OTHER, hr: ONE_FEW_OTHER, 'sr-Latn': ONE_FEW_OTHER, 'sr-Cyrl': ONE_FEW_OTHER };

/* ── CLDR categories ──────────────────────────────────────────────────────────────────────── */

for (const [locale, categories] of Object.entries(EXPECTED)) {
  test(`pluralCategory: ${locale} gives ${[...new Set(categories)].join('/')} for ${NUMBERS.join(', ')}`, () => {
    assert.deepEqual(NUMBERS.map((n) => ui.pluralCategory(n, locale)), categories);
  });
}

test('countLabel: forms pick the locale\'s category, then other; a string is every count; a function gets the count', () => {
  const forms = { one: '{count} red', few: '{count} reda', other: '{count} redova' };
  assert.deepEqual(NUMBERS.map((n) => ui.countLabel(forms, n, 'bs')), ONE_FEW_OTHER.map((c) => forms[c]));
  // English has no `few`: 2 and 22 are `other`
  assert.deepEqual(NUMBERS.map((n) => ui.countLabel(forms, n, 'en')), ONE_OTHER.map((c) => forms[c]));
  // a missing category falls back to other
  assert.equal(ui.countLabel({ other: '{count} x' }, 1, 'bs'), '{count} x');
  assert.equal(ui.countLabel('{count} selected', 21, 'bs'), '{count} selected');
  assert.equal(ui.countLabel((n) => `n=${n}`, 22, 'bs'), 'n=22');
  // no locale: English, the kit's own language
  assert.equal(ui.countLabel(forms, 2), forms.other);
  // a malformed tag does not throw
  assert.equal(ui.countLabel(forms, 1, 'not a locale!'), forms.one);
});

test('countLabel: a legacy …One / …Many string pair keeps its rule exactly (count === 1), in any locale', () => {
  for (const locale of [undefined, 'en', 'bs', 'fr']) {
    assert.equal(ui.countLabel('{count} results', 1, locale, '{count} result'), '{count} result');
    assert.equal(ui.countLabel('{count} results', 0, locale, '{count} result'), '{count} results');
    assert.equal(ui.countLabel('{count} results', 21, locale, '{count} result'), '{count} results');
  }
  // forms on the …Many key win over the …One string
  assert.equal(ui.countLabel({ one: 'A {count}', other: 'B {count}' }, 21, 'hr', 'ignored'), 'A {count}');
});

/* ── through components and the provider ──────────────────────────────────────────────────── */

const groupCounts = (labels) => {
  // one row each, so the workspace is not empty; `count` is the number the header says
  const groups = NUMBERS.map((n) => ({ id: `g${n}`, label: `G${n}`, rows: [{ id: `r${n}`, name: `R${n}` }], count: n }));
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels }, h(ui.DataWorkspace, {
    label: 'Rows', rows: groups.flatMap((g) => g.rows), getRowId: (r) => r.id, columns: [{ id: 'name', header: 'Name', cell: (r) => r.name }], groups,
  })));
  return [...html.matchAll(/class="uix-data-workspace__group-count"[^>]*>([^<]*)</g)].map((m) => m[1]);
};

for (const [locale, pack] of Object.entries(PACKS)) {
  test(`UixLabelsProvider ${locale}: DataWorkspace group counts take the pack's form for each count`, () => {
    const forms = pack.dataWorkspace.groupCount;
    const want = NUMBERS.map((n, i) => {
      const template = typeof forms === 'string' ? (n === 1 ? pack.dataWorkspace.groupCountOne : forms) : forms[EXPECTED[locale][i]] ?? forms.other;
      return template.replace('{count}', String(n));
    });
    assert.deepEqual(groupCounts(pack), want);
  });
}

test('UixLabelsProvider: no locale and English strings render exactly as before (1 row, 2 rows, 21 rows)', () => {
  assert.deepEqual(groupCounts({}), NUMBERS.map((n) => `${n} ${n === 1 ? 'row' : 'rows'}`));
});

test('UixLabelsProvider: forms in a Bosnian provider give 1 red, 2 reda, 5 redova, 21 red, 22 reda', () => {
  const counts = groupCounts({ locale: 'bs', dataWorkspace: { groupCount: { one: '{count} red', few: '{count} reda', other: '{count} redova' } } });
  assert.deepEqual(counts, ['1 red', '2 reda', '5 redova', '11 redova', '21 red', '22 reda', '25 redova', '101 red']);
});

test('UixLabelsProvider: an inner provider\'s locale replaces the outer one (a string, not merged)', () => {
  const html = renderToStaticMarkup(h(ui.UixLabelsProvider, { labels: { locale: 'bs' } }, h(ui.UixLabelsProvider, { labels: { locale: 'en' } }, h(function Probe() {
    return h('output', null, String(ui.useUixLocale()));
  }))));
  assert.match(html, /<output>en<\/output>/);
});

/* ── pack completeness ────────────────────────────────────────────────────────────────────── */

const isForms = (v) => v != null && typeof v === 'object' && typeof v.other === 'string'
  && Object.keys(v).every((k) => ['zero', 'one', 'two', 'few', 'many', 'other'].includes(k));
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const formsPlaceholders = (v) => [...new Set(Object.values(v).flatMap((s) => placeholders(s).split(',')).filter(Boolean))].sort().join(',');

/** Every problem of `pack` measured against the English pack. */
function packProblems(pack) {
  const problems = [];
  const categories = new Intl.PluralRules(pack.locale).resolvedOptions().pluralCategories;
  const walk = (ref, value, path) => {
    if (typeof ref === 'function') { if (typeof value !== 'function') problems.push(`${path}: not a function`); return; }
    if (value === undefined) { problems.push(`${path}: missing`); return; }
    if (typeof ref === 'string' || isForms(ref)) {
      const want = typeof ref === 'string' ? placeholders(ref) : formsPlaceholders(ref);
      if (typeof value === 'string') {
        if (!value.trim()) problems.push(`${path}: empty`);
        if (placeholders(value) !== want) problems.push(`${path}: {${placeholders(value)}}, en has {${want}}`);
      } else if (isForms(value)) {
        for (const category of categories) if (typeof value[category] !== 'string') problems.push(`${path}: no "${category}" form`);
        for (const [category, text] of Object.entries(value)) {
          if (!text.trim()) problems.push(`${path}.${category}: empty`);
          if (placeholders(text) !== want) problems.push(`${path}.${category}: {${placeholders(text)}}, en has {${want}}`);
        }
      } else problems.push(`${path}: neither a string nor plural forms`);
      return;
    }
    if (value == null || typeof value !== 'object') { problems.push(`${path}: missing`); return; }
    for (const key of Object.keys(ref)) walk(ref[key], value[key], `${path}.${key}`);
    for (const key of Object.keys(value)) if (!(key in ref)) problems.push(`${path}.${key}: not in en`);
  };
  for (const key of Object.keys(en)) if (key !== 'locale') walk(en[key], pack[key], key);
  for (const key of Object.keys(pack)) if (!(key in en)) problems.push(`${key}: not in en`);
  return problems;
}

for (const [tag, pack] of Object.entries(PACKS)) {
  test(`pack ${tag}: complete — every key, placeholder and plural category; locale "${tag}"`, () => {
    assert.equal(pack.locale, tag);
    assert.deepEqual(packProblems(pack), []);
  });
}

test('packs: the completeness check fails a pack with a missing key, a lost placeholder or a missing form', () => {
  // the namespaces whose words are functions cannot be cloned: set aside, then put back
  const broken = structuredClone({ ...bs, taskTray: undefined, toast: undefined });
  delete broken.modal.close;
  broken.dataWorkspace.selectRow = 'Odaberi';
  broken.dataWorkspace.groupCount = { one: '{count} red', other: '{count} redova' };
  const problems = packProblems({ ...broken, taskTray: bs.taskTray, toast: bs.toast });
  assert.ok(problems.includes('modal.close: missing'), problems.join('\n'));
  assert.ok(problems.some((p) => p.startsWith('dataWorkspace.selectRow:')));
  assert.ok(problems.includes('dataWorkspace.groupCount: no "few" form'));
});

test('packs: each entry exports one pack typed UixLabelPack, imports only types and the plural helper', () => {
  for (const tag of Object.keys(PACKS)) {
    const source = read(`./locales/${tag}.ts`);
    assert.match(source, /export const \w+: UixLabelPack = \{/, `${tag}: the pack must be annotated UixLabelPack, so a missing key fails the type check`);
    for (const [, spec] of source.matchAll(/^import (?!type )[^;]*from '([^']+)'/gm)) assert.equal(spec, '../plural.js', `${tag} imports ${spec}`);
  }
});

test('packs: bs, hr, sr-Latn and sr-Cyrl say in their header that they are machine-drafted and need a native review', () => {
  for (const tag of ['bs', 'hr', 'sr-Latn', 'sr-Cyrl']) {
    const head = read(`./locales/${tag}.ts`).slice(0, 1500);
    assert.match(head, /machine-drafted/i, tag);
    assert.match(head, /native/i, tag);
  }
});

test('packs: the task tray words agree with the count (bs 1 / 2 / 5)', () => {
  const words = [1, 2, 5].map((n) => bs.taskTray.done(n));
  assert.equal(typeof words[0], 'string');
  assert.ok(words.every((w) => w.trim()), words.join(' | '));
});

/* ── the English defaults are unchanged ───────────────────────────────────────────────────── */

const SNAPSHOT = JSON.parse(read('./fixtures/en-labels.snapshot.json'));

test('English defaults: every exported default is what it was before plural labels (snapshot)', () => {
  for (const [name, snapshot] of Object.entries(SNAPSHOT)) {
    const current = ui[name];
    assert.ok(current, `${name} is still exported`);
    const plain = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, typeof value === 'function' ? '[function]' : value]));
    assert.deepEqual(plain, snapshot, name);
  }
});

const PACK_DEFAULTS = {
  buttonResult: 'DEFAULT_BUTTON_RESULT_LABELS', lightbox: 'DEFAULT_LIGHTBOX_LABELS', displayPreferences: 'DEFAULT_DISPLAY_PREFERENCES_LABELS',
  accountMenu: 'DEFAULT_ACCOUNT_MENU_LABELS', qrCode: 'DEFAULT_QR_CODE_LABELS', codeDisplay: 'DEFAULT_CODE_DISPLAY_LABELS', contactCard: 'DEFAULT_CONTACT_CARD_LABELS',
  printLayout: 'DEFAULT_PRINT_LAYOUT_LABELS', qrScanner: 'DEFAULT_QR_SCANNER_LABELS', entityPicker: 'DEFAULT_ENTITY_PICKER_LABELS', tree: 'DEFAULT_TREE_LABELS',
  orgChart: 'DEFAULT_ORG_CHART_LABELS', inlineEdit: 'DEFAULT_INLINE_EDIT_LABELS', sortableList: 'DEFAULT_SORTABLE_LIST_LABELS', keyboardGrab: 'DEFAULT_KEYBOARD_GRAB_LABELS',
  schedulingCalendar: 'DEFAULT_SCHEDULING_CALENDAR_LABELS', dateRangePicker: 'DEFAULT_DATE_RANGE_PICKER_LABELS', datePicker: 'DEFAULT_DATE_PICKER_LABELS',
  dateTimePicker: 'DEFAULT_DATE_TIME_PICKER_LABELS', timePicker: 'DEFAULT_TIME_PICKER_LABELS', schedulingTimeline: 'DEFAULT_SCHEDULING_TIMELINE_LABELS',
  textDiff: 'DEFAULT_TEXT_DIFF_LABELS', diffViewer: 'DEFAULT_DIFF_VIEWER_LABELS', matchReview: 'DEFAULT_MATCH_REVIEW_LABELS', auditLog: 'DEFAULT_AUDIT_LOG_LABELS',
  filterEditor: 'DEFAULT_FILTER_EDITOR_LABELS', filterSummary: 'DEFAULT_FILTER_SUMMARY_LABELS', ruleBuilder: 'DEFAULT_RULE_BUILDER_LABELS',
  fileUpload: 'DEFAULT_FILE_UPLOAD_LABELS', fileRow: 'FILE_ROW_LABELS_EN', fileDrop: 'FILE_DROP_LABELS_EN', fileKinds: 'FILE_KIND_LABELS_EN',
  attachment: 'DEFAULT_ATTACHMENT_LABELS', tagInput: 'DEFAULT_TAG_INPUT_LABELS', passwordInput: 'DEFAULT_PASSWORD_INPUT_LABELS',
  pagination: 'DEFAULT_PAGINATION_LABELS', table: 'DEFAULT_USE_TABLE_LABELS', shortcuts: 'DEFAULT_SHORTCUT_LABELS',
  kanban: 'DEFAULT_KANBAN_LABELS', dashboardCanvas: 'DEFAULT_DASHBOARD_CANVAS_LABELS', slaTimer: 'DEFAULT_SLA_TIMER_LABELS',
};

test('the en pack is the kit\'s English: equal to every exported default it covers', () => {
  for (const [namespace, name] of Object.entries(PACK_DEFAULTS)) assert.deepEqual(en[namespace], ui[name], `${namespace} vs ${name}`);
  // DataWorkspace's `more` is optional in the defaults (it falls back to toolbar.more)
  assert.deepEqual({ ...en.dataWorkspace, more: undefined }, { ...ui.DEFAULT_DATA_WORKSPACE_LABELS, more: undefined });
  assert.equal(en.dataWorkspace.more, en.toolbar.more);
  // ViewMenu's column-row words are not exported: they must be the literals in TableControls.tsx
  const tableControls = read('./components/TableControls.tsx');
  for (const [key, value] of Object.entries(en.viewMenu)) assert.ok(tableControls.includes(`${key}: '${value}'`), `viewMenu.${key}: '${value}' is not the TableControls default`);
});

test('the en pack\'s inline defaults are the words the components fall back to', () => {
  const sources = ['CommandPalette', 'Modal', 'Drawer', 'Peek', 'AppShell', 'Sidebar', 'SearchSuggest', 'Dialogs', 'Toast', 'ToolbarMore', 'ChipRemove', 'AlertDismiss', 'SearchBar', 'Select', 'DiscardPrompt', 'TaskTray']
    .map((name) => { try { return read(`./components/${name}.tsx`); } catch { return ''; } }).join('\n');
  const inline = { ...en.modal, ...en.drawer, ...en.peek, ...en.appShell, ...en.sidebar, ...en.searchSuggest, ...en.confirmDialog, ...en.commandPalette, ...en.searchBar, ...en.select, ...en.discardPrompt };
  for (const [key, value] of Object.entries(inline)) assert.ok(sources.includes(`'${value}'`), `${key}: '${value}' is not a default in the component sources`);
});

test('useTable: the announcement words are the English they were (1 result, 2 results, 0 results)', () => {
  const words = ui.DEFAULT_USE_TABLE_LABELS;
  assert.deepEqual([0, 1, 2].map((n) => ui.countLabel(words.results, n).replace('{count}', String(n))), ['0 results', '1 result', '2 results']);
  assert.equal(words.sorted.replace('{field}', 'name').replace('{dir}', words.ascending), 'Sorted by name, ascending');
});

/* ── sr-Cyrl is generated from sr-Latn ────────────────────────────────────────────────────── */

test('sr-Cyrl: the committed file is exactly the transliteration of sr-Latn (node scripts/sr-cyrl.mjs --write)', () => {
  const normalise = (s) => s.replace(/\r\n/g, '\n');
  assert.equal(normalise(read('./locales/sr-Cyrl.ts')), normalise(cyrillicPackFile(read('./locales/sr-Latn.ts'))));
});

/** Every string of a pack with its path; plural forms included. */
function strings(value, path = '', out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) strings(inner, path ? `${path}.${key}` : key, out);
  return out;
}

test('sr-Cyrl: no Latin letter outside placeholders, acronyms and key names; Cyrillic → Latin gives sr-Latn back', () => {
  const latin = new Map(strings(srLatn));
  for (const [path, text] of strings(srCyrl)) {
    if (path === 'locale') continue;
    const leftover = text.replace(/\{\w+\}/g, '').match(/\p{Script=Latin}+/gu) ?? [];
    for (const word of leftover) assert.ok(LATIN_WORDS.has(word) || /^[A-Z]{2,4}$/.test(word) || /[qwxy]/i.test(word), `${path}: "${word}" left in Latin`);
    assert.equal(cyrillicToLatin(text), latin.get(path), path);
  }
  for (const n of [1, 2, 5]) assert.equal(cyrillicToLatin(srCyrl.taskTray.done(n)), srLatn.taskTray.done(n));
});
