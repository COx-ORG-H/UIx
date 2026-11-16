import { createElement, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { cx } from '../cx.js';
import type { IconNode, IconProps, UixIcon } from './types.js';

const SIZES = new Set(['sm', 'md', 'lg']);

/** Renders a glyph as an inline SVG; the props contract shared by every icon. */
export function renderIcon(node: IconNode, props: IconProps, ref?: unknown, name?: string, defaults: Pick<IconProps, 'size' | 'sizeMode'> = {}) {
  const { size = defaults.size ?? 'md', sizeMode = defaults.sizeMode ?? 'explicit', tone = 'current', label, strokeWidth = 2, animate, className, style, children, ...rest } = props;
  const tokenSize = typeof size === 'string' && SIZES.has(size);
  const intrinsic = sizeMode === 'intrinsic' && !tokenSize;
  const length = typeof size === 'number' ? `${size}px` : tokenSize ? undefined : size;
  const accessibleSvg = Boolean(label) || (sizeMode === 'intrinsic' && (Boolean(children) || Object.keys(rest).some((key) => key.startsWith('aria-') || key === 'role' || key === 'title')));
  const glyphChildren = node.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }));
  return createElement(
    'svg',
    {
      ref,
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 24 24',
      ...(intrinsic ? { width: size, height: size } : {}),
      fill: 'none',
      stroke: sizeMode === 'intrinsic' ? (rest.color ?? 'currentColor') : 'currentColor',
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      focusable: 'false',
      className: cx(intrinsic ? 'uix-icon-intrinsic' : 'uix-icon', tokenSize && size !== 'md' && `uix-icon--${size}`, tone !== 'current' && `uix-icon--${tone}`, className),
      style: !intrinsic && length ? ({ width: length, height: length, ...style } as CSSProperties) : style,
      role: label ? 'img' : undefined,
      'aria-label': label || undefined,
      'aria-hidden': accessibleSvg ? undefined : true,
      // the animated icons (2.60): icon.css keys each motion on the glyph's name
      'data-icon': animate && name ? name : undefined,
      'data-animate': animate ? '' : undefined,
      ...rest,
    },
    sizeMode === 'intrinsic' ? [...glyphChildren, ...(Array.isArray(children) ? children : [children])] : glyphChildren,
  );
}

/** Makes a named, ref-forwarding component for one glyph (the generated `<Name>Icon` exports). */
export function createIcon(displayName: string, node: IconNode, defaults?: Pick<IconProps, 'size' | 'sizeMode'>): UixIcon {
  // 'Trash2Icon' → 'trash-2', 'RefreshCwIcon' → 'refresh-cw': the glyph's name in icon-names.txt
  const name = displayName.replace(/Icon$/, '').replace(/([a-z0-9])([A-Z])|([a-zA-Z])(\d)/g, (_, a, b, c, d) => (a ? `${a}-${b}` : `${c}-${d}`)).toLowerCase();
  const Component = forwardRef<SVGSVGElement, IconProps>((props, ref) => renderIcon(node, props, ref, name, defaults));
  Component.displayName = displayName;
  return Component;
}
