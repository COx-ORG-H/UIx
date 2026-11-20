/* Concentric-corner rules for check-contract.mjs (section C), kept apart so tests can call them.
 *
 * A corner nested in a rounded container is --uix-radius-inner, worked out from the container's
 * --uix-radius-outer and --uix-radius-inset. Two hand-written shapes bypass that and are refused. */

const PX = /-?\d*\.?\d+px/g;
const RADIUS_PROPS = /^border(-(top|bottom|start|end)-(left|right|start|end))?-radius$/;

/** A corner written as a radius token minus something: `calc(var(--uix-radius-md) - 3px)` or
 * `calc(var(--uix-radius-md) - var(--uix-space-1))`. A scaled corner (`/ 2`) is not concentric. */
export const isHandComputedRadius = (prop, value) =>
  RADIUS_PROPS.test(prop.toLowerCase()) && /calc\(\s*var\(--uix-radius-[a-z0-9-]+\)\s*-/.test(value);

/** The raw px in a --uix-radius-inset value that are NOT the rule's own border width. The border
 * adds to the inset once, so each border width allows one occurrence; a second `1px`, or any other
 * px, is padding written raw (it must be --uix-space-*). `borderValues` are the values of the
 * rule's `border` / `border-width` declarations. */
export const strayInsetPx = (value, borderValues) => {
  const allowed = new Set(borderValues.flatMap((v) => v.match(PX) ?? []));
  const stray = [];
  for (const px of value.match(PX) ?? []) {
    if (allowed.has(px)) allowed.delete(px);
    else stray.push(px);
  }
  return stray;
};
