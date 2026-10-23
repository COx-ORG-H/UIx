"use client";

import { useEffect, useRef, useState } from 'react';
import { isUnresolvedChoice } from '../filter-model.js';
import type { FilterField, FilterValue } from '../filter-model.js';

/**
 * A filter chip's field and value with the labels of ids restored from a URL or a saved view
 * (PR #168 review: a chip read "Assignee: usr_8f3a"). A `reference` value's choices without a
 * label, and an `enum` value's ids that are not among `field.options`, are looked up once with
 * `field.resolveLabels`. Until the answer arrives, and when the lookup fails, the ids show.
 * Internal: DataWorkspace and AuditLog summarise their chips through it.
 */
export function useResolvedFilterLabels(field: FilterField, value: FilterValue | undefined): { field: FilterField; value: FilterValue | undefined } {
  const [known, setKnown] = useState<ReadonlyMap<string, string>>(() => new Map());
  /** Ids already asked for, answered or not: an id the resolver does not know is not asked again. */
  const asked = useRef(new Set<string>());
  const resolver = useRef(field.resolveLabels);
  resolver.current = field.resolveLabels;
  const optionIds = new Set((field.options ?? []).map((o) => o.value));
  const missing = value?.kind === 'reference'
    ? value.values.filter(isUnresolvedChoice).map((v) => v.value)
    : value?.kind === 'enum' ? value.values.filter((v) => !optionIds.has(v)) : [];
  const key = missing.filter((id) => !known.has(id) && !asked.current.has(id)).join('\u0000');
  useEffect(() => {
    if (!key || !resolver.current) return;
    const ids = key.split('\u0000');
    for (const id of ids) asked.current.add(id);
    // No "still mounted" guard: StrictMode's second run finds the ids asked and relies on the first.
    resolver.current(ids).then(
      (choices) => setKnown((prev) => new Map([...prev, ...choices.map((c) => [c.value, c.label] as const)])),
      () => { /* a failed lookup keeps the ids: the chip still works */ },
    );
  }, [key]);

  if (known.size === 0 || !value) return { field, value };
  if (value.kind === 'reference') {
    return { field, value: { kind: 'reference', values: value.values.map((v) => (isUnresolvedChoice(v) && known.has(v.value) ? { value: v.value, label: known.get(v.value)! } : v)) } };
  }
  if (value.kind === 'enum') {
    const extra = value.values.filter((v) => !optionIds.has(v) && known.has(v)).map((v) => ({ value: v, label: known.get(v)! }));
    if (extra.length) return { field: { ...field, options: [...(field.options ?? []), ...extra] }, value };
  }
  return { field, value };
}
