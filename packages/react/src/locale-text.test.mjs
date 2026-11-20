/* Locale-aware search folding and collation (roadmap #15): foldForSearch, searchMatcher,
 * compareFor, and every kit search and sort model that uses them. The home market types without
 * diacritics and writes đ as "dj"; Serbian is written in Latin and Cyrillic; sorts follow the
 * locale. Plain ASCII must behave exactly as before.
 * Renders nothing — imports the BUILT dist; run `npm run build` first; CI does. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  foldForSearch, searchMatcher, compareFor, searchSegments,
  filterCommandItems, filterComboboxOptions, filterComboboxItems, multiSort, searchRows, applyFilters,
  matchFilter, highlightSegments,
} from '../dist/index.js';

const marked = (segments) => segments.filter((s) => s.match).map((s) => s.text);

/* ── foldForSearch ───────────────────────────────────────────────────────────── */

test('foldForSearch: case, marks, and the letters NFD cannot split', () => {
  assert.equal(foldForSearch('Đorđe Balašević').text, 'djordje balasevic');
  assert.equal(foldForSearch('ĆEVAPI čevapčići').text, 'cevapi cevapcici');
  assert.equal(foldForSearch('Straße STRAẞE').text, 'strasse strasse');
  assert.equal(foldForSearch('Ærø Œuvre Søren Łódź ılık').text, 'aero oeuvre soren lodz ilik');
  assert.equal(foldForSearch('Ǆep ǈubav ǋegoš').text, 'dzep ljubav njegos', 'the Latin digraph code points');
});

test('foldForSearch: the index map follows letters that fold to two', () => {
  const folded = foldForSearch('Đa');
  assert.equal(folded.text, 'dja');
  assert.deepEqual(folded.source, [0, 0, 1]);
  assert.deepEqual(folded.sourceEnd, [1, 1, 2]);
});

test('foldForSearch: Serbian Cyrillic folds to Latin with crossScript (default for sr, bs, hr)', () => {
  assert.equal(foldForSearch('Ђорђе', 'sr-Latn').text, 'djordje');
  assert.equal(foldForSearch('Љубав Његош џеп Ћуприја Жабљак Шабац', 'sr-Cyrl').text, 'ljubav njegos dzep cuprija zabljak sabac');
  assert.equal(foldForSearch('Ђорђе', 'bs').text, 'djordje');
  assert.equal(foldForSearch('Ђорђе', 'hr-HR').text, 'djordje');
  assert.equal(foldForSearch('Ђорђе', 'en').text, 'ђорђе', 'off outside the BCS locales');
  assert.equal(foldForSearch('Ђорђе', 'en', { crossScript: true }).text, 'djordje', 'on when asked');
  assert.equal(foldForSearch('Ђорђе', 'sr', { crossScript: false }).text, 'ђорђе', 'off when asked');
});

/* ── searchMatcher ───────────────────────────────────────────────────────────── */

test('searchMatcher: "djordje" finds "Đorđe", "cevapi" finds "ćevapi"', () => {
  assert.equal(searchMatcher('djordje')('Đorđe Balašević'), true);
  assert.equal(searchMatcher('cevapi')('Sarajevski ćevapi'), true);
  assert.equal(searchMatcher('Ćevapi')('cevapi u lepinji'), true, 'a query with marks finds text without');
  assert.equal(searchMatcher('đorđe')('Djordje'), true);
});

test('searchMatcher: đ also answers to "d", as the palette did before (PR #168)', () => {
  assert.equal(searchMatcher('dorde')('Đorđe'), true);
  assert.equal(searchMatcher('Đorđe')('Dorde'), true, 'the query has the other spelling too');
});

test('searchMatcher: Latin finds Cyrillic and back, in a Serbian locale', () => {
  assert.equal(searchMatcher('djordje', 'sr-Latn')('Ђорђе Балашевић'), true);
  assert.equal(searchMatcher('Ђорђе', 'sr-Cyrl')('Đorđe Balašević'), true);
  assert.equal(searchMatcher('dorde', 'sr')('Ђорђе'), true, 'ђ also answers to "d"');
  assert.equal(searchMatcher('ljubav', 'sr')('Љубав'), true);
  assert.equal(searchMatcher('njegos', 'sr')('Његош'), true);
  assert.equal(searchMatcher('dzep', 'sr')('џеп'), true);
  assert.equal(searchMatcher('djordje', 'en')('Ђорђе'), false, 'no cross-script fold in English');
  assert.equal(searchMatcher('djordje', 'en', { crossScript: true })('Ђорђе'), true);
});

test('searchMatcher: German ß and umlauts', () => {
  assert.equal(searchMatcher('strasse', 'de')('Hauptstraße'), true);
  assert.equal(searchMatcher('straße', 'de')('STRASSE'), true);
  assert.equal(searchMatcher('ubersicht', 'de')('Übersicht'), true);
  assert.equal(searchMatcher('uebersicht', 'de')('Übersicht'), true, 'ü typed as "ue" in German');
  assert.equal(searchMatcher('Müller', 'de')('Mueller'), true);
  assert.equal(searchMatcher('mueller', 'en')('Müller'), false, 'the "ue" spelling is German only');
});

test('searchMatcher: an empty query matches everything; the query is trimmed', () => {
  assert.equal(searchMatcher('   ')('anything'), true);
  assert.equal(searchMatcher('  djordje ')('Đorđe'), true);
});

/* ── compareFor ──────────────────────────────────────────────────────────────── */

test('compareFor: numbers by value, so INC-2 sorts before INC-10', () => {
  const ids = ['INC-10', 'INC-2', 'INC-1', 'INC-100', 'INC-20'];
  assert.deepEqual([...ids].sort(compareFor('en')), ['INC-1', 'INC-2', 'INC-10', 'INC-20', 'INC-100']);
  assert.deepEqual([...ids].sort(compareFor()), ['INC-1', 'INC-2', 'INC-10', 'INC-20', 'INC-100']);
});

test('compareFor: the locale decides where č and ć go (Croatian after c, English among the c\'s)', () => {
  const words = ['čaj', 'cvijet', 'ćevap', 'dinja'];
  assert.deepEqual([...words].sort(compareFor('hr')), ['cvijet', 'čaj', 'ćevap', 'dinja']);
  assert.deepEqual([...words].sort(compareFor('en')), ['čaj', 'ćevap', 'cvijet', 'dinja']);
});

test('compareFor: German umlauts sort with their base letter, ß equals ss', () => {
  const words = ['Zebra', 'Äpfel', 'Ober', 'Öl', 'Apfel'];
  const sorted = [...words].sort(compareFor('de'));
  assert.ok(sorted.indexOf('Äpfel') < sorted.indexOf('Ober'), sorted.join());
  assert.ok(sorted.indexOf('Öl') < sorted.indexOf('Zebra'), sorted.join());
  assert.equal(compareFor('de')('Straße', 'Strasse'), 0);
});

test('compareFor: cached per locale, and an unknown tag falls back instead of throwing', () => {
  assert.equal(compareFor('hr'), compareFor('hr'));
  assert.equal(compareFor(['de', 'en']), compareFor(['de', 'en']));
  assert.doesNotThrow(() => compareFor('not a locale!!')('a', 'b'));
});

/* ── the kit's search and sort surfaces ──────────────────────────────────────── */

test('CommandPalette ranking: "djordje" and "dorde" find "Đorđe"; Cyrillic in Serbian', () => {
  const items = [
    { id: 'a', label: 'Otvori profil: Đorđe Balašević' },
    { id: 'b', label: 'Ђорђе Марјановић' },
    { id: 'c', label: 'Ćevabdžinica Željo' },
  ];
  assert.deepEqual(filterCommandItems(items, 'djordje').map((i) => i.id), ['a']);
  assert.deepEqual(filterCommandItems(items, 'dorde').map((i) => i.id), ['a']);
  assert.deepEqual(filterCommandItems(items, 'djordje', 'sr-Latn').map((i) => i.id), ['b', 'a'], 'the Cyrillic label starts with it, so it ranks first');
  assert.deepEqual(filterCommandItems(items, 'cevabdz').map((i) => i.id), ['c']);
});

test('Combobox filtering: folded, groups kept when an option matches', () => {
  const options = [{ value: 'dj', label: 'Đakovo' }, { value: 'ce', label: 'Čelić' }, { value: 'zg', label: 'Zagreb' }];
  assert.deepEqual(filterComboboxOptions(options, 'djakovo').map((o) => o.value), ['dj']);
  assert.deepEqual(filterComboboxOptions(options, 'celic').map((o) => o.value), ['ce']);
  const groups = [{ label: 'Srbija', options: [{ value: 'bg', label: 'Београд' }] }, { value: 'sa', label: 'Sarajevo' }];
  assert.deepEqual(filterComboboxItems(groups, 'beograd', 'sr').map((i) => i.label), ['Srbija']);
  assert.deepEqual(filterComboboxItems(groups, 'beograd', 'en'), []);
});

test('table engine: searchRows, text filters and highlight fold; multiSort collates', () => {
  const rows = [
    { id: 'INC-10', who: 'Đorđe Balašević', city: 'Novi Sad' },
    { id: 'INC-2', who: 'Šemsa Čolić', city: 'Sarajevo' },
    { id: 'INC-1', who: 'Ђорђе Марјановић', city: 'Кикинда' },
  ];
  assert.deepEqual(searchRows(rows, 'djordje').map((r) => r.id), ['INC-10']);
  assert.deepEqual(searchRows(rows, 'djordje', undefined, 'sr-Latn').map((r) => r.id), ['INC-10', 'INC-1']);
  assert.deepEqual(searchRows(rows, 'colic', ['who']).map((r) => r.id), ['INC-2']);
  assert.deepEqual(multiSort(rows, [{ field: 'id', dir: 'ascending' }]).map((r) => r.id), ['INC-1', 'INC-2', 'INC-10']);
  const contains = { field: 'who', kind: 'text', op: 'contains', value: 'semsa' };
  const startsWith = { field: 'city', kind: 'text', op: 'startsWith', value: 'kik' };
  assert.equal(matchFilter(rows[1], contains), true);
  assert.deepEqual(applyFilters(rows, [startsWith], 'sr').map((r) => r.id), ['INC-1']);
  assert.deepEqual(applyFilters(rows, [startsWith]).map((r) => r.id), []);
  assert.deepEqual(marked(highlightSegments('Đorđe Balašević', 'djordje')), ['Đorđe']);
  assert.deepEqual(marked(highlightSegments('Hauptstraße, Strasse', 'strasse')), ['straße', 'Strasse']);
  assert.deepEqual(marked(highlightSegments('Ђорђе Марјановић', 'djordje', 'sr')), ['Ђорђе']);
});

test('multiSort collates in the locale: Croatian names', () => {
  const rows = [{ name: 'Čolić' }, { name: 'Cvitan' }, { name: 'Ćosić' }, { name: 'Dukić' }];
  assert.deepEqual(multiSort(rows, [{ field: 'name', dir: 'ascending' }], 'hr').map((r) => r.name), ['Cvitan', 'Čolić', 'Ćosić', 'Dukić']);
});

test('SearchSuggest marks the Cyrillic match of a Latin query in Serbian', () => {
  assert.deepEqual(marked(searchSegments('Ђорђе Балашевић', 'djordje', 'sr-Latn')), ['Ђорђе']);
  assert.deepEqual(marked(searchSegments('Ђорђе Балашевић', 'djordje balas', 'sr-Latn')), ['Ђорђе Балаш']);
  assert.deepEqual(marked(searchSegments('Đorđe Balašević', 'dorde')), ['Đorđe'], 'the other spelling marks too');
});

/* ── plain ASCII is unchanged ────────────────────────────────────────────────── */

// The 2.70 implementations, for parity.
const oldSearchRows = (rows, query, fields) => {
  const q = query.trim().toLowerCase();
  if (!q) return rows.slice();
  return rows.filter((r) => (fields ? fields.map((f) => r[f]) : Object.values(r)).some((v) => v != null && String(v).toLowerCase().includes(q)));
};
const oldHighlight = (text, query) => {
  const q = query.trim();
  if (!q) return [{ text, match: false }];
  const out = [];
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  for (;;) {
    const hit = lower.indexOf(ql, i);
    if (hit === -1) { if (i < text.length) out.push({ text: text.slice(i), match: false }); break; }
    if (hit > i) out.push({ text: text.slice(i, hit), match: false });
    out.push({ text: text.slice(hit, hit + q.length), match: true });
    i = hit + q.length;
  }
  return out;
};
const oldCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

test('plain ASCII: search, highlight, combobox and sort give the 2.70 results', () => {
  let seed = 7;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const alphabet = 'abcdeDJ Ss-_0123456789INC';
  const word = (n) => Array.from({ length: n }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('');
  const rows = Array.from({ length: 400 }, (_, i) => ({ id: `INC-${Math.floor(rand() * 500)}`, name: word(3 + (i % 9)), n: Math.floor(rand() * 50) }));
  const queries = ['', ' ', 'a', 'dj', 'DJ', 'inc-1', ' ss ', 'e d', '12', 'zzz', 'S-', '_0'];
  for (const query of queries) {
    assert.deepEqual(searchRows(rows, query), oldSearchRows(rows, query), `searchRows ${JSON.stringify(query)}`);
    assert.deepEqual(searchRows(rows, query, ['name']), oldSearchRows(rows, query, ['name']));
    for (const row of rows.slice(0, 40)) {
      assert.deepEqual(highlightSegments(row.name, query), oldHighlight(row.name, query), `highlight ${row.name} / ${query}`);
    }
    const options = rows.slice(0, 60).map((r) => ({ value: r.id, label: r.name }));
    const needle = query.trim().toLowerCase();
    const expected = needle ? options.filter((o) => [o.label, o.value].some((p) => p.toLowerCase().includes(needle))) : options;
    assert.deepEqual(filterComboboxOptions(options, query), expected, `combobox ${JSON.stringify(query)}`);
  }
  const byOld = rows.slice().sort((a, b) => oldCollator.compare(a.name, b.name) || 0);
  assert.deepEqual(multiSort(rows, [{ field: 'name', dir: 'ascending' }]), byOld);
  assert.deepEqual(highlightSegments('', 'a'), oldHighlight('', 'a'), 'empty text');
});
