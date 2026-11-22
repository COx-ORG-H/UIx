"use client";

import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { HTMLAttributes, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';

/** The words of an `ErrorSummary`, and the "Error:" a form's fields and the page title start with. */
export interface ErrorSummaryLabels {
  /** The summary's heading. GOV.UK's words: it names the state, not a fault of the person. */
  title: string;
  /**
   * Visually hidden before every field error a `useFormErrors` form shows, so a screen reader reads
   * "Error: Enter a title"; also the page title's prefix (`"Error: "` + title) while a summary shows.
   */
  errorPrefix: string;
}

export const DEFAULT_ERROR_SUMMARY_LABELS: ErrorSummaryLabels = {
  title: 'There is a problem',
  errorPrefix: 'Error:',
};

/** One entry of an `ErrorSummary`. */
export interface ErrorSummaryItem {
  /** The message: word for word what the field shows under its control. */
  message: ReactNode;
  /**
   * The id of the control the error belongs to. The entry links there, and following the link
   * focuses the control and scrolls its field into view. For a group (radios, a date in parts)
   * the first control of the group. If it is missing or cannot take focus, focus returns to the
   * summary without changing the URL. Absent for an error of the whole form: plain text, no link.
   */
  target?: string;
  /** React key. Default: `target`, else the position. */
  key?: string;
}

export interface ErrorSummaryProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The errors, in the order of the form. None renders nothing. */
  errors: readonly ErrorSummaryItem[];
  /** The heading. Default: `UixLabelsProvider` `errorSummary.title`, then "There is a problem". */
  title?: ReactNode;
  /** The heading's level (default 2: the summary sits above the page's `<h1>` content). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** A line under the heading, before the list. Usually none. */
  children?: ReactNode;
  /**
   * Change it to move focus to the summary again, e.g. the count of failed submits: a second failed
   * submit of a form whose summary is already showing takes focus back to it.
   */
  focusKey?: unknown;
  /** Take focus when the summary appears (default `true`), as GOV.UK does. */
  autoFocus?: boolean;
  /** Start the page title with "Error: " while the summary shows (default `true`). */
  prefixTitle?: boolean;
  labels?: Partial<ErrorSummaryLabels>;
}

/** The errors summarised at the top of a form, GOV.UK's pattern (`.uix-validation-summary`). */
export const ErrorSummary = forwardRef<HTMLDivElement, ErrorSummaryProps>(function ErrorSummary(
  { errors, title, headingLevel = 2, children, focusKey, autoFocus = true, prefixTitle = true, labels: labelsProp, className, ...props },
  forwardedRef,
) {
  const labels: ErrorSummaryLabels = { ...DEFAULT_ERROR_SUMMARY_LABELS, ...useUixLabels().errorSummary, ...labelsProp };
  const shown = errors.length > 0;
  const ref = useRef<HTMLDivElement | null>(null);
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useErrorTitle(prefixTitle && shown, `${labels.errorPrefix} `);

  // Focus when it appears (`autoFocus`) and on every change of `focusKey` while it shows.
  const focusedFor = useRef<{ key: unknown } | null>(null);
  useEffect(() => {
    if (!shown) { focusedFor.current = null; return; }
    const first = focusedFor.current === null;
    if (!first && Object.is(focusedFor.current?.key, focusKey)) return;
    focusedFor.current = { key: focusKey };
    if (first && !autoFocus) return;
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    scrollNearest(el);
  }, [shown, focusKey, autoFocus]);

  if (!shown) return null;
  const Heading = `h${headingLevel}` as 'h2';
  return (
    <div ref={setRef} className={cx('uix-validation-summary', className)} tabIndex={-1} data-uix-error-summary="" {...props}>
      {/* role="alert" sits on an element inside, not on the focus target: GOV.UK moved it there
          (v4.4.0) because JAWS read only the heading of an alert that was also focused. */}
      <div role="alert">
        <Heading className="uix-validation-summary__title">{title ?? labels.title}</Heading>
        {children != null && <div className="uix-validation-summary__body">{children}</div>}
        <ul className="uix-validation-summary__list">
          {/* Explicit tab stops keep recovery links reachable in WebKit's restricted keyboard mode. */}
          {errors.map((item, index) => (
            <li key={item.key ?? item.target ?? index}>
              {item.target
                ? <a href={`#${item.target}`} tabIndex={0} onClick={(event) => followErrorLink(event, item.target as string, ref.current)}>{item.message}</a>
                : item.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
});

/** Scroll an element into view inside every scroller that holds it (a Drawer body, a pane, the page), only as far as needed. */
function scrollNearest(el: Element) {
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch { /* no layout (jsdom) */ }
}

/**
 * Follow a summary link the way GOV.UK does: focus the control (no jump to its top edge) and
 * scroll its whole field, label to message, into view. A plain hash jump would scroll the label
 * out of sight and leave focus on the link.
 */
function followErrorLink(event: ReactMouseEvent<HTMLAnchorElement>, target: string, summary: HTMLDivElement | null) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const ownerDocument = event.currentTarget.ownerDocument;
  const control = ownerDocument.getElementById(target);
  event.preventDefault();
  control?.focus({ preventScroll: true });
  if (control && ownerDocument.activeElement === control) {
    scrollNearest(control.closest('.uix-field, fieldset') ?? control);
  } else if (summary) {
    // A conditional field may have disappeared or become disabled since submit. A hash jump
    // would leave the reader at a destination they cannot use, sometimes on an unrelated page anchor.
    summary.focus({ preventScroll: true });
    scrollNearest(summary);
  }
}

/** `title` with the error prefix in front, once: `errorTitle('Edit incident')` is "Error: Edit incident". */
export function errorTitle(title: string, prefix: string = `${DEFAULT_ERROR_SUMMARY_LABELS.errorPrefix} `): string {
  return title.startsWith(prefix) ? title : `${prefix}${title}`;
}

/**
 * How many mounted callers hold the prefix, so two summaries on one page add it once and the last
 * one out removes it; and whether the prefix is ours to remove (a title that already said "Error: "
 * before any summary showed keeps it).
 */
let titleHolders = 0;
let titleOwned = false;

/**
 * While `active`, the page title starts with `prefix` ("Error: "), GOV.UK's signal that the page
 * a screen reader announces after a submit has errors. `ErrorSummary` calls it; call it yourself
 * for errors shown without one. A router that sets the title itself should set `errorTitle(title)`.
 */
export function useErrorTitle(active: boolean, prefix: string = `${DEFAULT_ERROR_SUMMARY_LABELS.errorPrefix} `): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    titleHolders += 1;
    if (!document.title.startsWith(prefix)) {
      document.title = `${prefix}${document.title}`;
      titleOwned = true;
    }
    return () => {
      titleHolders -= 1;
      if (titleHolders > 0) return;
      if (titleOwned && document.title.startsWith(prefix)) document.title = document.title.slice(prefix.length);
      titleOwned = false;
    };
  }, [active, prefix]);
}
