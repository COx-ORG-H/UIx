/* @uix registry item — ported from @itsmx/shared-ui/src/utils.ts */
import clsx, { type ClassValue } from 'clsx';

/**
 * Class-name composer. Filters falsy values and dedupes whitespace. A
 * thinner `cn()` than the typical clsx+tailwind-merge pair: we accept that
 * later conflicting Tailwind classes win (last-wins is the Tailwind contract
 * since v3 anyway).
 */
export const cn = (...inputs: ClassValue[]): string => clsx(inputs);
