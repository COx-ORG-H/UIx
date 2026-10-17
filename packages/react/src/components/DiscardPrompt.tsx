"use client";

import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import { Button } from './Button.js';
import type { ButtonProps } from './Button.js';
import { Popover } from './Popover.js';
import { useUixLabels } from '../labels-context.js';
import { useDialog } from '../hooks/useDialog.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

/** A light-dismiss popover is open: the browser closes it on Escape, before any dialog. */
const anyAutoPopoverOpen = (): boolean => {
  try { return !!document.querySelector('[popover]:not([popover="manual"]):popover-open'); } catch { return false; }
};

/** The words of the "Discard changes?" step a `dirty` Drawer or Modal asks before it closes (HAR-2029). */
export interface DiscardPromptLabels {
  /** The question, e.g. "Discard changes?". It names the step. */
  title: string;
  /** What discarding means, under the question. */
  description: string;
  /** The safe choice. It has focus when the step opens. */
  keepEditing: string;
  /** Close and throw the input away. */
  discard: string;
}

const DEFAULT_DISCARD_LABELS: DiscardPromptLabels = {
  title: 'Discard changes?',
  description: 'What you entered here will be lost.',
  keepEditing: 'Keep editing',
  discard: 'Discard',
};

interface DialogCloseContextValue {
  /** Close the way the × does: at once when clean, ask when dirty, nothing while pending. */
  requestClose: (anchor?: HTMLElement | null) => void;
  pending: boolean;
}

const DialogCloseContext = createContext<DialogCloseContextValue | null>(null);

export type DialogCloseProps = ButtonProps;

/**
 * A button that closes the surrounding `Drawer` or `Modal` the way its × does (HAR-2029): at once
 * when the form is clean, through the "Discard changes?" step (placed against this button) when
 * the dialog is `dirty`, and not at all while it is `pending`. Use it for the footer's Cancel.
 * Its own `onClick` runs first; `event.preventDefault()` there keeps the dialog open.
 */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(({ onClick, type = 'button', ...props }, ref) => {
  const dialog = useContext(DialogCloseContext);
  const pending = !!dialog?.pending;
  return (
    <Button
      ref={ref}
      type={type}
      {...props}
      {...(pending ? { 'aria-disabled': true } : {})}
      onClick={(event) => {
        // While a save is in flight it does nothing, the consumer's own onClick included.
        if (pending) { event.preventDefault(); return; }
        onClick?.(event);
        if (event.defaultPrevented) return;
        dialog?.requestClose(event.currentTarget);
      }}
    />
  );
});
DialogClose.displayName = 'DialogClose';

interface Prompt {
  /** The control it is placed against: the ×, or the DialogClose that asked. */
  anchor: HTMLElement | null;
  /** Where focus was when it opened; "Keep editing" sends it back there. */
  returnTo: HTMLElement | null;
}

export interface GuardedDialogOptions {
  open: boolean;
  onClose?: () => void;
  dirty?: boolean;
  pending?: boolean;
  labels?: Partial<DiscardPromptLabels>;
  /** The dialog's own × button: the step is placed against it unless a DialogClose asked. */
  closeRef: RefObject<HTMLButtonElement | null>;
}

/**
 * `useDialog` with the dismissal guard of a form dialog (HAR-2029). Every way out (Escape, the
 * ×, a backdrop click, a `DialogClose`) goes through `requestClose`: a clean dialog closes at
 * once, a `dirty` one opens the anchored "Discard changes?" step, a `pending` one does nothing.
 *
 * Escape is taken on the dialog's own keydown, after the controls inside it had their turn (a
 * Select closing its list cancels the event first), and cancelling that keydown is what keeps the
 * browser from closing the dialog. A close request that was not a keydown (the Android back
 * gesture) arrives as `cancel`. If the browser still closes a guarded dialog by force (it may
 * ignore a cancelled `cancel` without user activation), the dialog reopens at once and asks.
 */
export function useGuardedDialog({ open, onClose, dirty = false, pending = false, labels: labelsProp, closeRef }: GuardedDialogOptions) {
  const uixLabels = useUixLabels();
  const labels: DiscardPromptLabels = { ...DEFAULT_DISCARD_LABELS, ...uixLabels.discardPrompt, ...labelsProp };
  const panelId = `${useId()}-discard`;
  const [prompt, setPromptState] = useState<Prompt | null>(null);
  const latest = useRef({ open, onClose, dirty, pending, prompt });
  useIsomorphicLayoutEffect(() => {
    latest.current = { ...latest.current, open, onClose, dirty, pending };
  });
  /** The step, also kept in `latest` at once: events of the same task must see it. */
  const setPrompt = useCallback((next: Prompt | null) => {
    latest.current.prompt = next;
    setPromptState(next);
  }, []);
  const guarded = () => !!latest.current.onClose && (latest.current.dirty || latest.current.pending);

  const requestClose = useCallback((anchor?: HTMLElement | null) => {
    const { open: isOpen, onClose: close, dirty: isDirty, pending: isPending, prompt: asking } = latest.current;
    if (!isOpen || !close || isPending || asking) return;
    if (!isDirty) { close(); return; }
    const active = document.activeElement;
    setPrompt({ anchor: anchor ?? closeRef.current, returnTo: active instanceof HTMLElement ? active : null });
  }, [closeRef, setPrompt]);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  /** Where "keep editing" last sent focus, and whether a close request already backed out of the step. */
  const backOut = useRef<{ focus: HTMLElement | null; forced: boolean }>({ focus: null, forced: false });

  /**
   * Close the step and put focus back where it was. Focus that was on the dialog itself (a
   * backdrop press) or outside it (a click does not focus a button in Safari) goes to the
   * control that asked.
   */
  const keepEditing = useCallback(() => {
    const asked = latest.current.prompt;
    setPrompt(null);
    const target = asked?.returnTo;
    const dialog = dialogRef.current;
    const back = target && target !== dialog && target.isConnected && dialog?.contains(target) ? target : (asked?.anchor ?? closeRef.current);
    backOut.current.focus = back ?? null;
    back?.focus();
  }, [closeRef, setPrompt]);

  // A guarded dialog the browser closed by force reopens. It asks, or, when it was already
  // asking (the step would now sit behind the reopened dialog), it goes back to the form.
  const ref = useDialog(open, onClose, () => {
    if (!guarded()) return false;
    if (backOut.current.forced) {
      // The close request that forced this already backed out of the step: back to the form,
      // with focus where it was before the reopen moved it.
      backOut.current.forced = false;
      const field = backOut.current.focus;
      queueMicrotask(() => field?.focus());
    } else if (latest.current.prompt) keepEditing();
    else requestClose();
    return true;
  });
  dialogRef.current = ref.current;

  const discard = useCallback(() => {
    setPrompt(null);
    latest.current.onClose?.();
  }, [setPrompt]);

  // A fresh open never starts in the step, and the question is moot once the input is clean or
  // saving. Focus that was in the step goes back to the form rather than to <body>.
  useEffect(() => {
    if (open && dirty && !pending) return;
    if (!latest.current.prompt) return;
    if (open && document.getElementById(panelId)?.contains(document.activeElement)) keepEditing();
    else setPrompt(null);
  }, [open, dirty, pending, panelId, keepEditing, setPrompt]);

  useEffect(() => {
    const el = ref.current;
    dialogRef.current = el;
    if (!el || !open) return;
    /** An event of a dialog nested inside this one (a ConfirmDialog in the drawer's JSX) is not ours. */
    const ours = (event: Event) => (event.target as Element | null)?.closest?.('dialog') === el;
    const onCancel = (event: Event) => {
      if (!guarded()) return;
      event.preventDefault();
      // Asked to close while asking: back out of the step. When the request cannot be cancelled
      // the browser closes the dialog next, and the reopen must not ask again.
      if (latest.current.prompt) {
        keepEditing();
        backOut.current.forced = !event.cancelable;
      } else requestClose();
    };
    // While the step is open, a press anywhere else in the dialog (or on its backdrop) means
    // "keep editing", and only that: it is not also the click it would have been, so a second
    // click on the × or the backdrop does not ask again. The press is caught when it starts (by
    // its click, the focus it moved has already closed the step), and only its own click is
    // swallowed: a press that ends in no click (a right click, a scroll, a drag) leaves nothing.
    const outside = (event: Event) => !document.getElementById(panelId)?.contains(event.target as Node);
    let swallow: EventTarget | null = null;
    const forget = () => { swallow = null; };
    const onPointerDownCapture = (event: Event) => {
      swallow = latest.current.prompt && ours(event) && outside(event) ? event.target : null;
      if (swallow) setPrompt(null);
    };
    const onPointerUpCapture = () => { window.setTimeout(forget, 0); };
    const onClickCapture = (event: MouseEvent) => {
      const pressed = swallow != null && swallow === event.target;
      swallow = null;
      if (!pressed && !(latest.current.prompt && ours(event) && outside(event))) return;
      event.preventDefault();
      event.stopPropagation();
      setPrompt(null);
    };
    el.addEventListener('cancel', onCancel);
    el.addEventListener('pointerdown', onPointerDownCapture, true);
    el.addEventListener('pointerup', onPointerUpCapture, true);
    el.addEventListener('pointercancel', forget, true);
    el.addEventListener('contextmenu', forget, true);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('keydown', forget, true);
    return () => {
      el.removeEventListener('cancel', onCancel);
      el.removeEventListener('pointerdown', onPointerDownCapture, true);
      el.removeEventListener('pointerup', onPointerUpCapture, true);
      el.removeEventListener('pointercancel', forget, true);
      el.removeEventListener('contextmenu', forget, true);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('keydown', forget, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ref, requestClose, keepEditing, setPrompt, panelId]);

  /** The dialog's keydown: Escape, after the controls inside had theirs. */
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    // A dialog nested in this one closes itself, and an open light-dismiss popover is closed by
    // the browser first: cancelling the keydown would take Escape from both.
    if ((event.target as Element).closest('dialog') !== event.currentTarget || anyAutoPopoverOpen()) return;
    if (latest.current.prompt) { event.preventDefault(); keepEditing(); return; }
    if (!guarded()) return;
    event.preventDefault();
    requestClose();
  };

  // Only a dialog that can be dirty carries the step, so every other dialog renders as before.
  const element = dirty || prompt ? (
    <DiscardPrompt
      id={panelId}
      prompt={prompt}
      labels={labels}
      onKeepEditing={keepEditing}
      onDismiss={() => setPrompt(null)}
      onDiscard={discard}
    />
  ) : null;

  const provide = (children: ReactNode) => (
    <DialogCloseContext.Provider value={{ requestClose, pending }}>{children}</DialogCloseContext.Provider>
  );

  return { ref, requestClose, onKeyDown, prompt: element, provide };
}

interface DiscardPromptProps {
  id: string;
  prompt: Prompt | null;
  labels: DiscardPromptLabels;
  onKeepEditing: () => void;
  /** Focus left the step for another control: close it and leave focus there. */
  onDismiss: () => void;
  onDiscard: () => void;
}

/** The anchored step: the look of `Popconfirm`, focus on "Keep editing", Escape keeps editing. */
function DiscardPrompt({ id, prompt, labels, onKeepEditing, onDismiss, onDiscard }: DiscardPromptProps) {
  const keepRef = useRef<HTMLButtonElement>(null);
  const open = prompt != null;

  useEffect(() => {
    const panel = document.getElementById(id);
    if (!panel) return;
    const shown = () => { try { return panel.matches(':popover-open'); } catch { return false; } };
    if (!open) {
      if (shown()) { try { panel.hidePopover(); } catch { /* already closed */ } }
      return;
    }
    if (!shown()) { try { panel.showPopover(); } catch { /* unsupported */ } }
    keepRef.current?.focus();
  }, [open, id]);

  return (
    <Popover
      id={id}
      popover="manual"
      anchor={prompt?.anchor ?? null}
      placement="bottom-end"
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      className="uix-popconfirm"
      data-uix-discard-prompt=""
      // A press on the step's text focuses the step, not the dialog behind it (which would read
      // as focus leaving the step and dismiss it).
      tabIndex={-1}
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onKeepEditing();
      }}
      onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) onDismiss();
      }}
    >
      <div id={`${id}-title`} className="uix-popconfirm__title">{labels.title}</div>
      <div id={`${id}-body`} className="uix-popconfirm__body">{labels.description}</div>
      <div className="uix-popconfirm__actions">
        <Button ref={keepRef} type="button" size="sm" onClick={onKeepEditing}>{labels.keepEditing}</Button>
        <Button type="button" size="sm" variant="danger" onClick={onDiscard}>{labels.discard}</Button>
      </div>
    </Popover>
  );
}
