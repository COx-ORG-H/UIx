import { forwardRef } from 'react';
import { renderIcon } from './Icon.js';
import { ICON_GLYPHS } from './glyphs.js';
import type { IconName } from './glyphs.js';
import type { IconProps } from './types.js';

export interface IconByNameProps extends IconProps {
  name: IconName;
}

/**
 * An icon chosen by name at run time (e.g. from a config or an entity type). It imports the
 * whole set; a fixed icon should use its own component (`ShieldCheckIcon`) so bundlers keep
 * only the glyphs you use.
 */
export const Icon = forwardRef<SVGSVGElement, IconByNameProps>(function Icon({ name, ...props }, ref) {
  return renderIcon(ICON_GLYPHS[name], props, ref);
});
