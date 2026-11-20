import { buildThreeWayDiff } from './diff-model.js';
import type { DiffEntry, DiffResolution } from './diff-model.js';
import { isJsonObject, jsonEqual } from './json-value.js';
import type { JsonValue } from './json-value.js';

/** One field someone else changed while the record was being edited. */
export interface RecordConflictChange {
  /** The diff path, `$.priority` (`$` for a record that is a single value). */
  path: string;
  /** The value when editing started. */
  base: JsonValue | undefined;
  /** The value in the form now. */
  yours: JsonValue | undefined;
  /** The value saved by someone else. */
  theirs: JsonValue | undefined;
  /** You changed it too, to something else: a choice is needed. */
  overlap: boolean;
}

/**
 * What someone else changed since editing started (`base`), compared with the form (`yours`):
 * every field whose saved value (`theirs`) moved away from `base` and is not already what the form
 * holds. A field only you changed is not listed; nothing of yours is lost.
 */
export function recordConflictChanges(base: JsonValue | undefined, yours: JsonValue | undefined, theirs: JsonValue | undefined): RecordConflictChange[] {
  return buildThreeWayDiff(base, yours, theirs)
    .filter((entry) => !jsonEqual(entry.base, entry.incoming))
    .map((entry) => ({
      path: entry.path,
      base: entry.base,
      yours: entry.current,
      theirs: entry.incoming,
      overlap: !jsonEqual(entry.base, entry.current),
    }));
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

const keysOf = (path: string): string[] => (path === '$' ? [] : path.replace(/^\$\./, '').split('.'));

function setAt(record: JsonValue | undefined, keys: readonly string[], value: JsonValue | undefined): JsonValue | undefined {
  if (!keys.length) return value;
  const [key, ...rest] = keys;
  const target: { [key: string]: JsonValue } = isJsonObject(record) ? { ...record } : {};
  const next = setAt(target[key], rest, value);
  if (next === undefined) delete target[key];
  else target[key] = next;
  return target;
}

/**
 * The record to continue editing with: the latest saved one (`theirs`), with every change of yours
 * kept. `resolutions` decide per field (by path): `skip` keeps yours, `accept` and an undecided
 * `pending` take theirs; so with none, a field you both changed takes theirs. Paths follow `buildThreeWayDiff` (`$.a.b`), so keys must
 * not contain dots.
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
    merged = setAt(merged, keysOf(change.path), change.theirs);
  }
  return merged;
}
