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
  /**
   * Let the icon answer its control (2.60, the kit's animated icons). On a pointer hover over the
   * button, link, menu item or tab around it, an icon with a motion of its own plays it once: the
   * arrow nudges forward, plus and close turn a quarter, the gear turns one tooth, refresh turns
   * half, the bell tips, send lifts off, download and upload move their arrow, the bin lifts its lid,
   * copy shifts its front sheet, the star pops. A check draws itself when it appears (a copied or
   * saved state). Icons without a motion stay still. Off by default: keep it for occasional
   * actions, never for rows people pass a hundred times a day. Keyboard focus and reduced motion
   * never animate it.
   */
  animate?: boolean;
}

/** An icon component, e.g. `ShieldCheckIcon`. Replaces Lucide's `LucideIcon` type. */
export type UixIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
