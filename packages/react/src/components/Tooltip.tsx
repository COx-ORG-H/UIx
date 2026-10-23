"use client";

import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, ReactElement, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { KbdCombo, isKeyShortcut, spokenKeys, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';
import { markKeyOpened, tokenMs, watchInputModality } from '../motion.js';

/* The delay group (HAR-2578). A tooltip waits --uix-delay-tooltip before it opens on hover, so a
 * pointer passing over a toolbar does not flash a bubble per button. Once one has been shown, its
 * neighbours open at once: while any is open, and for --uix-delay-tooltip-skip after the last one
 * closed; the one it replaces goes at once, so two bubbles never overlap. Shared by every Tooltip
 * on the page. */
const group: { open: number; lastClosed: number; current: { current: (instant: boolean) => void } | null } = { open: 0, lastClosed: -Infinity, current: null };

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

export interface TooltipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content'> {
  /** Tooltip text. Pass this or `content`. */
  label?: string;
  /**
   * Rich, non-interactive tooltip content, e.g. a short list (HAR-1349; TENSOR A3). It is
   * still a `role="tooltip"` description: no links or buttons inside — use `InfoTip` or
   * `Popover` for content the user must reach. Wins over `label` when both are set.
   */
  content?: ReactNode;
  /** Preferred placement. Default `'top'`. */
  placement?: Placement;
  /**
   * The trigger's keyboard shortcut, in `KbdCombo` key names, e.g. `['Mod', 'K']` (HAR-2031):
   * shown with `Kbd` after the text. Screen readers hear it once, in the trigger's description
   * after the text ("Keyboard shortcuts, Shift+?"), the same rule as a `Button` with `shortcut`
   * (HAR-2416). Default: the `shortcut` of a `Button` child, so a Tooltip around a Button with a
   * shortcut shows one bubble with the label and the keys. The kit only shows it: the product
   * binds the key.
   */
  shortcut?: KeyShortcut;
  children?: ReactNode;
}

/**
 * Tooltip whose bubble renders in the top layer via the native Popover API, so it
 * escapes any `overflow: hidden/scroll` ancestor that would clip the old CSS-only
 * `[data-uix-tip]` tooltip (UIX-FIX-02). Positioned by the shared overlay engine
 * (flip/shift), shown on hover and keyboard focus, dismissed on blur or Escape
 * (document-level, per WCAG 1.4.13), and hoverable: the bubble stays open while
 * the pointer is over it (UIX-A11Y-1).
 *
 * While the bubble is open it takes the first Escape (HAR-2415), also on a combobox-style trigger
 * whose list is open (a Select, a date field): one Escape closes the bubble, the next one the list.
 */
export function Tooltip({ label, content, placement = 'top', shortcut, className, children, ...props }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);
  const openTimer = useRef<number | null>(null);
  const shown = useRef(false);
  const [open, setOpen] = useState(false);
  const id = useId();
  const platform = useKbdPlatform();
  const childShortcut = isValidElement(children) ? (children.props as { shortcut?: unknown }).shortcut : undefined;
  const own = shortcut ?? (isKeyShortcut(childShortcut) ? childShortcut : undefined);
  const keys = own && own.length > 0 ? own : null;

  useAnchoredPosition(triggerRef, bubbleRef, { open, placement, offset: 6 });

  useEffect(() => { watchInputModality(); }, []);

  const cancelClose = () => {
    if (closeTimer.current != null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const cancelOpen = () => {
    if (openTimer.current != null) { clearTimeout(openTimer.current); openTimer.current = null; }
  };
  /** `instant`: inside the delay group — no fade either. */
  const reveal = (instant: boolean) => {
    cancelOpen();
    if (group.current && group.current !== self) group.current.current(true);
    group.current = self;
    const b = bubbleRef.current;
    if (b && !b.matches(':popover-open')) {
      b.toggleAttribute('data-uix-instant', instant);
      markKeyOpened(b);
      try { b.showPopover(); } catch { /* already open */ }
    }
    if (!shown.current) { shown.current = true; group.open += 1; }
    setOpen(true);
  };
  /** Keyboard focus opens at once; a pointer waits the delay unless the group is warm. */
  const show = (via: 'pointer' | 'focus') => {
    cancelClose();
    if (shown.current) return;
    const warm = group.open > 0 || performance.now() - group.lastClosed < tokenMs('--uix-delay-tooltip-skip', 300);
    if (via === 'focus' || warm) { reveal(via === 'pointer'); return; }
    if (openTimer.current == null) openTimer.current = window.setTimeout(() => reveal(false), tokenMs('--uix-delay-tooltip', 400));
  };
  /** `instant`: replaced by a neighbour in the group — gone at once, no fade. */
  const hide = (instant = false) => {
    cancelClose();
    cancelOpen();
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) {
      b.toggleAttribute('data-uix-instant', instant);
      try { b.hidePopover(); } catch { /* already closed */ }
    }
    if (shown.current) { shown.current = false; group.open -= 1; group.lastClosed = performance.now(); }
    if (group.current === self) group.current = null;
    setOpen(false);
  };
  // A stable handle on this tooltip's latest `hide`, for the delay group.
  const self = useRef(hide);
  self.current = hide;
  // Small close delay so the pointer can cross the offset gap into the bubble (1.4.13 hoverable);
  // entering trigger or bubble cancels it. When it runs out, it closes only if the pointer is over
  // neither: a bubble that appears under a resting pointer and is then placed away from it gets a
  // `mouseleave` with the pointer still on the trigger (Firefox dispatches one after the move; the
  // trigger's `mouseenter` does not fire again, since the bubble is inside it).
  const scheduleHide = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      try { if (triggerRef.current?.matches(':hover')) return; } catch { /* no :hover support */ }
      hide();
    }, 100);
  };

  // Esc dismisses without moving focus (1.4.13 dismissible), even when focus is elsewhere. That
  // Escape is the bubble's alone (HAR-2415): taken in the capture phase and cancelled, so a Drawer
  // or Modal around the trigger neither closes nor asks "Discard changes?"; the next Escape is
  // theirs. A layout effect, so an Escape right after the bubble opened already finds it.
  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      hide();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // hide the top-layer bubble if the trigger unmounts while shown
  useEffect(() => () => {
    if (closeTimer.current != null) clearTimeout(closeTimer.current);
    if (openTimer.current != null) clearTimeout(openTimer.current);
    if (shown.current) { shown.current = false; group.open -= 1; group.lastClosed = performance.now(); }
    if (group.current === self) group.current = null;
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* noop */ } }
  }, []);

  // `popover` is a valid HTML attribute but absent from React 18's DOM types.
  const bubbleAttr = { popover: 'manual' } as Record<string, string>;

  // aria-describedby belongs on the focusable child, not the wrapper, so SRs announce it from
  // the control itself; existing describedby values are preserved (same merge as Field —
  // UIX-A11Y-1). Non-element children (plain text/icon) keep it on the wrapper, which becomes
  // focusable so the tooltip is keyboard-reachable.
  // With keys, the description is the text and the spoken keys, each by id: a closed bubble is
  // hidden, and a description taken from a hidden element also reads its aria-hidden glyphs
  // ("Shift+? Shift ?"). The keys are said once (HAR-2416).
  const text = content ?? label;
  const description = keys ? [text != null ? `${id}-text` : null, `${id}-keys`].filter(Boolean).join(' ') : id;
  const single = isValidElement(children);
  const child = single
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby': [((children as ReactElement).props as Record<string, unknown>)['aria-describedby'], description]
          .filter(Boolean).join(' '),
      })
    : children;

  return (
    <span
      ref={triggerRef}
      className={cx('uix-tooltip', className)}
      aria-describedby={single ? undefined : description}
      tabIndex={single ? undefined : 0}
      onMouseEnter={() => show('pointer')}
      onMouseLeave={scheduleHide}
      onFocus={() => show('focus')}
      onBlur={() => hide()}
      {...props}
    >
      {child}
      <span
        ref={bubbleRef}
        id={id}
        role="tooltip"
        className="uix-tooltip__bubble"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleHide}
        {...bubbleAttr}
      >
        {keys ? (
          <>
            {text != null && <span id={`${id}-text`}>{text}</span>}
            <span className="uix-tooltip__shortcut">
              <span id={`${id}-keys`} className="uix-visually-hidden">{spokenKeys(keys, platform)}</span>
              <KbdCombo keys={[...keys]} platform={platform} aria-hidden="true" />
            </span>
          </>
        ) : text}
      </span>
    </span>
  );
}
