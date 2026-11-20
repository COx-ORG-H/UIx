import type { DiffEntry, DiffResolution } from './diff-model.js';
import { isJsonObject, jsonEqual } from './json-value.js';
import type { JsonValue } from './json-value.js';

/** One field someone else changed while the record was being edited. */
export interface RecordConflictChange {
  /**
   * The diff path, `$.priority` (`$` for a record that is a single value), as `DiffViewer` and
   * `labelFor` read it. A dot or backslash inside a key is escaped (`$.a\.b`).
   */
  path: string;
  /** The keys from the record's root to the field, unescaped: what the merge follows. */
  keys: readonly string[];
  /** The value when editing started. */
  base: JsonValue | undefined;
  /** The value in the form now. */
  yours: JsonValue | undefined;
  /** The value saved by someone else. */
  theirs: JsonValue | undefined;
  /** You changed it too, to something else: a choice is needed. */
  overlap: boolean;
}

const own = (record: JsonValue | undefined, key: string): JsonValue | undefined =>
  (isJsonObject(record) && Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined);

const pathOf = (keys: readonly string[]) => `$${keys.map((key) => `.${key.replace(/[\\.]/g, '\\$&')}`).join('')}`;

/**
 * Walk the three versions together. A level is compared key by key only where both the form and
 * the latest record hold an object; anywhere else (one side removed or replaced the object) the
 * whole value is one change, so a removed subtree is removed, not left as an empty object.
 */
function walk(
  base: JsonValue | undefined, yours: JsonValue | undefined, theirs: JsonValue | undefined, keys: readonly string[], out: RecordConflictChange[],
) {
  if (jsonEqual(yours, theirs)) return;
  if (isJsonObject(yours) && isJsonObject(theirs)) {
    const names = [...new Set([...Object.keys(yours), ...Object.keys(theirs), ...(isJsonObject(base) ? Object.keys(base) : [])])].sort();
    for (const key of names) walk(own(base, key), own(yours, key), own(theirs, key), [...keys, key], out);
    return;
  }
  if (jsonEqual(base, theirs)) return; // only you changed it
  out.push({ path: pathOf(keys), keys, base, yours, theirs, overlap: !jsonEqual(base, yours) });
}

/**
 * What someone else changed since editing started (`base`), compared with the form (`yours`):
 * every field whose saved value (`theirs`) moved away from `base` and is not already what the form
 * holds. A field only you changed is not listed; nothing of yours is lost.
 */
export function recordConflictChanges(base: JsonValue | undefined, yours: JsonValue | undefined, theirs: JsonValue | undefined): RecordConflictChange[] {
  const out: RecordConflictChange[] = [];
  walk(base, yours, theirs, [], out);
  return out;
}

/** The entries `DiffViewer` shows for these changes: a field both changed is `conflicted`. */
export function recordConflictEntries(changes: readonly RecordConflictChange[]): DiffEntry[] {
  return changes.map((change) => ({
    path: change.path,
    kind: change.overlap ? 'conflicted' : change.base === undefined ? 'added' : change.theirs === undefined ? 'removed' : 'changed',
    base: change.base,
    current: change.yours,
    incoming: change.theirs,
  }));
}

/**
 * `record` with `value` at `keys` (`undefined` removes it). Copies, never mutates; writes own data
 * properties, so a key such as `__proto__` from parsed JSON stays a field and never sets a prototype.
 */
function setAt(record: JsonValue | undefined, keys: readonly string[], value: JsonValue | undefined): JsonValue | undefined {
  if (!keys.length) return value;
  const [key, ...rest] = keys;
  const target: { [key: string]: JsonValue } = isJsonObject(record) ? { ...record } : {};
  const next = setAt(own(target, key), rest, value);
  if (next === undefined) delete target[key];
  else Object.defineProperty(target, key, { value: next, writable: true, enumerable: true, configurable: true });
  return target;
}

/**
 * The record to continue editing with: the latest saved one (`theirs`), with every change of yours
 * kept. `resolutions` decide per field (by path): `skip` keeps yours, `accept` and an undecided
 * `pending` take theirs; so with none, a field you both changed takes theirs.
 */
export function mergeRecordConflict(
  base: JsonValue | undefined,
  yours: JsonValue | undefined,
  theirs: JsonValue | undefined,
  resolutions: Readonly<Record<string, DiffResolution>> = {},
): JsonValue | undefined {
  let merged = yours;
  for (const change of recordConflictChanges(base, yours, theirs)) {
    if (resolutions[change.path] === 'skip') continue;
    merged = setAt(merged, change.keys, change.theirs);
  }
  return merged;
}
