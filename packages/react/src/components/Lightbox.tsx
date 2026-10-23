"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, SyntheticEvent } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useDialog } from '../hooks/useDialog.js';
import { useUixLabels } from '../labels-context.js';

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

/** What `renderOverlay` receives (HAR-1826). */
export interface LightboxOverlayContext {
  /** The item on show (0-based) and the item itself. */
  index: number;
  item: LightboxItem;
  /** The rendered `<img>` or `<video>`; `naturalWidth` / `videoWidth` give the bitmap size. */
  media: HTMLImageElement | HTMLVideoElement | null;
  /**
   * The overlay's size in CSS pixels. The overlay covers exactly the picture (not the letterbox
   * around a fitted one), so a point at `(x, y)` in it is bitmap pixel
   * `(x / width * naturalWidth, y / height * naturalHeight)`. 0 until the media has loaded.
   */
  width: number;
  height: number;
}

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
  /**
   * Buttons for the toolbar beside Close (HAR-1826), e.g. "Hide area" and "Undo" on a viewer
   * that redacts a screenshot. Tab order: these, then Close. They sit inside the dialog.
   */
  actions?: ReactNode;
  /**
   * Content laid over the picture, in the picture's own box: it moves and scales with the
   * fit / actual-size toggle. Pointer events on it never swipe or page, so it can draw. Each
   * child positions itself (`position: absolute` in `%`, or px of `width` / `height`).
   */
  renderOverlay?: (context: LightboxOverlayContext) => ReactNode;
  /**
   * Runs first for every key in the viewer. Call `event.preventDefault()` to claim the key:
   * the viewer then neither pages (arrows, Home, End) nor closes (Escape). For a draft that
   * arrow keys move and Escape cancels.
   */
  onKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
  /** Escape only: `event.preventDefault()` keeps the viewer open. */
  onEscapeKeyDown?: (event: KeyboardEvent<HTMLDialogElement>) => void;
}

type Box = { left: number; top: number; width: number; height: number };

/** The picture's rectangle inside a media element laid out with `object-fit: contain`. */
function containedBox(media: HTMLImageElement | HTMLVideoElement): Box {
  const boxW = media.clientWidth;
  const boxH = media.clientHeight;
  const naturalW = 'naturalWidth' in media ? media.naturalWidth : media.videoWidth;
  const naturalH = 'naturalHeight' in media ? media.naturalHeight : media.videoHeight;
  if (!naturalW || !naturalH || !boxW || !boxH) return { left: media.offsetLeft, top: media.offsetTop, width: boxW, height: boxH };
  const scale = Math.min(boxW / naturalW, boxH / naturalH);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return { left: media.offsetLeft + (boxW - width) / 2, top: media.offsetTop + (boxH - height) / 2, width, height };
}

const Chevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
  </svg>
);

/**
 * A full-screen media viewer over `.uix-lightbox` (HAR-1367; TENSOR C12 `capture-viewer.tsx`,
 * MOTUS C-8 programme gallery): previous/next buttons, ←/→ and Home/End, swipe on touch, an
 * announced "n of total" counter (not for a single item), a caption, and a fit/actual-size
 * toggle. Native `<dialog>`, so focus stays inside and Escape closes; focus returns to the
 * control that opened it. An annotating viewer (HAR-1826) adds toolbar `actions`, draws in
 * `renderOverlay`, and claims Escape and the arrows with `onKeyDown` while a draft is open.
 */
export function Lightbox({
  items, index, onIndexChange, open, onClose, loop = false, labels: labelOverrides, className,
  actions, renderOverlay, onKeyDown: onKeyDownProp, onEscapeKeyDown,
}: LightboxProps) {
  const labels = { ...DEFAULT_LIGHTBOX_LABELS, ...useUixLabels().lightbox, ...labelOverrides };
  /** Set by a claimed Escape keydown; a close request that still follows it reopens the dialog. */
  const escapeClaimed = useRef(false);
  const ref = useDialog(open, onClose, () => {
    const claimed = escapeClaimed.current;
    escapeClaimed.current = false;
    return claimed;
  });
  const mediaRef = useRef<HTMLImageElement & HTMLVideoElement>(null);
  /** The press began on the backdrop: a stroke drawn on the picture and released outside it is not a click on it. */
  const pressedBackdrop = useRef(false);
  const [overlayBox, setOverlayBox] = useState<Box | null>(null);
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
  // A claim lasts for its own key press only. Every key resets it first (capture, before the
  // dialog's handler), including one pressed while focus sits outside the dialog's subtree.
  useEffect(() => {
    if (!open) return;
    const reset = () => { escapeClaimed.current = false; };
    window.addEventListener('keydown', reset, true);
    return () => window.removeEventListener('keydown', reset, true);
  }, [open]);

  // The overlay follows the picture: measured after layout, again when the media loads or
  // resizes (window, zoom toggle). Only while an overlay is asked for.
  const hasOverlay = renderOverlay != null;
  const measure = useCallback(() => {
    const media = mediaRef.current;
    if (!media) { setOverlayBox(null); return; }
    const box = containedBox(media);
    setOverlayBox((prev) => (prev && prev.left === box.left && prev.top === box.top && prev.width === box.width && prev.height === box.height ? prev : box));
  }, []);
  useLayoutEffect(() => {
    if (!open || !hasOverlay) return;
    measure();
    const media = mediaRef.current;
    if (!media || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(media);
    return () => observer.disconnect();
  }, [open, index, zoomed, hasOverlay, measure]);

  const go = (to: number) => {
    if (total === 0) return;
    const next = loop ? (to + total) % total : Math.min(Math.max(to, 0), total - 1);
    if (next !== index) onIndexChange(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    onKeyDownProp?.(event);
    if (event.key === 'Escape' && !event.defaultPrevented) onEscapeKeyDown?.(event);
    if (event.defaultPrevented) {
      // A claimed Escape: Chromium then sends no close request; if a browser still does,
      // useDialog's keepOpen shows the dialog again.
      if (event.key === 'Escape') escapeClaimed.current = true;
      return;
    }
    if ((event.target as HTMLElement).closest('video')) return; // the player owns its arrow keys
    // A text field in the overlay or the toolbar (a label for an area) owns its arrows, Home and End.
    if ((event.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(total - 1); }
  };
  const onOverlay = (event: SyntheticEvent) => (event.target as HTMLElement).closest?.('.uix-lightbox__overlay') != null;
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // The overlay draws; a stroke on it is never a swipe.
    if (event.pointerType !== 'mouse' && !onOverlay(event)) swipe.current = { x: event.clientX, id: event.pointerId };
  };
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
      data-actions={actions != null || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => { pressedBackdrop.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        // Close only when the press began and ended on the backdrop: an annotation stroke released
        // past the picture's edge must not throw the draft away (PR #168 review).
        if (event.target === event.currentTarget && pressedBackdrop.current) onClose();
        pressedBackdrop.current = false;
      }}
    >
      {current && (
        <figure className="uix-lightbox__figure">
          <div className="uix-lightbox__stage" data-zoomed={zoomed || undefined} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
            {current.kind === 'video'
              ? <video ref={mediaRef} className="uix-lightbox__media" src={current.src} controls aria-label={current.alt} width={current.width} height={current.height} onLoadedMetadata={hasOverlay ? measure : undefined} />
              : <img ref={mediaRef} className="uix-lightbox__media" src={current.src} alt={current.alt} width={current.width} height={current.height} onLoad={hasOverlay ? measure : undefined} />}
            {renderOverlay && (
              <div
                className="uix-lightbox__overlay"
                style={(overlayBox
                  ? { left: overlayBox.left, top: overlayBox.top, width: overlayBox.width, height: overlayBox.height }
                  : { inset: 0 }) as CSSProperties}
              >
                {renderOverlay({ index, item: current, media: mediaRef.current, width: overlayBox?.width ?? 0, height: overlayBox?.height ?? 0 })}
              </div>
            )}
          </div>
          <figcaption className="uix-lightbox__bar">
            {total > 1 && <span className="uix-lightbox__counter" aria-live="polite">{fillLabel(labels.counter, { index: index + 1, total })}</span>}
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
      <div className="uix-lightbox__toolbar">
        {actions}
        <button ref={closeRef} type="button" className="uix-lightbox__close" aria-label={labels.close} onClick={onClose}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>
    </dialog>
  );
}
