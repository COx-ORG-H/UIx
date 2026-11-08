"use client";

import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, ReactElement, HTMLAttributes } from 'react';
import { flushSync } from 'react-dom';
import { cx } from '../cx.js';
import { useAnchoredPosition } from '../hooks/useAnchoredPosition.js';
import type { Placement } from '../overlay-position.js';
import { KbdCombo, isKeyShortcut, spokenKeys, useKbdPlatform } from './Kbd.js';
import type { KeyShortcut } from './Kbd.js';
import { blurIn, markKeyOpened, tokenEase, tokenMs, tokenPx, watchInputModality } from '../motion.js';
import { prefersReducedMotion } from '../hooks/useReducedMotion.js';

/* The delay group (HAR-2578). A tooltip waits --uix-delay-tooltip before it opens on hover, so a
 * pointer passing over a toolbar does not flash a bubble per button. Once one has been shown, its
 * neighbours open at once: while any is open, and for --uix-delay-tooltip-skip after the last one
 * closed; the one it replaces goes at once, so two bubbles never overlap. Shared by every Tooltip
 * on the page. */
const group: { open: number; lastClosed: number; current: { current: (instant: boolean) => void } | null; bubble: HTMLElement | null; lastRect: DOMRect | null } = { open: 0, lastClosed: -Infinity, current: null, bubble: null, lastRect: null };

/* The hand-over between neighbours (2.60, animate-ui's tooltip rebuilt natively): when the pointer
 * moves to a neighbour while a bubble is open, the new bubble starts exactly where the old one is
 * and travels to its trigger on --uix-ease-tooltip, its background growing or shrinking from the
 * old size. Inside it the old label slides out the way the bubble came and the new one slides in
 * from the way it goes, both clipped to the background. The eye follows one bubble along the
 * toolbar. A bubble lingers --uix-delay-tooltip-skip after the pointer leaves, so crossing the gap
 * to a neighbour never drops it. Pointer only: focus moves and reduced motion swap at once. */
const MORPH_FALLBACK_MS = 1000;
/** How far a bubble may glide: a toolbar's neighbours, not a tooltip from across the page. */
const MORPH_MAX_TRAVEL_PX = 320;

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
  /** Where the bubble this one replaces stood, and its label, when it hands over (pointer, open neighbour). */
  const morphFrom = useRef<{ rect: DOMRect; label: Element | null } | null>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  const platform = useKbdPlatform();
  const childShortcut = isValidElement(children) ? (children.props as { shortcut?: unknown }).shortcut : undefined;
  const own = shortcut ?? (isKeyShortcut(childShortcut) ? childShortcut : undefined);
  const keys = own && own.length > 0 ? own : null;

  useAnchoredPosition(triggerRef, bubbleRef, { open, placement, offset: 6 });

  // The hand-over from the replaced neighbour, played back from where it stood (FLIP on transform,
  // and on the background's scale through two custom properties: the text itself never scales).
  useIsomorphicLayoutEffect(() => {
    const from = morphFrom.current;
    const b = bubbleRef.current;
    morphFrom.current = null;
    if (!open || !from || !b || prefersReducedMotion()) return undefined;
    const to = b.getBoundingClientRect();
    if (!to.width || !to.height) return undefined;
    const was = from.rect;
    const dx = was.left + was.width / 2 - (to.left + to.width / 2);
    const dy = was.top + was.height / 2 - (to.top + to.height / 2);
    // the delay group is page-wide: only a neighbour hands over; a bubble from across the page swaps
    if (Math.hypot(dx, dy) > MORPH_MAX_TRAVEL_PX) return undefined;
    // the labels slide along the way the bubble travels: the new one in from the way it goes, the old
    // one out the way it came (--uix-swap-x/-y: -1, 0 or 1 on the longer axis)
    const alongX = Math.abs(dx) >= Math.abs(dy);
    const way = Math.hypot(dx, dy) < 0.5 ? 0 : -Math.sign(alongX ? dx : dy);
    // the start is placed while the bubble is still [data-uix-instant] (no transitions), so its own
    // grow-in never runs towards the start offset; the hand-over takes over after one reflow
    b.setAttribute('data-uix-instant', '');
    b.setAttribute('data-morph', '');
    b.style.setProperty('--uix-swap-x', String(alongX ? way : 0));
    b.style.setProperty('--uix-swap-y', String(alongX ? 0 : way));
    // a transform, not `translate`: the overlay engine maps a transform when it re-measures mid-glide
    b.style.transform = `translate(${dx}px, ${dy}px)`;
    b.style.setProperty('--uix-morph-sx', String(was.width / to.width));
    b.style.setProperty('--uix-morph-sy', String(was.height / to.height));
    // both labels are cut to the growing background, so neither spills past it
    const content = b.querySelector<HTMLElement>('.uix-tooltip__content');
    const cs = window.getComputedStyle(b);
    const px = parseFloat(cs.paddingLeft) || 0;
    const py = parseFloat(cs.paddingTop) || 0;
    const insetY = (to.height - was.height) / 2;
    const insetX = (to.width - was.width) / 2;
    if (content) content.style.clipPath = `inset(${insetY - py}px ${insetX - px}px)`;
    // the old label, cloned from the bubble it replaces: it fills this bubble's padding box, so its
    // clip is the same background measured from there
    let leaving: HTMLElement | null = null;
    if (from.label) {
      leaving = document.createElement('span');
      leaving.className = 'uix-tooltip__content uix-tooltip__content--leaving';
      leaving.setAttribute('aria-hidden', 'true');
      const old = from.label.cloneNode(true) as HTMLElement;
      for (const el of [old, ...Array.from(old.querySelectorAll('[id]'))]) el.removeAttribute('id');
      leaving.appendChild(old);
      leaving.style.clipPath = `inset(${insetY}px ${insetX}px)`;
      b.appendChild(leaving);
    }
    void b.offsetWidth;
    b.removeAttribute('data-uix-instant');
    b.setAttribute('data-morphing', '');
    b.style.transform = '';
    b.style.removeProperty('--uix-morph-sx');
    b.style.removeProperty('--uix-morph-sy');
    if (content) content.style.clipPath = `inset(${-py}px ${-px}px)`;
    if (leaving) leaving.style.clipPath = 'inset(0px)';
    // the labels clear from (and the old one gathers) a short blur, driven per frame (motion.ts)
    const blur = tokenPx('--uix-swap-blur', 6);
    const label = content?.querySelector<HTMLElement>('.uix-tooltip__label');
    const stopIn = label ? blurIn([label], { from: blur, duration: tokenMs('--uix-dur-swap-in', 340), ease: tokenEase('--uix-ease-enter') }) : () => {};
    const oldLabel = leaving?.firstElementChild instanceof HTMLElement ? leaving.firstElementChild : null;
    const stopOut = oldLabel ? blurIn([oldLabel], { from: blur, duration: tokenMs('--uix-dur-swap-out', 130), ease: tokenEase('--uix-ease-leave'), leave: true }) : () => {};
    const end = () => {
      clearTimeout(timer);
      stopIn();
      stopOut();
      b.removeEventListener('transitionend', onEnd);
      b.removeAttribute('data-morph');
      b.removeAttribute('data-morphing');
      b.style.removeProperty('--uix-swap-x');
      b.style.removeProperty('--uix-swap-y');
      if (content) content.style.clipPath = '';
      leaving?.remove();
    };
    const onEnd = (event: TransitionEvent) => { if (event.target === b && !event.pseudoElement && event.propertyName === 'transform') end(); };
    b.addEventListener('transitionend', onEnd);
    const timer = setTimeout(end, MORPH_FALLBACK_MS);
    return end;
  }, [open]);

  useEffect(() => { watchInputModality(); }, []);

  const cancelClose = () => {
    if (closeTimer.current != null) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  const cancelOpen = () => {
    if (openTimer.current != null) { clearTimeout(openTimer.current); openTimer.current = null; }
  };
  /** `handOver`: the pointer moved here from a neighbour whose bubble is still open. */
  const reveal = (handOver: boolean) => {
    cancelOpen();
    // hand over from the neighbour still showing: its place, its size and its label
    const neighbour = group.current && group.current !== self && group.bubble?.matches(':popover-open') ? group.bubble : null;
    const rect = neighbour?.getBoundingClientRect();
    morphFrom.current = handOver && neighbour && rect && rect.width > 0
      ? { rect, label: neighbour.querySelector('.uix-tooltip__content:not(.uix-tooltip__content--leaving) > .uix-tooltip__label') }
      : null;
    if (group.current && group.current !== self) group.current.current(true);
    group.current = self;
    group.bubble = bubbleRef.current;
    const b = bubbleRef.current;
    if (b && !b.matches(':popover-open')) {
      b.toggleAttribute('data-uix-instant', handOver && !!neighbour);
      markKeyOpened(b);
      try { b.showPopover(); } catch { /* already open */ }
    }
    if (!shown.current) { shown.current = true; group.open += 1; }
    // placed and handed over in this frame: a bubble shown before it is positioned would be painted
    // for one frame at the viewport's corner (React renders a pointer event's update a frame later)
    flushSync(() => setOpen(true));
  };
  /** Keyboard focus opens at once; a pointer waits the delay unless the group is warm. */
  const show = (via: 'pointer' | 'focus') => {
    cancelClose();
    if (shown.current) return;
    const warm = group.open > 0 || performance.now() - group.lastClosed < tokenMs('--uix-delay-tooltip-skip', 300);
    if (via === 'focus' || warm) { reveal(via === 'pointer' && group.open > 0); return; }
    if (openTimer.current == null) openTimer.current = window.setTimeout(() => reveal(false), tokenMs('--uix-delay-tooltip', 400));
  };
  /** `instant`: replaced by a neighbour in the group — gone at once, no fade. */
  const hide = (instant = false) => {
    cancelClose();
    cancelOpen();
    const b = bubbleRef.current;
    if (b && b.matches(':popover-open')) {
      group.lastRect = b.getBoundingClientRect();
      b.toggleAttribute('data-uix-instant', instant);
      try { b.hidePopover(); } catch { /* already closed */ }
    }
    if (shown.current) { shown.current = false; group.open -= 1; group.lastClosed = performance.now(); }
    if (group.current === self) { group.current = null; group.bubble = null; }
    morphFrom.current = null;
    b?.querySelector('.uix-tooltip__content--leaving')?.remove();
    setOpen(false);
  };
  // A stable handle on this tooltip's latest `hide`, for the delay group.
  const self = useRef(hide);
  self.current = hide;
  // The bubble lingers --uix-delay-tooltip-skip after the pointer leaves: long enough to cross the
  // offset gap into it (1.4.13 hoverable) or the gap to a neighbour, which then takes it over.
  // Entering trigger or bubble cancels it. When it runs out, it closes only if the pointer is over
  // neither: a bubble that appears under a resting pointer and is then placed away from it gets a
  // `mouseleave` with the pointer still on the trigger (Firefox dispatches one after the move; the
  // trigger's `mouseenter` does not fire again, since the bubble is inside it).
  const scheduleHide = () => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      try { if (triggerRef.current?.matches(':hover')) return; } catch { /* no :hover support */ }
      hide();
    }, tokenMs('--uix-delay-tooltip-skip', 300));
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
      hide(true);
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
      onBlur={() => hide(true)}
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
        <span className="uix-tooltip__content">
          <span className="uix-tooltip__label">
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
      </span>
    </span>
  );
}
