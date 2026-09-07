import type { JsonValue } from './json-value.js';

export type DiffKind = 'added' | 'removed' | 'changed' | 'conflicted';
export type DiffResolution = 'accept' | 'skip' | 'pending';

export interface DiffEntry {
  path: string;
  kind: DiffKind;
  base?: JsonValue;
  current?: JsonValue;
  incoming?: JsonValue;
}

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  conflicted: number;
  resolved: number;
  pending: number;
}

function isJsonObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function jsonEqual(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => jsonEqual(value, b[index]));
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    return aKeys.length === bKeys.length
      && aKeys.every((key, index) => key === bKeys[index] && jsonEqual(a[key], b[key]));
  }
  return false;
}

function classify(base: JsonValue | undefined, current: JsonValue | undefined, incoming: JsonValue | undefined): DiffKind {
  if (base === undefined) return 'added';
  if (incoming === undefined) return 'removed';
  const currentChanged = !jsonEqual(base, current);
  const incomingChanged = !jsonEqual(base, incoming);
  if (currentChanged && incomingChanged && !jsonEqual(current, incoming)) return 'conflicted';
  return 'changed';
}

export function buildThreeWayDiff(
  base: JsonValue | undefined,
  current: JsonValue | undefined,
  incoming: JsonValue | undefined,
  path = '$',
): DiffEntry[] {
  if (jsonEqual(current, incoming)) return [];
  if (isJsonObject(base) || isJsonObject(current) || isJsonObject(incoming)) {
    const objects = [base, current, incoming].filter(isJsonObject);
    const keys = [...new Set(objects.flatMap((value) => Object.keys(value)))].sort();
    return keys.flatMap((key) => buildThreeWayDiff(
      isJsonObject(base) ? base[key] : undefined,
      isJsonObject(current) ? current[key] : undefined,
      isJsonObject(incoming) ? incoming[key] : undefined,
      `${path}.${key}`,
    ));
  }
  return [{ path, kind: classify(base, current, incoming), base, current, incoming }];
}

export function summarizeDiff(entries: DiffEntry[], resolutions: Record<string, DiffResolution> = {}): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, changed: 0, conflicted: 0, resolved: 0, pending: 0 };
  entries.forEach((entry) => {
    summary[entry.kind] += 1;
    if ((resolutions[entry.path] ?? 'pending') === 'pending') summary.pending += 1;
    else summary.resolved += 1;
  });
  return summary;
}
