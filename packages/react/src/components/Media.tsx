import type { ReactNode, HTMLAttributes } from 'react';
import { cx } from '../cx.js';

export interface MediaProps extends HTMLAttributes<HTMLDivElement> {
  /** Leading thumbnail (pass an `<img>`), rendered in `.uix-media__thumb`. */
  thumb?: ReactNode;
  /** Primary label (`.uix-media__name`). */
  name?: ReactNode;
  /** Secondary meta line (`.uix-media__meta`). */
  meta?: ReactNode;
  children?: ReactNode;
}

/** Media / asset row over `.uix-media` — a thumbnail beside a name + meta. */
export function Media({ thumb, name, meta, className, children, ...props }: MediaProps) {
  return (
    <div className={cx('uix-media', className)} {...props}>
      {thumb != null && <span className="uix-media__thumb">{thumb}</span>}
      <div>
        {name != null && <div className="uix-media__name">{name}</div>}
        {meta != null && <div className="uix-media__meta">{meta}</div>}
        {children}
      </div>
    </div>
  );
}
