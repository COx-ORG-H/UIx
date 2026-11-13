// UIx page rules — the rules, as pure functions over one source file (HAR-3874).
//
// The TENSOR UI council climbs (HAR-2954) and the page audit (HAR-3101) kept
// finding the same page-level shapes on pages nobody had reviewed. UIx's own
// tests hold the kit-level rules (control edges, hit areas, the calm palette),
// but a page can still misuse the kit, and no product except TENSOR checked
// that. These rules are TENSOR's two scanners (scripts/lib/ui-climb-rules.mjs
// and scripts/lib/kit-control-rules.mjs), ported to UIx names so every product
// that renders UIx runs them. The five climb rules keep TENSOR's rule ids.
//
// This module reads no files: ./scan.mjs walks a product and hands each source
// here, so the tests feed strings. Workspace lessons 12 and 13 carry the why.

/** @typedef {{ rule: string, file: string, line: number, text: string, msg: string }} Finding */

export const RULE_SEVERITY_TONE = 'severity-through-status-tone';
export const RULE_BREAK_ANYWHERE = 'label-break-anywhere';
export const RULE_HEADING_TWICE = 'heading-said-twice';
export const RULE_ROW_MENU_UNNAMED = 'row-menu-unnamed';
export const RULE_LIST_JOINED = 'list-joined-in-cell';
export const RULE_RAW_BUTTON = 'no-raw-button';
export const RULE_RAW_TABLE = 'no-raw-table';
export const RULE_RAW_FORM_CONTROL = 'no-raw-form-control';
export const RULE_ARBITRARY_FONT_SIZE = 'no-arbitrary-font-size';

/** Reported by the baseline and config checks, never by a source file. */
export const RULE_STALE_BASELINE = 'stale-baseline';
export const RULE_STALE_EXEMPTION = 'stale-exemption';

/**
 * Every counted rule, in report order. `ignorable` rules accept an inline
 * `// uix-page-rules-ignore <rule>: <reason>`; the kit-control rules do not,
 * because a case the kit cannot serve is a UIx change first (workspace
 * ADR-0038), not a page exception.
 */
export const RULES = Object.freeze({
  [RULE_SEVERITY_TONE]: {
    ignorable: true,
    lesson: 'lessons/12 — severity colour comes from one ramp (critical red, high amber, medium and low neutral)',
    fix: "Colour severity with the kit ramp: `<StatusPill tone={severityTone(severity)}>` (`severityTone` from '@tensor_1/react'). Never map \"high\" to a red tone by hand or through a generic status-tone helper: every High on the screen turns red and spends the red budget on the commonest value.",
  },
  [RULE_BREAK_ANYWHERE]: {
    ignorable: true,
    lesson: 'lessons/12 — text fits by rule: a label never breaks mid-word',
    fix: 'Drop the mid-word break (break-all, overflow-wrap: anywhere, wrap-anywhere, wordBreak/overflowWrap in a style). Let the label wrap at spaces, shorten it, or truncate it whole with the full text in a title or tooltip. Long unbroken text in a narrow column (an e-mail address, a URL, an error message) takes `break-words` (overflow-wrap: break-word) plus `min-w-0` on its flex or grid item. Code in `font-mono`, `<code>` or `<pre>` is exempt.',
  },
  [RULE_HEADING_TWICE]: {
    ignorable: true,
    lesson: 'lessons/13 — say each heading once',
    fix: 'Keep the title in the PageHeader only. A table names itself with an aria-label instead of a visible caption; a section gets its own heading, or none when it is the page’s only content.',
  },
  [RULE_ROW_MENU_UNNAMED]: {
    ignorable: true,
    lesson: 'lessons/13 — a row carries one quiet ⋯ menu named for its row',
    fix: "Name the row in the menu's label or its trigger's aria-label, e.g. `aria-label={`Aktionen: ${row.title}`}` or `label={t('row_actions', { title: row.title })}`. Ten menus all called \"Aktionen\" read as one control.",
  },
  [RULE_LIST_JOINED]: {
    ignorable: true,
    lesson: 'lessons/12 — a long list in a table cell is summarised by the kit, never wrapped',
    fix: 'Render the list with the kit’s `ListSummary` (count, the first three, "und N weitere") or `OverflowRow` instead of joining it with ", ". A joined list wraps the row to many lines.',
  },
  [RULE_RAW_BUTTON]: {
    ignorable: false,
    lesson: 'lessons/12 — staff UI is UIx only; the kit owns the button',
    fix: 'Render the kit control from @tensor_1/react: Button (variant, size, icon, loading), ButtonLink for navigation, Chip for a toggle or filter, Tabs or Segmented for a view switch, MenuItem inside a Menu, RowAction for a row action, ExpandToggle, StarButton or CopyButton. A raw <button> redraws the kit’s focus ring, pending and disabled states and drifts from them. The one allowed case is an invisible submitter (type="submit" hidden aria-hidden). If the kit lacks the look, build it in UIx first and release it.',
  },
  [RULE_RAW_TABLE]: {
    ignorable: false,
    lesson: 'lessons/12 — staff UI is UIx only; a list of records is a kit table',
    fix: 'Render a list of records with DataWorkspace (or the kit Table, Th, Tr and Td inside TableWrap for a matrix) from @tensor_1/react. A printed document that cannot use the screen table is listed under `exempt` in the config with its reason.',
  },
  [RULE_RAW_FORM_CONTROL]: {
    ignorable: false,
    lesson: 'lessons/12 — staff UI is UIx only; the kit owns the form controls',
    fix: 'Render Input, NumberInput, PasswordInput, Textarea, Select, Combobox, Checkbox, Radio, Switch, DatePicker, TimePicker or FileUpload from @tensor_1/react inside a kit Field. A raw control misses the kit’s 3:1 edge, focus ring, invalid state and label wiring. `<input type="hidden">` is allowed.',
  },
  [RULE_ARBITRARY_FONT_SIZE]: {
    ignorable: false,
    lesson: 'lessons/12 — the type scale is the kit’s',
    fix: 'Use the kit type scale: the `--uix-text-<step>` tokens (eyebrow 11, meta 12.5, body 14, h3 15, h2 24, data-hero 34, display 40 px), e.g. `text-[length:var(--uix-text-meta)]` or `fontSize: "var(--uix-text-meta)"`, never a literal size.',
  },
  [RULE_STALE_BASELINE]: {
    ignorable: false,
    lesson: 'the baseline only shrinks',
    fix: 'The debt is paid: run `uix-page-rules baseline` and commit the smaller baseline.',
  },
  [RULE_STALE_EXEMPTION]: {
    ignorable: false,
    lesson: 'exemptions only shrink',
    fix: 'The exempt file no longer holds the shape, or is gone: delete its entry from `exempt` in the config.',
  },
});

/** The rules a source file can break, in report order. */
export const COUNTED_RULES = Object.freeze(
  Object.keys(RULES).filter((rule) => rule !== RULE_STALE_BASELINE && rule !== RULE_STALE_EXEMPTION),
);

/** The rule options a product may set (see ./scan.mjs for the config file). */
export const DEFAULT_OPTIONS = Object.freeze({
  /** Generic tone helpers that must never colour a severity: `statusTone('severity', …)`. */
  genericToneHelpers: Object.freeze(['statusTone']),
  /** Components whose `title` is the page title. */
  pageTitleComponents: Object.freeze(['PageHeader']),
  /** Components that render a row's ⋯ menu. */
  rowMenuComponents: Object.freeze(['Menu', 'ActionMenu']),
  /** rule → file → reason: a structural exception to one rule. */
  exempt: Object.freeze({}),
});

// ── lexing ────────────────────────────────────────────────────────────────────

/**
 * Lex a TSX source just far enough for these rules. Returns
 *   code    — the source with comment and string text blanked to spaces
 *             (newlines kept, so offsets and line numbers stay), which a tag
 *             regex can read as code and JSX only;
 *   strings — every string and template literal as { start, text }, a
 *             template's text parts joined by a space where `${…}` stood.
 * A quote that reaches the end of its line unclosed is JSX text (an apostrophe
 * in prose), not a string: it stays code and lexing goes on after it. A regex
 * literal (`/\/*$/`, `/`/g`) is skipped whole, so its `/*` or backtick opens
 * nothing, and `//` right after a `:` is a URL (`http://…`), not a comment.
 * With `{ blankStrings: false }` only comments are blanked: the line rules read
 * class strings but never a commented-out line.
 * Known limit: two apostrophes on one line of raw JSX text read as a string.
 */
export function lexSource(src, { blankStrings = true } = {}) {
  const chars = src.split('');
  const strings = [];
  const frames = [];
  const n = src.length;
  const blankAll = (from, to) => {
    for (let k = from; k < to; k += 1) if (chars[k] !== '\n') chars[k] = ' ';
  };
  const blank = blankStrings ? blankAll : () => {};
  const templateText = (frame, j) => {
    const from = j;
    let text = '';
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') {
        text += src.slice(j, j + 2);
        j += 2;
        continue;
      }
      if (ch === '`') {
        blank(from, j);
        frame.parts.push(text);
        strings.push({ start: frame.start, text: frame.parts.join(' ') });
        return j + 1;
      }
      if (ch === '$' && src[j + 1] === '{') {
        blank(from, j);
        frame.parts.push(text);
        frame.depth = 0;
        frames.push(frame);
        return j + 2;
      }
      text += ch;
      j += 1;
    }
    blank(from, n);
    frame.parts.push(text);
    strings.push({ start: frame.start, text: frame.parts.join(' ') });
    return n;
  };
  let i = 0;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/' && src[i - 1] !== ':') {
      const eol = src.indexOf('\n', i);
      const end = eol === -1 ? n : eol;
      blankAll(i, end);
      i = end;
      continue;
    }
    if (ch === '/' && next === '*') {
      const close = src.indexOf('*/', i + 2);
      const end = close === -1 ? n : close + 2;
      blankAll(i, end);
      i = end;
      continue;
    }
    if (ch === '/' && regexCanStart(src, i)) {
      const end = regexLiteralEnd(src, i);
      if (end > 0) {
        blank(i + 1, end - 1);
        i = end;
        continue;
      }
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let text = '';
      while (j < n && src[j] !== ch && src[j] !== '\n') {
        if (src[j] === '\\') {
          text += src.slice(j, j + 2);
          j += 2;
        } else {
          text += src[j];
          j += 1;
        }
      }
      if (j < n && src[j] === ch) {
        strings.push({ start: i, text });
        blank(i + 1, j);
        i = j + 1;
      } else {
        i += 1;
      }
      continue;
    }
    if (ch === '`') {
      i = templateText({ start: i, parts: [], depth: 0 }, i + 1);
      continue;
    }
    const top = frames[frames.length - 1];
    if (top && ch === '{') {
      top.depth += 1;
    } else if (top && ch === '}') {
      if (top.depth === 0) {
        frames.pop();
        i = templateText(top, i + 1);
        continue;
      }
      top.depth -= 1;
    }
    i += 1;
  }
  return { code: chars.join(''), strings };
}

const REGEX_AFTER = new Set(['(', ',', '=', ':', '[', '!', '&', '|', '?', '{', ';', '+', '-', '*', '%', '~', '^']);
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'void', 'delete', 'in', 'of', 'yield', 'await', 'new', 'else', 'do']);

/** True when a `/` at `i` starts a regex literal rather than a division or a JSX `</` / `/>`. */
export function regexCanStart(src, i) {
  if (src[i + 1] === '>' || src[i + 1] === '/' || src[i + 1] === '*') return false;
  let k = i - 1;
  while (k >= 0 && /\s/.test(src[k])) k -= 1;
  if (k < 0) return true;
  const prev = src[k];
  if (REGEX_AFTER.has(prev)) return true;
  if (/[\w$]/.test(prev)) {
    let w = k;
    while (w >= 0 && /[\w$]/.test(src[w])) w -= 1;
    return REGEX_AFTER_WORD.has(src.slice(w + 1, k + 1));
  }
  return false;
}

/** The end offset (exclusive, flags included) of a regex literal at `i`, or -1 if it does not close on its line. */
export function regexLiteralEnd(src, i) {
  let inClass = false;
  for (let j = i + 1; j < src.length; j += 1) {
    const c = src[j];
    if (c === '\n') return -1;
    if (c === '\\') {
      j += 1;
      continue;
    }
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) {
      let end = j + 1;
      while (end < src.length && /[a-z]/.test(src[end])) end += 1;
      return end;
    }
  }
  return -1;
}

/** The source with comments blanked (strings kept), for rules that read lines. */
export function withoutComments(rel, src) {
  if (!/\.css$/.test(rel)) return lexSource(src, { blankStrings: false }).code;
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** A function from a source offset to its 1-based line number. */
export function lineIndex(src) {
  const starts = [0];
  for (let k = 0; k < src.length; k += 1) if (src[k] === '\n') starts.push(k + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/**
 * The end offset (exclusive) of the JSX opening tag that starts at `start`
 * (`<Name …>` or `<Name … />`): the first `>` outside braces and quotes.
 */
export function openingTagEnd(src, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0 && src[i - 1] !== '=') return i + 1;
  }
  return src.length;
}

/**
 * The attribute text of the JSX tag whose name ends at `start`, up to its `>`.
 * Every `{…}` expression is blanked to `{}` unless it is a bare string literal,
 * so an arrow's `>` in `onClick={() => …}` neither ends the tag early nor lets
 * a string inside a handler count as an attribute.
 */
export function attributeText(src, start) {
  let depth = 0;
  let quote = null;
  let out = '';
  let expr = '';
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      if (depth === 0) out += ch;
      else expr += ch;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      if (depth === 0) out += ch;
      else expr += ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) expr = '';
      else expr += ch;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        const literal = /^\s*(?:"[^"]*"|'[^']*'|`[^`$]*`)\s*$/.test(expr);
        out += literal ? `{${expr}}` : '{}';
      } else {
        expr += ch;
      }
      continue;
    }
    if (depth > 0) {
      expr += ch;
      continue;
    }
    if (ch === '>') return out;
    out += ch;
  }
  return out;
}

/**
 * The JSX expression of the attribute value that opens at `open` (a `{`), with
 * its braces balanced and quoted text skipped. Null when the braces never close.
 */
export function attributeExpression(tag, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < tag.length; i += 1) {
    const c = tag[i];
    if (quote) {
      if (c === quote && tag[i - 1] !== '\\') quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}' && --depth === 0) return tag.slice(open + 1, i).trim();
  }
  return null;
}

// ── rule helpers ──────────────────────────────────────────────────────────────

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isCommentLine = (line) => /^\s*(\/\/|\/\*|\*)/.test(line);

/**
 * An inline exception: `uix-page-rules-ignore <rule>: <reason>` (TENSOR's
 * `compliance-lint-ignore <rule>: <reason>` is read too) on the flagged line or
 * the line above, or on line 1 for a file-level rule. The reason is required.
 */
export function hasIgnore(lines, idx, rule, fileLevel = false) {
  const re = new RegExp(`(?:uix-page-rules-ignore|compliance-lint-ignore)\\s+${escapeRe(rule)}\\s*:\\s*\\S`);
  return re.test(lines[idx] ?? '') || re.test(lines[idx - 1] ?? '') || (fileLevel && re.test(lines[0] ?? ''));
}

/** An invisible submitter: `type="submit"`, `hidden`, `aria-hidden`. */
export function isHiddenSubmitter(attrs) {
  return (
    /(?:^|\s)type=(?:"submit"|'submit'|\{\s*["'`]submit["'`]\s*\})/.test(attrs) &&
    /(?:^|\s)hidden(?=\s|\/|$|=\{\s*true\s*\})/.test(attrs) &&
    /(?:^|\s)aria-hidden(?=[\s=/]|$)/.test(attrs) &&
    !/(?:^|\s)aria-hidden=(?:"false"|'false'|\{\s*false\s*\}|\{\s*["'`]false["'`]\s*\})/.test(attrs)
  );
}

/** `<input type="hidden">` carries a form value and draws nothing. */
export function isHiddenInput(attrs) {
  return /(?:^|\s)type=(?:"hidden"|'hidden'|\{\s*["'`]hidden["'`]\s*\})/.test(attrs);
}

/**
 * A class token without its variants: `sm:hover:px-2` → `px-2`, `!px-2` →
 * `px-2`. A `:` inside brackets (`text-[length:12px]`) is part of the value.
 */
export function baseUtility(token) {
  let depth = 0;
  let cut = 0;
  for (let k = 0; k < token.length; k += 1) {
    const ch = token[k];
    if (ch === '[') depth += 1;
    else if (ch === ']') depth = Math.max(0, depth - 1);
    else if (ch === ':' && depth === 0) cut = k + 1;
  }
  return token.slice(cut).replace(/^!/, '').replace(/!$/, '');
}

const utilities = (text) => text.split(/\s+/).filter(Boolean).map(baseUtility);

/** `title={t('k')}` → {kind:'key', value:'k'}; `title="X"` → {kind:'literal', value:'X'}. */
export function propToken(tag, prop) {
  const key = new RegExp(`\\b${prop}=\\{\\s*t\\(\\s*(['"\`])([^'"\`]+)\\1\\s*\\)\\s*\\}`).exec(tag);
  if (key) return { kind: 'key', value: key[2] };
  const lit = new RegExp(`\\b${prop}=(['"])([^'"]+)\\1`).exec(tag);
  if (lit) return { kind: 'literal', value: lit[2] };
  return null;
}

/**
 * The translation namespace `t` is bound to at `offset`: the last
 * `const t = useTranslations('ns')` / `await getTranslations('ns')` before it
 * (next-intl), or null when the file binds none. Two components in one file
 * can each bind their own `t`, so `t('title')` twice is not always one text.
 */
export function namespaceAt(src, offset) {
  let ns = null;
  for (const m of src.matchAll(/\bconst\s+t\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:\{[^}]*?namespace\s*:\s*)?(['"`])([^'"`]+)\1/g)) {
    if (m.index > offset) break;
    ns = m[2];
  }
  return ns;
}

/** The places a repeated title reads as a heading: heading props and h1–h4. */
function headingRepeatRes(token) {
  const v = escapeRe(token.value);
  if (token.kind === 'key') {
    const call = `\\{\\s*t\\(\\s*['"\`]${v}['"\`]\\s*\\)\\s*\\}`;
    return [new RegExp(`\\b(?:title|heading|caption)=${call}`, 'g'), new RegExp(`<h[1-4][^>]*>\\s*${call}`, 'g')];
  }
  return [
    new RegExp(`\\b(?:title|heading|caption)=(['"])${v}\\1`, 'g'),
    new RegExp(`<h[1-4][^>]*>\\s*${v}\\s*<`, 'g'),
  ];
}

/**
 * A menu names its row when any of its labels (`label`, or the trigger's
 * `aria-label`) interpolates something. A literal, `{t('k')}` alone or a bare
 * string expression names nothing.
 */
export function labelNamesRow(tag) {
  for (const m of tag.matchAll(/\b(?:aria-label|label)=/g)) {
    const at = m.index + m[0].length;
    if (tag[at] !== '{') continue;
    const expr = attributeExpression(tag, at);
    if (expr === null) continue;
    if (/^t\(\s*(['"`])[^'"`]+\1\s*\)$/.test(expr)) continue;
    if (/^(['"])[^'"]*\1$/.test(expr)) continue;
    if (/^`[^`$]*`$/.test(expr)) continue;
    return true;
  }
  return false;
}

const BREAK_ANYWHERE_RE =
  /(?<![\w-])break-all(?![\w-])|overflow-wrap\s*:\s*anywhere|\[overflow-wrap:anywhere\]|(?<![\w-])wrap-anywhere(?![\w-])|\boverflowWrap\s*:\s*(['"`])anywhere\1|\bwordBreak\s*:\s*(['"`])break-all\2/;
/** A hash, key or URL in code type may break anywhere: it has no words to keep. */
const CODE_TOKEN_RE = /\bfont-mono\b|<code\b|<pre\b/;
/**
 * "high" sent to a red tone by hand: an object map, a ternary or a one-line
 * case. Tone names are lower case, so a priority label ('high:high': 'P1') is
 * not a tone.
 */
const HIGH = '(?:high|High|HIGH)';
const RED_TONE = `['"\`](?:danger|critical|p1)['"\`]`;
// Matched over the whole comment-blanked source, so a Prettier-wrapped
// `case 'high':\n  return 'danger';` is one match.
const HIGH_TO_RED_RES = [
  new RegExp(`(?<![\\w:-])['"\`]?${HIGH}['"\`]?[ \\t]*:[ \\t]*${RED_TONE}`, 'g'),
  new RegExp(`['"\`]${HIGH}['"\`]\\s*\\)?\\s*\\?\\s*${RED_TONE}`, 'g'),
  new RegExp(`\\bcase\\s+['"\`]${HIGH}['"\`]\\s*:\\s*(?:return\\s+)?${RED_TONE}`, 'g'),
];
const JOIN_COMMA_RE = /\.join\(\s*(['"`]),\s?\1\s*\)/;
/**
 * A table row's data: TanStack's `row.original`, or `row.` / `getValue()` on
 * the line of a column's `cell:` / `render:` renderer. A `row` from a plain
 * `.map` in a description list or a form value is not a cell.
 */
const isRowCellData = (line) =>
  /\brow\.original\b/.test(line) ||
  (/\b(?:cell|render)\s*:/.test(line) && /\brow\.[A-Za-z_$]|\bgetValue\b/.test(line));
/** A tooltip `title={….join(', ')}` holds the full list on purpose; the cell shows less. */
const TOOLTIP_JOIN_RE = /\btitle=\{[^}]*\.join\(/;
/** A row's cell or action renderer: TanStack `cell:`, `row.original`, DataWorkspace `rowActions` / `render: (row) =>`. */
const ROW_CONTEXT_RE = /\bcell\s*:|\brow\.original\b|\browActions\s*[=:]|\brender\s*:\s*\(?\s*(?:row|item|record|r)\b/;
const HORIZONTAL_PADDING = /^p[xlrse]-(?!0$)/;
const LITERAL_FONT_SIZE = /^text-\[(?:length:)?(?:-?\d|-?\.\d|calc\(|clamp\(|min\(|max\()/;
/** After `fontSize`: a style key (`: 12`, `: '0.8rem'`) or a JSX prop (`={12}`, `="12px"`). */
const INLINE_FONT_SIZE = /^\s*(?::\s*|=\{\s*|=)(?:-?\.?\d|(["'`])\s*-?\.?\d)/;

/** Exported for the pill rule that waits on HAR-3817; not counted yet. */
export const isHandBuiltPill = (text) => {
  const tokens = utilities(text);
  return tokens.includes('rounded-full') && tokens.some((t) => HORIZONTAL_PADDING.test(t));
};

const kindOf = (rel) => {
  if (/\.css$/.test(rel)) return 'css';
  if (/\.(tsx|jsx)$/.test(rel)) return 'jsx';
  return 'script';
};

/**
 * Every finding in one source file (`rel` is the repo-relative posix path).
 * `.css` files get the mid-word-break rule only; `.ts`/`.js` files the
 * severity and mid-word-break rules; `.tsx`/`.jsx` files all of them.
 *
 * @param {string} rel
 * @param {string} src
 * @param {Partial<typeof DEFAULT_OPTIONS>} [options]
 * @returns {Finding[]}
 */
export function scanSource(rel, src, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const kind = kindOf(rel);
  const lines = src.split('\n');
  const out = [];
  const exempt = (rule) => Object.hasOwn(opts.exempt?.[rule] ?? {}, rel);
  const push = (rule, line, msg) => {
    if (exempt(rule)) return;
    out.push({ rule, file: rel, line, text: (lines[line - 1] ?? '').trim().slice(0, 160), msg });
  };

  // The line rules read the source with comments blanked (strings kept), so a
  // trailing `// never use break-all`, a `{/* … */}` in JSX or the middle of a
  // CSS block comment is not a finding. Ignore tags are read from `lines`.
  const clean = withoutComments(rel, src);
  const cleanLines = clean.split('\n');
  const lineOf = lineIndex(src);

  if (kind !== 'css') {
    const toneHelperRe = opts.genericToneHelpers.length
      ? new RegExp(`\\b(?:${opts.genericToneHelpers.map(escapeRe).join('|')})\\(\\s*['"\`]severity['"\`]`, 'g')
      : null;
    const seen = new Set();
    const flag = (index, msg) => {
      const line = lineOf(index);
      if (seen.has(line) || hasIgnore(lines, line - 1, RULE_SEVERITY_TONE)) return;
      seen.add(line);
      push(RULE_SEVERITY_TONE, line, msg);
    };
    for (const m of toneHelperRe ? clean.matchAll(toneHelperRe) : []) {
      flag(m.index, 'A generic status-tone helper colours this severity, so "high" turns red; use severityTone(severity).');
    }
    for (const re of HIGH_TO_RED_RES) {
      for (const m of clean.matchAll(re)) {
        flag(m.index, '"high" is mapped to a red tone by hand; the severity ramp keeps high amber: use severityTone(severity).');
      }
    }
  }

  cleanLines.forEach((text, i) => {
    if (BREAK_ANYWHERE_RE.test(text) && !CODE_TOKEN_RE.test(text) && !hasIgnore(lines, i, RULE_BREAK_ANYWHERE)) {
      push(RULE_BREAK_ANYWHERE, i + 1, 'A mid-word break (break-all / overflow-wrap: anywhere / wrap-anywhere) splits labels inside words.');
    }
    if (
      kind === 'jsx' &&
      JOIN_COMMA_RE.test(text) &&
      isRowCellData(text) &&
      !TOOLTIP_JOIN_RE.test(text) &&
      !hasIgnore(lines, i, RULE_LIST_JOINED)
    ) {
      push(RULE_LIST_JOINED, i + 1, 'A row\'s list joined with ", " in a table cell wraps the row; use the kit\'s ListSummary.');
    }
  });

  if (kind !== 'jsx') return out.sort((a, b) => a.line - b.line || COUNTED_RULES.indexOf(a.rule) - COUNTED_RULES.indexOf(b.rule));

  const { code, strings } = lexSource(src);

  // heading said twice — judged against the first page-title component's title.
  const titleRe = new RegExp(`<(?:${opts.pageTitleComponents.map(escapeRe).join('|')})(?=[\\s/>])`, 'g');
  const headerSpans = [...code.matchAll(titleRe)].map((m) => [m.index, openingTagEnd(src, m.index)]);
  if (opts.pageTitleComponents.length && headerSpans.length > 0) {
    const [s, e] = headerSpans[0];
    const token = propToken(src.slice(s, e), 'title');
    if (token) {
      const inHeader = (off) => headerSpans.some(([a, b]) => off >= a && off < b);
      const titleNs = token.kind === 'key' ? namespaceAt(src, s) : null;
      for (const re of headingRepeatRes(token)) {
        for (const m of clean.matchAll(re)) {
          if (inHeader(m.index)) continue;
          if (token.kind === 'key' && namespaceAt(src, m.index) !== titleNs) continue;
          const line = lineOf(m.index);
          if (hasIgnore(lines, line - 1, RULE_HEADING_TWICE, true)) continue;
          const said = token.kind === 'key' ? `t('${token.value}')` : `"${token.value}"`;
          push(RULE_HEADING_TWICE, line, `The page title (${said}) is said again as a heading or caption.`);
        }
      }
    }
  }

  // a row menu whose labels do not name the row.
  if (opts.rowMenuComponents.length) {
    const menuRe = new RegExp(`<(${opts.rowMenuComponents.map(escapeRe).join('|')})(?=[\\s/>])`, 'g');
    for (const m of code.matchAll(menuRe)) {
      const line = lineOf(m.index);
      const before = lines.slice(Math.max(0, line - 41), line);
      if (!before.some((l) => ROW_CONTEXT_RE.test(l))) continue;
      if (labelNamesRow(src.slice(m.index, openingTagEnd(src, m.index)))) continue;
      if (hasIgnore(lines, line - 1, RULE_ROW_MENU_UNNAMED)) continue;
      push(RULE_ROW_MENU_UNNAMED, line, `<${m[1]}> in a table row has no label that names its row.`);
    }
  }

  // kit controls drawn by hand.
  for (const m of code.matchAll(/<button(?=[\s/>])/g)) {
    if (isHiddenSubmitter(attributeText(src, m.index + m[0].length))) continue;
    push(RULE_RAW_BUTTON, lineOf(m.index), 'A raw <button> where the kit has Button, ButtonLink, Chip, MenuItem or RowAction.');
  }
  for (const m of code.matchAll(/<table(?=[\s/>])/g)) {
    push(RULE_RAW_TABLE, lineOf(m.index), 'A raw <table> where the kit has DataWorkspace and Table.');
  }
  for (const m of code.matchAll(/<(input|select|textarea)(?=[\s/>])/g)) {
    if (m[1] === 'input' && isHiddenInput(attributeText(src, m.index + m[0].length))) continue;
    push(RULE_RAW_FORM_CONTROL, lineOf(m.index), `A raw <${m[1]}> where the kit has the form control.`);
  }
  for (const { start, text } of strings) {
    for (const t of utilities(text)) {
      if (LITERAL_FONT_SIZE.test(t)) push(RULE_ARBITRARY_FONT_SIZE, lineOf(start), `A literal font size (${t}) off the kit type scale.`);
    }
  }
  for (const m of code.matchAll(/\bfontSize(?=\s*[:=])/g)) {
    if (INLINE_FONT_SIZE.test(src.slice(m.index + m[0].length, m.index + m[0].length + 24))) {
      push(RULE_ARBITRARY_FONT_SIZE, lineOf(m.index), 'A literal inline fontSize off the kit type scale.');
    }
  }

  return out.sort((a, b) => a.line - b.line || COUNTED_RULES.indexOf(a.rule) - COUNTED_RULES.indexOf(b.rule));
}
