"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { HTMLAttributes } from 'react';
import { cx } from '../cx.js';
import { helpParagraphs } from '../info-tip-model.js';
import type { Placement } from '../overlay-position.js';
import { Popover } from './Popover.js';

/** Hover intent before the panel opens, and the grace period to cross into it (WCAG 1.4.13 hoverable). */
const OPEN_DELAY = 300;
const CLOSE_DELAY = 100;

export interface InfoTipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'content' | 'children'> {
  /**
   * Help text, rendered as plain text (never HTML). A blank line starts a new paragraph.
   * Empty or whitespace-only text renders nothing, so a missing help string needs no guard.
   */
  content: string;
  /** Accessible name of the ? button, e.g. "About: Incidents". The consumer localises it. */
  label: string;
  /** Preferred panel placement. Default `'bottom-start'`. */
  placement?: Placement;
}

/* Material Symbols "question_mark" (Google, Apache-2.0), cropped to its own bounds. A filled
 * shape stays crisp at 9 px, where a 24 px stroke icon scaled down goes soft. */
const QuestionMark = () => (
  <svg viewBox="262 -840 436 760" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z" />
  </svg>
);

const isShown = (el: HTMLElement | null | undefined) => {
  try { return !!el?.matches(':popover-open'); } catch { return false; }
};

/**
 * A small ? that explains a page, section or field. It is a fixed 9 px glyph, superscript at
 * the top right of the text it follows (25 px hit area). The panel opens on hover (after a short delay), on
 * keyboard focus, and on click or tap; a click keeps it open until a second click, Esc or a
 * click outside. Esc returns focus to the button. The panel is plain text in
 * the top layer (kit `Popover`, `popover="manual"`, so opening it never closes another popover)
 * and is the button's `aria-describedby`, so the text is announced on focus.
 *
 * Do not put it inside a `<label>`, a heading or a link: `Field`, `PageHeader`, `Card` and
 * `SectionHead` place it beside those through their `help` prop.
 */
export function InfoTip({ content, ...props }: InfoTipProps) {
  const paragraphs = helpParagraphs(content);
  if (!paragraphs.length) return null;
  return <InfoTipControl paragraphs={paragraphs} {...props} />;
}

function InfoTipControl({
  paragraphs, label, placement = 'bottom-start', className, ...props
}: Omit<InfoTipProps, 'content'> & { paragraphs: string[] }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | null>(null);
  const openRef = useRef(false);
  /** Opened by a click or tap: hover-out and blur no longer close it. */
  const pinned = useRef(false);
  /** The current click started with a pointer press (as opposed to Enter / Space). */
  const pressing = useRef(false);
  /** Focus is being returned to the button after Esc; that focus must not reopen the panel. */
  const refocusing = useRef(false);
  const [open, setOpen] = useState(false);
  const panelId = `${useId()}-panel`;

  const panel = () => document.getElementById(panelId);
  const clearTimer = () => {
    if (timer.current != null) { clearTimeout(timer.current); timer.current = null; }
  };
  const show = () => {
    clearTimer();
    const p = panel();
    if (p && !isShown(p)) { try { p.showPopover(); } catch { /* unsupported or already open */ } }
    openRef.current = true;
    setOpen(true);
  };
  const hide = () => {
    clearTimer();
    pinned.current = false;
    const p = panel();
    if (p && isShown(p)) { try { p.hidePopover(); } catch { /* already closed */ } }
    openRef.current = false;
    setOpen(false);
  };
  const later = (fn: () => void, ms: number) => {
    clearTimer();
    timer.current = window.setTimeout(fn, ms);
  };
  const pointerEnter = () => {
    if (openRef.current) clearTimer();
    else later(show, OPEN_DELAY);
  };
  const pointerLeave = () => {
    if (!openRef.current) { clearTimer(); return; }
    if (pinned.current || document.activeElement === buttonRef.current) return;
    later(hide, CLOSE_DELAY);
  };
  const escape = () => {
    const active = document.activeElement;
    const focusInside = !active || active === document.body || !!wrapRef.current?.contains(active);
    hide();
    if (focusInside && active !== buttonRef.current) {
      refocusing.current = true;
      buttonRef.current?.focus();
      refocusing.current = false;
    }
  };

  // Esc from anywhere (hover-opened, or focus left in the panel) and a press outside both close it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') escape(); };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) hide();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // close the top-layer panel if the tip unmounts while shown
  useEffect(() => () => {
    clearTimer();
    const p = panel();
    if (p && isShown(p)) { try { p.hidePopover(); } catch { /* noop */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={wrapRef} className={cx('uix-info-tip', className)} data-open={open || undefined} {...props}>
      <button
        ref={buttonRef}
        type="button"
        className="uix-info-tip__button"
        aria-label={label}
        aria-describedby={panelId}
        onPointerEnter={pointerEnter}
        onPointerLeave={pointerLeave}
        onPointerDown={() => { pressing.current = true; }}
        onFocus={() => { if (!refocusing.current) show(); }}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!pinned.current || (next && !wrapRef.current?.contains(next))) hide();
        }}
        onClick={() => {
          const viaPointer = pressing.current;
          pressing.current = false;
          // A pointer click on a hover- or focus-opened panel keeps it open; Enter / Space toggles.
          if (openRef.current && (pinned.current || !viaPointer)) hide();
          else { show(); pinned.current = true; }
        }}
        onKeyDown={(e) => {
          pressing.current = false;
          // Esc closes only the panel, not an enclosing dialog or drawer.
          if (e.key === 'Escape' && openRef.current) { e.preventDefault(); e.stopPropagation(); hide(); }
        }}
      >
        <QuestionMark />
      </button>
      <Popover
        id={panelId}
        role="tooltip"
        popover="manual"
        anchor={buttonRef}
        placement={placement}
        className="uix-info-tip__panel"
        onPointerEnter={() => { if (openRef.current) clearTimer(); }}
        onPointerLeave={pointerLeave}
        onPointerDown={() => { pinned.current = true; }}
      >
        {paragraphs.map((text, i) => <p key={i}>{text}</p>)}
      </Popover>
    </span>
  );
}
