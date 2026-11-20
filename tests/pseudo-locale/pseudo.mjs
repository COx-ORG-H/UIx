/* Pseudo-locales made at test time from the kit's English defaults (roadmap #20; FormatJS and Lingui
 * make the same three from a catalog). No dependency, no catalog: the transform runs over a labels
 * object and returns one of the same shape.
 *
 *   en-XA  accented and padded: "Clear filters" → "[Çļéàŕ ƒíļţéŕš ·ŵàɱ]". Every letter has a diacritic
 *          (so a cut-off accent or a font without the glyph shows), the text runs about 35 % longer
 *          (W3C/IBM: German runs about 30 % longer, short strings up to two or three times), and the
 *          brackets show at a glance whether either end was clipped.
 *   en-XB  right to left: the English wrapped in RIGHT-TO-LEFT OVERRIDE … POP DIRECTIONAL FORMATTING,
 *          so it renders reversed, for a page with dir="rtl". Informational: RTL is Tier 3.
 *
 * Placeholders ({count}, {label}) pass through untouched, so templates still fill. A function label
 * ((n) => …) is wrapped so whatever string it returns is transformed too. `parse*` functions are left
 * alone, and so is `dateFormat`: they are data, not words (a pseudo date would not parse back).
 */

const ACCENTS = {
  a: 'à', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ļ', m: 'ɱ',
  n: 'ñ', o: 'ö', p: 'ƥ', q: 'ʠ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ü', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Å', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Î', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ',
  N: 'Ñ', O: 'Ö', P: 'Ƥ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Û', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};
/** Filler for the padding: accented, with spaces, so it wraps where a translation would. */
const FILLER = 'ŵàɱƀüŝ ţéẋţ ļöñĝéŕ ŵöŕðš ƥàððéð ƒöŕ ţéšţíñĝ ţĥé ļàýöüţ öƒ éṽéŕý ƀüţţöñ àñð ţàƀ';
/** How much longer en-XA runs (the W3C/IBM table puts German at about +30 %; a margin on top). */
export const EXPANSION = 0.35;

const PLACEHOLDER = /(\{[^{}]+\})/;
const RLO = '‮';
const PDF = '‬';

/** "Clear filters" → "[Çļéàŕ ƒíļţéŕš ·ŵàɱ]": accents, ~35 % padding, brackets; {placeholders} kept. */
export function accent(text) {
  if (!text) return text;
  const body = text.split(PLACEHOLDER).map((part) => (PLACEHOLDER.test(part) ? part : [...part].map((c) => ACCENTS[c] ?? c).join(''))).join('');
  const visible = text.replace(/\{[^{}]+\}/g, '').length;
  const pad = Math.max(2, Math.ceil(visible * EXPANSION));
  return `[${body} ·${FILLER.slice(0, pad).trimEnd()}]`;
}

/** The English, reversed for display by a right-to-left override (FormatJS en-XB). */
export function rtl(text) {
  return text ? `${RLO}${text}${PDF}` : text;
}

export const PSEUDO_LOCALES = { 'en-XA': accent, 'en-XB': rtl };

const SKIP_KEYS = new Set(['dateFormat', 'locale']);
const isDataFunction = (key) => /^parse/.test(key);

/**
 * The labels object with every string run through `fn` and every function wrapped, recursively.
 * Arrays and nested objects (status maps) keep their shape.
 */
export function pseudoLabels(labels, fn) {
  const walk = (value, key) => {
    if (typeof value === 'string') return fn(value);
    if (typeof value === 'function') {
      if (isDataFunction(key)) return value;
      return (...args) => {
        const out = value(...args);
        return typeof out === 'string' ? fn(out) : out;
      };
    }
    if (Array.isArray(value)) return value.map((v) => walk(v, key));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SKIP_KEYS.has(k) ? v : walk(v, k)]));
    }
    return value;
  };
  return walk(labels, '');
}

/**
 * German compounds that do not wrap without a hyphenation dictionary (W3C: "Eingabeverarbeitungsfunktionen").
 * The harness puts them where a product puts its own words: a page title, a tab, a button, a column.
 */
export const COMPOUNDS = [
  'Eingabeverarbeitungsfunktionen',
  'Datenschutzgrundverordnungskonformität',
  'Kundenzufriedenheitsumfrageergebnisse',
  'Störungsmeldungsbearbeitungsrichtlinie',
  'Änderungsgenehmigungsverfahren',
];
