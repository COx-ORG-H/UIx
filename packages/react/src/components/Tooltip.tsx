"use client";

import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, ReactElement, HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { KbdCombo, isKeyShortcut, spokenKeys, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';

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
 */
export function Tooltip({ label, content, placement = 'top', shortcut, className, children, ...props }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  const platform = useKbdPlatform();
  const childShortcut = isValidElement(children) ? (children.props as { shortcut?: unknown }).shortcut : undefined;
  const own = shortcut ?? (isKeyShortcut(childShortcut) ? childShortcut : undefined);
  const keys = own && own.length > 0 ? own : null;

  useAnchoredPosition(triggerRef, bubbleRef, { open, placement, offset: 6 });

  const cancelClose = () => {
    if (closeTimer.current != null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const show = () => {
    cancelClose();
    const b = bubbleRef.current;
    if (b && !b.matches(':popover-open')) { try { b.showPopover(); } catch { /* already open */ } }
    setOpen(true);
  };
  const hide = () => {
    cancelClose();
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) { try { b.hidePopover(); } catch { /* already closed */ } }
    setOpen(false);
  };
  // Small close delay so the pointer can cross the offset gap into the bubble (1.4.13 hoverable);
  // entering trigger or bubble cancels it.
  const scheduleHide = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(hide, 100);
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
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
      onFocus={show}
      onBlur={hide}
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
