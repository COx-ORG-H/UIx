import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';

/** One glyph: SVG child elements as `[tag, attributes]`, drawn in a 24×24 box. */
export type IconNode = ReadonlyArray<readonly [string, Readonly<Record<string, string | number>>]>;

export type IconSize = 'sm' | 'md' | 'lg';
export type IconTone = 'current' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  /**
   * `sm` 16 px, `md` 20 px (default), `lg` 24 px — the `--uix-icon-*` tokens — or a CSS length
   * / pixel number. A sizing class from the product (e.g. a Tailwind `size-4`) also wins.
   */
  size?: IconSize | number | string;
  /** Colour from a UIx token. Default `current`: inherits the text colour. */
  tone?: IconTone;
  /**
   * Accessible name. With it the icon is `role="img"`; without it the icon is decorative
   * (`aria-hidden`). An icon-only button names the button instead, so leave this empty there.
   */
  label?: string;
  /** Stroke width in the 24-unit box. Default 2. */
  strokeWidth?: number | string;
}

/** An icon component, e.g. `ShieldCheckIcon`. Replaces Lucide's `LucideIcon` type. */
export type UixIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
