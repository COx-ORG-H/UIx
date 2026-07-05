/* FR-4 — TS / cssVar consumer example.
 *
 * `@tensor_1/tokens/ts` ships the --uix-* contract as typed constants keyed by a `UixTokenName`
 * string union, so every token read is checked at compile time:
 *   - cssVar[name] → `var(--uix-<name>)` (use in the browser; respects brand + dark at runtime)
 *   - light[name]  → the light-theme literal value (non-DOM: SSR, canvas, React Native)
 *   - dark[name]   → the dark override, or `undefined` where dark inherits light
 *   - num[name]    → the numeric value where a token is a plain number (spacing, z-index, …)
 *
 * Run the type-check + runtime asserts with: node examples/ts/verify.mjs
 */
import { cssVar, light, dark, num } from '@tensor_1/tokens/ts';

// Each member is read with its correct narrow type (see build/ts/tokens.d.ts):
const accentRef: string = cssVar.accent; // 'var(--uix-accent)'
const accentLight: string = light.accent; // the resolved light value
const accentDark: string | undefined = dark.accent; // dark is Partial — may be undefined
const space4: number | undefined = num['space-4']; // num is Partial<Record<…, number>>

// Union guard (documented, intentionally not compiled): an unknown token name is a type error —
//   const bad = cssVar['not-a-token']; // ✗ TS2537: 'not-a-token' is not a UixTokenName
// so a typo in a token name fails the build instead of silently resolving to undefined.

export const summary = { accentRef, accentLight, accentDark, space4 };
console.log('UIx tokens (typed):', summary);
