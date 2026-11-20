#!/usr/bin/env node
/*
 * The Serbian Cyrillic label pack is generated from the Latin one (enterprise UX study #14):
 * one translation, two scripts, never out of step.
 *
 * Latin → Cyrillic is not one letter to one letter. Gaj's digraphs dž, lj and nj are single
 * letters (џ, љ, њ) except across a morpheme boundary or in a loanword: "nadživeti" is надживети
 * (д + ж), "injekcija" is инјекција (н + ј). `PAIR_WORDS` lists the stems where the pair is two
 * letters; add to it when a translation brings a new one (the check below cannot know).
 * Cyrillic → Latin is one to one, so the check transliterates back and must get the Latin
 * source again, and no Latin letter may survive outside the tokens that stay Latin.
 *
 * What stays Latin: `{placeholders}`, `${expressions}`, acronyms (all capitals, at most four letters:
 * QR, PDF, URL, ID), key names
 * (Esc, Escape, Enter, Tab, …), words with q, w, x or y, and string literals that are not words
 * (object keys, module paths, index types, `Intl` options, the locale tag itself, which becomes
 * `sr-Cyrl`).
 *
 * Usage (from packages/react):
 *   node scripts/sr-cyrl.mjs           exit 1 when src/locales/sr-Cyrl.ts is not the generated text
 *   node scripts/sr-cyrl.mjs --write   regenerate src/locales/sr-Cyrl.ts from sr-Latn.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SINGLE = {
  a: 'а', b: 'б', c: 'ц', č: 'ч', ć: 'ћ', d: 'д', đ: 'ђ', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'ј', k: 'к',
  l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', š: 'ш', t: 'т', u: 'у', v: 'в', z: 'з', ž: 'ж',
};
const DIGRAPH = { dž: 'џ', lj: 'љ', nj: 'њ' };

/** Stems (lower case) in which d+ž, l+j or n+j are two letters, not one. */
export const PAIR_WORDS = [
  'injek', 'konjunk', 'konjug', 'vanjez', 'tanjug', // n + j
  'nadž', 'podž', 'predž', 'odživ', // d + ž after a prefix
];

/** Words that stay in Latin script: key names and product words. */
export const LATIN_WORDS = new Set(['Esc', 'Enter', 'Tab', 'Shift', 'Ctrl', 'Alt', 'Cmd', 'Option', 'Home', 'End', 'PgUp', 'PgDn', 'Space', 'Backspace', 'Delete', 'Escape', 'PageUp', 'PageDown']);

const isUpper = (ch) => ch !== ch.toLowerCase();
const caseLike = (cyr, latin) => (isUpper(latin[0]) ? cyr.toUpperCase() : cyr);

/** One word (letters only) from Serbian Latin into Serbian Cyrillic. */
export function wordToCyrillic(word) {
  if (LATIN_WORDS.has(word) || /[qwxy]/i.test(word) || (word.length > 1 && word.length <= 4 && word === word.toUpperCase())) return word;
  const lower = word.toLowerCase();
  // the positions where a digraph is two letters
  const split = new Set();
  for (const stem of PAIR_WORDS) {
    for (let at = lower.indexOf(stem); at >= 0; at = lower.indexOf(stem, at + 1)) {
      const pair = lower.slice(at).search(/dž|lj|nj/);
      if (pair >= 0 && pair < stem.length) split.add(at + pair);
    }
  }
  let out = '';
  for (let i = 0; i < word.length; i += 1) {
    const two = lower.slice(i, i + 2);
    if (DIGRAPH[two] && !split.has(i)) { out += caseLike(DIGRAPH[two], word[i]); i += 1; continue; }
    const ch = lower[i];
    out += SINGLE[ch] ? caseLike(SINGLE[ch], word[i]) : word[i];
  }
  return out;
}

/** Running text: words are transliterated, `{placeholders}` and everything else kept. */
export function latinToCyrillic(text) {
  return text.split(/(\{\w+\}|\$\{[^}]*\})/).map((part, index) => (index % 2 ? part
    : part.replace(/\p{L}+/gu, (word) => wordToCyrillic(word)))).join('');
}

const BACK = Object.fromEntries([...Object.entries(SINGLE), ...Object.entries(DIGRAPH)].map(([latin, cyr]) => [cyr, latin]));

/** Serbian Cyrillic into Latin, letter by letter (always safe). */
export function cyrillicToLatin(text) {
  return [...text].map((ch) => {
    const latin = BACK[ch.toLowerCase()];
    if (!latin) return ch;
    return isUpper(ch) ? latin[0].toUpperCase() + latin.slice(1) : latin;
  }).join('');
}

/**
 * The sr-Cyrl pack's source from the sr-Latn pack's source: every string literal and the static
 * parts of every template literal that read as words are transliterated; object keys, import
 * paths and the locale tag are not.
 */
export function generateCyrillicPack(source) {
  let out = '';
  let i = 0;
  const literal = (quote) => {
    let j = i + 1;
    let raw = '';
    const parts = [];
    while (j < source.length && source[j] !== quote) {
      if (source[j] === '\\') { raw += source.slice(j, j + 2); j += 2; continue; }
      if (quote === '`' && source[j] === '$' && source[j + 1] === '{') {
        let depth = 1;
        let k = j + 2;
        while (depth && k < source.length) { if (source[k] === '{') depth += 1; else if (source[k] === '}') depth -= 1; k += 1; }
        parts.push({ text: raw }, { code: source.slice(j, k) });
        raw = '';
        j = k;
        continue;
      }
      raw += source[j];
      j += 1;
    }
    parts.push({ text: raw });
    const end = j + 1;
    const after = source.slice(end).match(/^\s*(.)/)?.[1];
    const before = out.trimEnd();
    const body = parts.map((p) => p.text ?? p.code).join('');
    let result;
    if (body === 'sr-Latn') result = 'sr-Cyrl';
    else if (after === ':' && quote !== '`' && !/\?\s*$/.test(before)) result = body; // an object key
    else if (/\b(from|import)\s*$/.test(before) || /^[.@]/.test(body)) result = body; // a module path
    else if (/\[\s*$/.test(before) || /\b(style|currency|currencyDisplay|unit|unitDisplay|notation)\s*:\s*$/.test(before)) result = body; // an index type, an Intl option
    else result = parts.map((p) => (p.code ?? latinToCyrillic(p.text))).join('');
    out += quote + result + quote;
    i = end;
  };
  while (i < source.length) {
    const ch = source[i];
    if (ch === '/' && source[i + 1] === '/') { const end = source.indexOf('\n', i); out += source.slice(i, end < 0 ? undefined : end); i = end < 0 ? source.length : end; continue; }
    if (ch === '/' && source[i + 1] === '*') { const end = source.indexOf('*/', i) + 2; out += source.slice(i, end); i = end; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { literal(ch); continue; }
    out += ch;
    i += 1;
  }
  return out;
}

const HEADER = `/*
 * GENERATED from sr-Latn.ts by scripts/sr-cyrl.mjs — do not edit by hand. Change sr-Latn.ts, then
 * run \`node scripts/sr-cyrl.mjs --write\` (from packages/react). A test fails when the two differ.
 *
 * Serbian, Cyrillic script (\`sr-Cyrl\`): the transliteration of the machine-drafted, unreviewed
 * sr-Latn pack. A native Serbian reviewer must check it before it is relied on in production.
 */
`;

/** The whole sr-Cyrl.ts text for an sr-Latn.ts text. */
export function cyrillicPackFile(latinSource) {
  const body = generateCyrillicPack(latinSource).replace(/export const srLatn\b/, 'export const srCyrl');
  return HEADER + body;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = fileURLToPath(new URL('../src/locales/', import.meta.url));
  const want = cyrillicPackFile(readFileSync(`${dir}sr-Latn.ts`, 'utf8'));
  if (process.argv.includes('--write')) {
    writeFileSync(`${dir}sr-Cyrl.ts`, want);
    console.log('sr-cyrl: wrote src/locales/sr-Cyrl.ts');
  } else {
    let have = '';
    try { have = readFileSync(`${dir}sr-Cyrl.ts`, 'utf8'); } catch { /* missing */ }
    if (have.replace(/\r\n/g, '\n') !== want.replace(/\r\n/g, '\n')) {
      console.error('sr-cyrl: src/locales/sr-Cyrl.ts is not the transliteration of sr-Latn.ts; run node scripts/sr-cyrl.mjs --write');
      process.exitCode = 1;
    } else console.log('sr-cyrl: sr-Cyrl.ts matches sr-Latn.ts');
  }
}
