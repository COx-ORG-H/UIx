"use client";

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useDialog } from '../hooks/useDialog.js';

export interface LightboxItem {
  src: string;
  /** Alternative text for an image; the video's name for a video. */
  alt: string;
  caption?: ReactNode;
  kind?: 'image' | 'video';
  /** Intrinsic size, so an SVG or a slow image keeps its box. */
  width?: number;
  height?: number;
}

export interface LightboxLabels {
  region: string;
  previous: string;
  next: string;
  close: string;
  /** `{index}`, `{total}`. */
  counter: string;
  zoomIn: string;
  zoomOut: string;
}

export const DEFAULT_LIGHTBOX_LABELS: LightboxLabels = {
  region: 'Media viewer',
  previous: 'Previous',
  next: 'Next',
  close: 'Close',
  counter: '{index} of {total}',
  zoomIn: 'Show actual size',
  zoomOut: 'Fit to screen',
};

export interface LightboxProps {
  items: readonly LightboxItem[];
  /** The item on show (0-based). */
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onClose: () => void;
  /** Wrap from the last item to the first. Default false. */
  loop?: boolean;
  labels?: Partial<LightboxLabels>;
  className?: string;
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

/**
 * A full-screen media viewer over `.uix-lightbox` (HAR-1367; TENSOR C12 `capture-viewer.tsx`,
 * MOTUS C-8 programme gallery): previous/next buttons, ←/→ and Home/End, swipe on touch, an
 * announced "n of total" counter, a caption, and a fit/actual-size toggle. Native `<dialog>`,
 * so focus stays inside and Escape closes; focus returns to the control that opened it.
 */
export function Lightbox({ items, index, onIndexChange, open, onClose, loop = false, labels: labelOverrides, className }: LightboxProps) {
  const labels = { ...DEFAULT_LIGHTBOX_LABELS, ...labelOverrides };
  const ref = useDialog(open, onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const swipe = useRef<{ x: number; id: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const total = items.length;
  const current = items[Math.min(Math.max(index, 0), Math.max(total - 1, 0))];
  const hasPrev = loop ? total > 1 : index > 0;
  const hasNext = loop ? total > 1 : index < total - 1;

  useEffect(() => {
    if (open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      closeRef.current?.focus();
    } else if (returnTo.current) {
      returnTo.current.focus?.();
      returnTo.current = null;
    }
  }, [open]);
  useEffect(() => { setZoomed(false); }, [index]);

  const go = (to: number) => {
    if (total === 0) return;
    const next = loop ? (to + total) % total : Math.min(Math.max(to, 0), total - 1);
    if (next !== index) onIndexChange(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if ((event.target as HTMLElement).closest('video')) return; // the player owns its arrow keys
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(total - 1); }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => { if (event.pointerType !== 'mouse') swipe.current = { x: event.clientX, id: event.pointerId }; };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== event.pointerId || zoomed) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
  };

  return (
    <dialog
      ref={ref}
      className={cx('uix-lightbox', 'uix-lightbox--gallery', className)}
      aria-label={labels.region}
      onKeyDown={onKeyDown}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {current && (
        <figure className="uix-lightbox__figure">
          <div className="uix-lightbox__stage" data-zoomed={zoomed || undefined} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            {current.kind === 'video'
              ? <video className="uix-lightbox__media" src={current.src} controls aria-label={current.alt} width={current.width} height={current.height} />
              : <img className="uix-lightbox__media" src={current.src} alt={current.alt} width={current.width} height={current.height} />}
          </div>
          <figcaption className="uix-lightbox__bar">
            <span className="uix-lightbox__counter" aria-live="polite">{fillLabel(labels.counter, { index: index + 1, total })}</span>
            {current.caption != null && <span className="uix-lightbox__caption">{current.caption}</span>}
            {current.kind !== 'video' && (
              <button type="button" className="uix-lightbox__tool" aria-pressed={zoomed} onClick={() => setZoomed((z) => !z)}>
                {zoomed ? labels.zoomOut : labels.zoomIn}
              </button>
            )}
          </figcaption>
        </figure>
      )}
      {total > 1 && (
        <>
          <button type="button" className="uix-lightbox__nav uix-lightbox__nav--prev" aria-label={labels.previous} disabled={!hasPrev} onClick={() => go(index - 1)}><Chevron dir="left" /></button>
          <button type="button" className="uix-lightbox__nav uix-lightbox__nav--next" aria-label={labels.next} disabled={!hasNext} onClick={() => go(index + 1)}><Chevron dir="right" /></button>
        </>
      )}
      <button ref={closeRef} type="button" className="uix-lightbox__close" aria-label={labels.close} onClick={onClose}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
      </button>
    </dialog>
  );
}
