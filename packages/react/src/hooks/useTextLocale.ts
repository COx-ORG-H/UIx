"use client";

import { useUixLabels } from '../labels-context.js';

/**
 * @internal The locale every kit search folds and every kit sort collates in (roadmap #15): the
 * `UixLabelsProvider` `locale` that a label pack sets, then its `dateFormat.locale`; `undefined`
 * outside a provider (the runtime's collation, no cross-script fold).
 */
export function useTextLocale(): string | undefined {
  // `locale` is read structurally: the label packs add it to `UixLabels` (plural-labels work).
  const labels = useUixLabels() as { locale?: unknown; dateFormat?: { locale?: string } };
  return (typeof labels.locale === 'string' && labels.locale ? labels.locale : undefined) ?? labels.dateFormat?.locale;
}
