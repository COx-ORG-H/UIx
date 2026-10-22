"use client";

import { useEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';

/** The words of `PrintSignature` (HAR-986). */
export interface PrintLayoutLabels {
  /** The caption under the signature line. */
  signature: string;
  /** The caption of the stamp box. */
  stamp: string;
}

export const DEFAULT_PRINT_LAYOUT_LABELS: PrintLayoutLabels = { signature: 'Signature', stamp: 'Stamp' };

export type PrintPageSize = 'A4' | 'A5';

export interface PrintLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** The paper. Default `A4` (210 × 297 mm); `A5` is 148 × 210 mm (a poster, a slip). */
  size?: PrintPageSize;
  /** Default `portrait`. */
  orientation?: 'portrait' | 'landscape';
  /** Repeats at the top of every printed page: the practice or store identity. */
  header?: ReactNode;
  /** Repeats at the foot of every printed page, before the page number. */
  footer?: ReactNode;
  /** "page / pages" in the bottom-right page margin of every printed page. Default `true`; never on a `singlePage` layout. */
  pageNumbers?: boolean;
  /**
   * One page and no more (a poster, a one-page readout): the header and footer are not
   * repeated, the layout is kept in one piece, and the screen preview is exactly one page tall.
   * When the content does not fit, the preview is outlined and `onOverflowChange(true)` is called,
   * so the product can shorten it before anyone prints.
   */
  singlePage?: boolean;
  /** Called with `true` when a `singlePage` layout's content is taller than its page, and `false` once it fits again. */
  onOverflowChange?: (overflowing: boolean) => void;
  /**
   * When printing, show only print layouts: everything else on the page (the app shell, the
   * toolbar with the Print button, toasts, dialogs) is hidden. Default `true`.
   */
  isolate?: boolean;
}

/**
 * A print document frame (HAR-986, HAR-1252; MEDx S20 "Nalaz i mišljenje" and the day list,
 * SHOPx PRE-01 A5 poster and SHOP-03 one-page readout): an A4 or A5 page with the paper's margins,
 * a header and a footer that repeat on every printed page, page numbers in the page margin, and
 * black-on-white tokens for everything inside, on screen (as a paper preview) and on paper. The
 * consumer supplies the sections; the browser's own print (`window.print()`) makes the pages.
 */
export function PrintLayout({
  size = 'A4', orientation = 'portrait', header, footer, pageNumbers = true, singlePage = false, onOverflowChange, isolate = true,
  className, children, ...props
}: PrintLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const report = useRef(onOverflowChange);
  report.current = onOverflowChange;

  // A single page that does not fit is outlined on screen and reported: measured, never clipped.
  useEffect(() => {
    const root = ref.current;
    if (!singlePage || !root || typeof ResizeObserver === 'undefined') return undefined;
    const content = root.querySelector<HTMLElement>(':scope > .uix-print-layout__page');
    if (!content) return undefined;
    // A layout starts as fitting; only a change is reported.
    let last = false;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const over = content.scrollHeight > content.clientHeight + 1;
      if (over === last) return;
      last = over;
      root.toggleAttribute('data-overflowing', over);
      report.current?.(over);
    };
    const observer = new ResizeObserver(() => { if (!frame) frame = requestAnimationFrame(measure); });
    observer.observe(content);
    for (const child of Array.from(content.children)) observer.observe(child);
    measure();
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); };
  }, [singlePage, children, header, footer]);

  const page = `uix-print-${size.toLowerCase()}${orientation === 'landscape' ? '-landscape' : ''}${pageNumbers && !singlePage ? '' : '-plain'}`;
  return (
    <div
      ref={ref}
      className={cx('uix-print-layout', className)}
      data-size={size}
      data-orientation={orientation}
      data-page={page}
      data-single-page={singlePage ? '' : undefined}
      data-isolate={isolate ? '' : undefined}
      {...props}
    >
      {/* A real table, for layout only: Chromium repeats a <thead> and a <tfoot> on every printed
          page, and a CSS table built of divs it does not (measured, HAR-986). On screen the
          stylesheet lays it out as a column. */}
      <table className="uix-print-layout__page" role="presentation">
        {header != null && <thead className="uix-print-layout__header"><tr><td><div className="uix-print-layout__bar">{header}</div></td></tr></thead>}
        <tbody className="uix-print-layout__main"><tr><td className="uix-print-layout__body">{children}</td></tr></tbody>
        {footer != null && <tfoot className="uix-print-layout__footer"><tr><td><div className="uix-print-layout__bar">{footer}</div></td></tr></tfoot>}
      </table>
    </div>
  );
}

export interface PrintSignatureProps extends HTMLAttributes<HTMLDivElement> {
  /** The caption under the line. Default `labels.signature`. */
  label?: ReactNode;
  /** The signer's printed name and title under the caption, e.g. "dr. Amra Hadžić, spec. pedijatrije". */
  name?: ReactNode;
  /** Place and date at the start of the block, e.g. "Sarajevo, 22. 10. 2026.". */
  placeAndDate?: ReactNode;
  /** A box for the stamp beside the signature. */
  stamp?: boolean;
  labels?: Partial<PrintLayoutLabels>;
}

/** A signature line (and an optional stamp box) that is never split across two pages. */
export function PrintSignature({ label, name, placeAndDate, stamp = false, labels: labelsProp, className, ...props }: PrintSignatureProps) {
  const uixLabels = useUixLabels();
  const labels: PrintLayoutLabels = { ...DEFAULT_PRINT_LAYOUT_LABELS, ...uixLabels.printLayout, ...labelsProp };
  return (
    <div className={cx('uix-print-signature', className)} {...props}>
      {placeAndDate != null && <div className="uix-print-signature__place">{placeAndDate}</div>}
      <div className="uix-print-signature__field">
        <div className="uix-print-signature__line" aria-hidden="true" />
        <div className="uix-print-signature__caption">{label ?? labels.signature}</div>
        {name != null && <div className="uix-print-signature__name">{name}</div>}
      </div>
      {stamp && <div className="uix-print-signature__stamp"><span>{labels.stamp}</span></div>}
    </div>
  );
}

/** Starts a new printed page here. On screen it is a dashed line, so the preview shows where the page ends. */
export function PrintPageBreak({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('uix-print-break', className)} role="presentation" {...props} />;
}
