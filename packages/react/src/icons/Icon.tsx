import { createElement, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { cx } from '../cx.js';
import type { IconNode, IconProps, UixIcon } from './types.js';

const SIZES = new Set(['sm', 'md', 'lg']);

/** Renders a glyph as an inline SVG; the props contract shared by every icon. */
export function renderIcon(node: IconNode, { size = 'md', tone = 'current', label, strokeWidth = 2, className, style, ...rest }: IconProps, ref?: unknown) {
  const tokenSize = typeof size === 'string' && SIZES.has(size);
  const length = typeof size === 'number' ? `${size}px` : tokenSize ? undefined : size;
  return createElement(
    'svg',
    {
      ref,
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      focusable: 'false',
      className: cx('uix-icon', tokenSize && size !== 'md' && `uix-icon--${size}`, tone !== 'current' && `uix-icon--${tone}`, className),
      style: length ? ({ width: length, height: length, ...style } as CSSProperties) : style,
      role: label ? 'img' : undefined,
      'aria-label': label || undefined,
      'aria-hidden': label ? undefined : true,
      ...rest,
    },
    node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
  );
}

/** Makes a named, ref-forwarding component for one glyph (the generated `<Name>Icon` exports). */
export function createIcon(displayName: string, node: IconNode): UixIcon {
  const Component = forwardRef<SVGSVGElement, IconProps>((props, ref) => renderIcon(node, props, ref));
  Component.displayName = displayName;
  return Component;
}
