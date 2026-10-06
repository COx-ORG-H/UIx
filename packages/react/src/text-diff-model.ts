/**
 * Two-way text diff for `TextDiff` (HAR-1368). Pure. Myers' O(ND) diff on lines or words,
 * after trimming the common prefix and suffix. Past `maxEdits` the changed middle is shown as
 * one replacement instead of searching further, so a rewrite never stalls the page.
 */

export type TextDiffGranularity = 'line' | 'word';

export interface TextDiffOp {
  type: 'equal' | 'insert' | 'delete';
  /** Lines (granularity `line`) or word, space and punctuation tokens (`word`). */
  tokens: string[];
}

export interface TextDiffOptions {
  granularity?: TextDiffGranularity;
  /** More tokens than this on either side gives `status: 'too-large'`. Default 20 000. */
  maxTokens?: number;
  /** Edit budget for the search; beyond it the middle becomes one replacement. Default 2 000. */
  maxEdits?: number;
}

export interface TextDiffResult {
  status: 'ok' | 'too-large';
  granularity: TextDiffGranularity;
  ops: TextDiffOp[];
  /** Lines, or words (not spaces or punctuation), added and removed. */
  added: number;
  removed: number;
}

const WORD_TOKENS = /\s+|[\p{L}\p{M}\p{N}_]+|[^\s\p{L}\p{M}\p{N}_]/gu;

/** Splits text into lines (without their `\r\n` / `\n`) or into word, space and punctuation tokens. */
export function tokenizeText(text: string, granularity: TextDiffGranularity): string[] {
  if (granularity === 'line') return text === '' ? [] : text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
  return text.match(WORD_TOKENS) ?? [];
}

function myers(a: readonly number[], b: readonly number[], maxEdits: number): TextDiffOp['type'][] | null {
  const n = a.length;
  const m = b.length;
  const limit = Math.min(n + m, maxEdits);
  const offset = limit + 1;
  const v = new Int32Array(2 * limit + 3);
  const trace: Int32Array[] = [];
  let found = -1;
  for (let d = 0; d <= limit && found < 0; d += 1) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x += 1; y += 1; }
      v[offset + k] = x;
      if (x >= n && y >= m) { found = d; break; }
    }
    trace.push(v.slice(offset - d, offset + d + 1));
  }
  if (found < 0) return null;
  const steps: TextDiffOp['type'][] = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d -= 1) {
    const prev = trace[d - 1];
    const at = (k: number) => prev[k + d - 1];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const prevX = at(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) { steps.push('equal'); x -= 1; y -= 1; }
    if (x === prevX) { steps.push('insert'); y -= 1; } else { steps.push('delete'); x -= 1; }
  }
  while (x > 0 && y > 0) { steps.push('equal'); x -= 1; y -= 1; }
  return steps.reverse();
}

function push(ops: TextDiffOp[], type: TextDiffOp['type'], token: string) {
  const last = ops[ops.length - 1];
  if (last?.type === type) last.tokens.push(token);
  else ops.push({ type, tokens: [token] });
}

/** Within each run of changes, deletions come before insertions; same-type neighbours merge. */
function normalize(ops: TextDiffOp[]): TextDiffOp[] {
  const out: TextDiffOp[] = [];
  let del: string[] = [];
  let ins: string[] = [];
  const flush = () => {
    if (del.length) out.push({ type: 'delete', tokens: del });
    if (ins.length) out.push({ type: 'insert', tokens: ins });
    del = [];
    ins = [];
  };
  for (const op of ops) {
    if (op.type === 'delete') del = del.concat(op.tokens);
    else if (op.type === 'insert') ins = ins.concat(op.tokens);
    else { flush(); const last = out[out.length - 1]; if (last?.type === 'equal') last.tokens.push(...op.tokens); else out.push({ type: 'equal', tokens: [...op.tokens] }); }
  }
  flush();
  return out;
}

/** A space between two changed words joins them, so "a b" → "c d" reads as one replacement. */
function absorbSpaces(ops: TextDiffOp[]): TextDiffOp[] {
  const out = ops.map((op) => ({ ...op, tokens: [...op.tokens] }));
  for (let i = 1; i < out.length - 1; i += 1) {
    const op = out[i];
    if (op.type === 'equal' && out[i - 1].type !== 'equal' && out[i + 1].type !== 'equal' && op.tokens.every((t) => /^\s+$/.test(t))) {
      out.splice(i, 1, { type: 'delete', tokens: op.tokens }, { type: 'insert', tokens: [...op.tokens] });
    }
  }
  return normalize(out);
}

/** Myers diff of two token lists. Tokens compare by string equality. */
export function diffTokens(a: readonly string[], b: readonly string[], maxEdits = 2000): TextDiffOp[] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA -= 1; endB -= 1; }
  const ids = new Map<string, number>();
  const id = (t: string) => { let v = ids.get(t); if (v === undefined) { v = ids.size; ids.set(t, v); } return v; };
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const steps = myers(midA.map(id), midB.map(id), maxEdits);
  const ops: TextDiffOp[] = [];
  for (const t of a.slice(0, start)) push(ops, 'equal', t);
  if (steps) {
    let i = 0;
    let j = 0;
    for (const step of steps) {
      if (step === 'equal') { push(ops, 'equal', midA[i]); i += 1; j += 1; }
      else if (step === 'delete') { push(ops, 'delete', midA[i]); i += 1; }
      else { push(ops, 'insert', midB[j]); j += 1; }
    }
  } else {
    for (const t of midA) push(ops, 'delete', t);
    for (const t of midB) push(ops, 'insert', t);
  }
  for (const t of a.slice(endA)) push(ops, 'equal', t);
  return normalize(ops);
}

const counts = (tokens: string[], granularity: TextDiffGranularity) =>
  granularity === 'line' ? tokens.length : tokens.filter((t) => /[\p{L}\p{N}]/u.test(t)).length;

/** Diffs two texts by line or by word, with added/removed counts. */
export function diffText(before: string, after: string, { granularity = 'line', maxTokens = 20000, maxEdits = 2000 }: TextDiffOptions = {}): TextDiffResult {
  const a = tokenizeText(before, granularity);
  const b = tokenizeText(after, granularity);
  if (a.length > maxTokens || b.length > maxTokens) return { status: 'too-large', granularity, ops: [], added: 0, removed: 0 };
  let ops = diffTokens(a, b, maxEdits);
  if (granularity === 'word') ops = absorbSpaces(ops);
  let added = 0;
  let removed = 0;
  for (const op of ops) {
    if (op.type === 'insert') added += counts(op.tokens, granularity);
    if (op.type === 'delete') removed += counts(op.tokens, granularity);
  }
  return { status: 'ok', granularity, ops, added, removed };
}

/** A run of text inside one line; `changed` marks the words that differ from the other side. */
export interface TextDiffSegment {
  text: string;
  changed: boolean;
}

export interface TextDiffLine {
  /** 1-based line number on its side. */
  number: number;
  /** Word-level marks when the line was paired with a similar counterpart; otherwise one changed segment. */
  segments: TextDiffSegment[];
}

export type TextDiffRow =
  | { kind: 'equal'; before: TextDiffLine; after: TextDiffLine }
  | { kind: 'change'; before: TextDiffLine; after: TextDiffLine }
  | { kind: 'delete'; before: TextDiffLine }
  | { kind: 'insert'; after: TextDiffLine }
  | { kind: 'fold'; count: number; rows: TextDiffRow[] };

const SIMILAR = 0.4;

/** Word-level marks for two lines, and how alike they are (shared characters / longer line). */
function compareLines(before: string, after: string): { similarity: number; left: TextDiffSegment[]; right: TextDiffSegment[] } {
  const longest = Math.max(before.length, after.length);
  if (longest === 0) return { similarity: 1, left: [{ text: '', changed: false }], right: [{ text: '', changed: false }] };
  if (before.length + after.length > 4000) return { similarity: 0, left: [{ text: before, changed: true }], right: [{ text: after, changed: true }] };
  const { ops } = diffText(before, after, { granularity: 'word', maxEdits: 400 });
  const left: TextDiffSegment[] = [];
  const right: TextDiffSegment[] = [];
  let same = 0;
  for (const op of ops) {
    const text = op.tokens.join('');
    if (op.type === 'equal') { same += text.replace(/\s/g, '').length; left.push({ text, changed: false }); right.push({ text, changed: false }); }
    else (op.type === 'delete' ? left : right).push({ text, changed: true });
  }
  const visible = Math.max(before.replace(/\s/g, '').length, after.replace(/\s/g, '').length) || 1;
  return { similarity: same / visible, left, right };
}

/**
 * Pairs removed and added lines of one change block by similarity, keeping order (a small
 * alignment DP), so a renumbered or lightly edited line sits opposite its new version.
 */
function alignBlock(deleted: string[], inserted: string[]): Array<[number | null, number | null, ReturnType<typeof compareLines> | null]> {
  const n = deleted.length;
  const m = inserted.length;
  const out: Array<[number | null, number | null, ReturnType<typeof compareLines> | null]> = [];
  if (n * m > 2500) {
    deleted.forEach((_, i) => out.push([i, null, null]));
    inserted.forEach((_, j) => out.push([null, j, null]));
    return out;
  }
  const cmp = deleted.map((d) => inserted.map((i) => compareLines(d, i)));
  const score = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const sim = cmp[i][j].similarity;
      score[i][j] = Math.max(score[i + 1][j], score[i][j + 1], sim >= SIMILAR ? sim + score[i + 1][j + 1] : 0);
    }
  }
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && cmp[i][j].similarity >= SIMILAR && score[i][j] === cmp[i][j].similarity + score[i + 1][j + 1]) { out.push([i, j, cmp[i][j]]); i += 1; j += 1; }
    else if (i < n && (j >= m || score[i][j] === score[i + 1][j])) { out.push([i, null, null]); i += 1; }
    else { out.push([null, j, null]); j += 1; }
  }
  return out;
}

/**
 * Rows for a line diff: unchanged lines, removed/added lines, and changed lines paired side by
 * side with word marks. With `context`, unchanged runs longer than needed fold into one row.
 */
export function textDiffRows(result: TextDiffResult, { context }: { context?: number } = {}): TextDiffRow[] {
  const rows: TextDiffRow[] = [];
  let left = 1;
  let right = 1;
  const ops = result.ops;
  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (op.type === 'equal') {
      for (const text of op.tokens) rows.push({ kind: 'equal', before: { number: left++, segments: [{ text, changed: false }] }, after: { number: right++, segments: [{ text, changed: false }] } });
      continue;
    }
    const deleted = op.type === 'delete' ? op.tokens : [];
    const inserted = op.type === 'insert' ? op.tokens : ops[i + 1]?.type === 'insert' ? ops[i + 1].tokens : [];
    if (op.type === 'delete' && ops[i + 1]?.type === 'insert') i += 1;
    for (const [d, n, pair] of alignBlock(deleted, inserted)) {
      if (pair && d !== null && n !== null) rows.push({ kind: 'change', before: { number: left++, segments: pair.left }, after: { number: right++, segments: pair.right } });
      else if (d !== null) rows.push({ kind: 'delete', before: { number: left++, segments: [{ text: deleted[d], changed: true }] } });
      else if (n !== null) rows.push({ kind: 'insert', after: { number: right++, segments: [{ text: inserted[n], changed: true }] } });
    }
  }
  if (context === undefined || context < 0) return rows;
  const out: TextDiffRow[] = [];
  for (let i = 0; i < rows.length;) {
    if (rows[i].kind !== 'equal') { out.push(rows[i]); i += 1; continue; }
    let j = i;
    while (j < rows.length && rows[j].kind === 'equal') j += 1;
    const keepHead = i === 0 ? 0 : context;
    const keepTail = j === rows.length ? 0 : context;
    const hidden = j - i - keepHead - keepTail;
    if (hidden > 1) {
      out.push(...rows.slice(i, i + keepHead));
      out.push({ kind: 'fold', count: hidden, rows: rows.slice(i + keepHead, j - keepTail) });
      out.push(...rows.slice(j - keepTail, j));
    } else out.push(...rows.slice(i, j));
    i = j;
  }
  return out;
}
