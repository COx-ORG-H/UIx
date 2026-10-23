"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { useDelayedPending } from '../hooks/useDelayedPending.js';
import { PencilIcon } from '../icons/components.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Textarea } from './Textarea.js';

/** Every word `InlineEdit` renders or announces. `{label}` is the field's name. */
export interface InlineEditLabels {
  /** Added to the view button's name after the value: "…, Edit {label}"; the icon trigger's whole name. */
  edit: string;
  save: string;
  cancel: string;
  /** Polite status while `onSave` runs (shown after 300 ms, so a fast save does not flash it). */
  saving: string;
  /** Polite status after a save. */
  saved: string;
  /** Shown when `onSave` rejects without a message of its own. */
  failed: string;
  /** What the view shows when the value is empty and no `placeholder` was given. */
  empty: string;
  /** Visually hidden before a `readOnlyReason`, so it is read as one: "Read-only: …". */
  readOnly: string;
}

export const DEFAULT_INLINE_EDIT_LABELS: InlineEditLabels = {
  edit: 'Edit {label}',
  save: 'Save',
  cancel: 'Cancel',
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Could not save.',
  empty: 'Not set',
  readOnly: 'Read-only:',
};

/** Where an `InlineEdit` is (HAR-1833). `saved` holds until the field is opened again. */
export type InlineEditState = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

/** What a custom editor receives. Spread the field props onto your control. */
export interface InlineEditEditorProps<T = string> {
  /** The draft. */
  value: T;
  /** Change the draft. With `commit="change"` this also saves it. Ignored while a save runs. */
  onChange: (next: T) => void;
  /**
   * Save the draft (what Enter does in the default editor). Pass the value to save one you
   * just chose: `save(next)` does not wait for the draft to update, so it never saves a stale one.
   */
  save: (next?: T) => void;
  cancel: () => void;
  /** `id`, the accessible name, the error wiring, and the busy state while saving. */
  field: {
    id: string;
    'aria-label': string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    /** True once a save has run for 300 ms (changes are ignored from its start, so a fast save never greys the control). */
    disabled: boolean;
    /** The same moment as `disabled`, for a text control that should keep focus and its text selectable. */
    readOnly: boolean;
  };
}

/** What `renderError` receives besides the rejection itself. */
export interface InlineEditErrorContext<T = string> {
  /** The rejection's message, else `labels.failed`: what the default rendering shows. */
  message: ReactNode;
  /** The draft that failed. */
  draft: T;
  /** Send the draft again. Show it when a retry can help (a timeout, not a refusal). */
  retry: () => void;
  /** Close the editor and drop the draft, e.g. after "Reload latest" on a version conflict. */
  cancel: () => void;
}

export interface InlineEditProps<T = string> {
  /** The saved value. */
  value: T;
  /**
   * Save the new value. Return a promise to show the pending state; a rejection keeps the
   * editor open with the error under it (the rejection's message, else `labels.failed`).
   * The editor waits for it: the value shows as saved only once it resolves.
   */
  onSave: (next: T) => void | Promise<unknown>;
  /** The field's name: "Title", "Due date". It names the edit button and the editor. */
  label: string;
  /**
   * How the saved value shows. Default: the text itself (`String(value)`); pass it for any
   * value that is not a string (an option, a person, a time window).
   */
  renderView?: (value: T) => ReactNode;
  /**
   * A custom editor: a `Select`, a `Combobox`, a date field. Spread `field` onto the control.
   * Default: an `Input`, or a `Textarea` with `multiline` (string values only).
   */
  renderEditor?: (props: InlineEditEditorProps<T>) => ReactNode;
  /** Edit in a textarea: Enter adds a line, Ctrl/⌘+Enter saves. */
  multiline?: boolean;
  /** Return a message to refuse the draft; nothing is saved while it returns one. */
  validate?: (next: T) => ReactNode | undefined;
  /** Whether two values are the same (an unchanged draft saves nothing). Default `Object.is`. */
  equals?: (a: T, b: T) => boolean;
  /** Whether a value counts as empty (the view then shows `placeholder`). Default: `null`, `undefined` or `''`. */
  isEmpty?: (value: T) => boolean;
  /**
   * When the draft is saved (HAR-1833).
   * `'explicit'` (default): Enter or Save only; leaving the field keeps the draft open.
   * `'blur'`: also when focus leaves the editor (text fields of a record).
   * `'change'`: as soon as the editor reports a change (a select, a toggle, a date), with no
   * Save button; leaving it unchanged closes it.
   */
  commit?: 'explicit' | 'blur' | 'change';
  /** Shown in the view while the value is empty, e.g. "Add a description". */
  placeholder?: ReactNode;
  /** Read-only: the value shows as plain text, with no edit control. */
  disabled?: boolean;
  /**
   * Why the field cannot be edited here ("Set by the integration"). Makes it read-only and
   * shows the reason under the value, which is described by it.
   */
  readOnlyReason?: ReactNode;
  /**
   * `'value'` (default): the whole value is the button, named "{value}, Edit {label}".
   * `'icon'`: the value is plain text and a pencil button after it is named only "Edit {label}"
   * (for a value that is itself a link, a chip or long text).
   */
  trigger?: 'value' | 'icon';
  /** Controlled open state, e.g. one field of a record open at a time. */
  editing?: boolean;
  /** Called when the field asks to open (`true`) or close (`false`). */
  onEditingChange?: (editing: boolean) => void;
  /** Controlled draft, e.g. to report unsaved input. Reset to `value` on open. */
  draft?: T;
  /** Called with every change of the draft, and with `value` when the field opens. */
  onDraftChange?: (draft: T) => void;
  /**
   * Renders a failed save under the editor, in place of the message: a Try again button that
   * calls `retry`, or a Reload latest after a version conflict.
   */
  renderError?: (error: unknown, context: InlineEditErrorContext<T>) => ReactNode;
  /** Called on every change of `InlineEditState`. */
  onStateChange?: (state: InlineEditState) => void;
  /** Each word defaults to `UixLabelsProvider` `inlineEdit`, then to English. */
  labels?: Partial<InlineEditLabels>;
  className?: string;
}

const defaultEmpty = (value: unknown) => value == null || value === '';

/**
 * A value that is edited in place (HAR-1381; TENSOR C16 `editable-record.tsx`): the value is
 * a button that says what it edits; activating it swaps in an editor with Save and Cancel.
 * Enter saves and Escape cancels; while `onSave` runs the editor is busy; a failed save keeps
 * the draft and shows why; afterwards focus is back on the value, which shows what was saved
 * until `value` catches up. HAR-1833: any value type (`equals`, `renderView`, `renderEditor`),
 * saving on blur or on change (`commit`), controllable `editing` and `draft`, `renderError`
 * with retry, `onStateChange`, an icon trigger, and a `readOnlyReason`.
 */
export function InlineEdit<T = string>({
  value, onSave, label, renderView, renderEditor, multiline = false, validate, equals = Object.is, isEmpty = defaultEmpty,
  commit = 'explicit', placeholder, disabled = false, readOnlyReason, trigger = 'value',
  editing: editingProp, onEditingChange, draft: draftProp, onDraftChange, renderError, onStateChange,
  labels: labelOverrides, className,
}: InlineEditProps<T>) {
  const labels = { ...DEFAULT_INLINE_EDIT_LABELS, ...useUixLabels().inlineEdit, ...labelOverrides };
  const id = useId();
  const errorId = `${id}-error`;
  const reasonId = `${id}-reason`;
  const [editingState, setEditingState] = useState(false);
  const isEditing = editingProp ?? editingState;
  const [draftState, setDraftState] = useState<T>(value);
  const draft = draftProp !== undefined ? draftProp : draftState;
  const [pending, setPending] = useState(false);
  /** The save's pending look: after 300 ms, held at least 500 ms (the kit's latency ladder, HAR-2580). */
  // The field and Cancel wait the same 300 ms but come back the moment the save ends: after a
  // failure the person edits at once (the Save spinner keeps its own 500 ms minimum).
  const pendingVisible = useDelayedPending(pending) && pending;
  /** A refused draft (`validate`) or a failed save (`failure` set). */
  const [error, setError] = useState<{ message: ReactNode; failure?: { reason: unknown } }>();
  const [status, setStatus] = useState('');
  const [saved, setSaved] = useState(false);
  /** The value the last save sent and the server accepted, shown until `value` changes. */
  const [accepted, setAccepted] = useState<{ value: T } | null>(null);
  const viewRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  /** Close the view's focus loop: after a close, focus goes back to the value (or the pencil). */
  const focusView = useRef(false);
  /** Synchronous flags: React state is not yet updated when a teardown blur or a second Enter lands. */
  const editingRef = useRef(isEditing);
  editingRef.current = isEditing;
  const inFlight = useRef(false);
  const lastSent = useRef<{ value: T } | null>(null);
  /** Counts the times the editor opened: a save that settles after a reopen must not close the new session. */
  const session = useRef(0);
  /** A pointer press inside the editor is under way (Safari and macOS Firefox blur with no relatedTarget). */
  const pressInside = useRef(false);
  const mounted = useRef(true);
  // Set on mount too: StrictMode runs the cleanup once before the real mount.
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // A new value from the parent supersedes the one shown since the save (layout: no frame of the old
  // one). Compared with `equals`: an object value rebuilt on every parent render is not a new value.
  const lastValue = useRef(value);
  useLayoutEffect(() => {
    if (equals(lastValue.current, value)) return;
    lastValue.current = value;
    setAccepted(null);
  });
  const shown = accepted ? accepted.value : value;

  // "Saving…" is announced only for a save slow enough to show its pending look.
  useEffect(() => {
    if (pendingVisible && pending) setStatus(labels.saving);
    // labels.saving is read as it is then: a new labels object each render must not re-announce.
  }, [pendingVisible, pending]);

  const state: InlineEditState = pending ? 'saving' : error?.failure ? 'error' : isEditing ? 'editing' : saved ? 'saved' : 'idle';
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const reported = useRef<InlineEditState>('idle');
  useEffect(() => {
    if (reported.current === state) return;
    reported.current = state;
    onStateChangeRef.current?.(state);
  }, [state]);

  const setEditing = (next: boolean) => {
    editingRef.current = next;
    if (editingProp === undefined) setEditingState(next);
    onEditingChange?.(next);
  };
  const setDraft = (next: T) => {
    if (draftProp === undefined) setDraftState(next);
    onDraftChange?.(next);
  };

  // Into the editor when it opens (however it was opened); back to the value after this field closed itself.
  useEffect(() => {
    if (isEditing) {
      const control = editorRef.current?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');
      control?.focus();
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.select();
      return;
    }
    if (focusView.current) { focusView.current = false; viewRef.current?.focus(); }
  }, [isEditing]);

  // Opened from outside (`editing` set by the parent): start from the saved value.
  const wasEditing = useRef(isEditing);
  useLayoutEffect(() => {
    if (isEditing && !wasEditing.current && editingProp !== undefined) resetForOpen();
    wasEditing.current = isEditing;
  });

  function resetForOpen() {
    setDraft(shown);
    setError(undefined);
    setStatus('');
    setSaved(false);
    lastSent.current = null;
  }
  const start = () => {
    session.current += 1;
    resetForOpen();
    setEditing(true);
  };
  const close = (returnFocus: boolean) => {
    focusView.current = returnFocus;
    inFlight.current = false;
    setEditing(false);
  };
  const cancel = () => {
    if (inFlight.current) return;
    setError(undefined);
    setDraft(shown);
    close(true);
  };

  const failureMessage = (reason: unknown): ReactNode => (
    typeof reason === 'string' && reason ? reason : reason instanceof Error && reason.message ? reason.message : labels.failed
  );

  /**
   * Send `next`. `explicit`: Enter, Save, a change or Try again; a blur is not, and leaving a
   * field whose last attempt failed with this same draft does not send it again.
   */
  const send = (next: T, explicit: boolean) => {
    if (!editingRef.current || inFlight.current) return;
    if (!explicit && error?.failure && lastSent.current && equals(lastSent.current.value, next)) return;
    const issue = validate?.(next);
    if (issue != null) { setError({ message: issue }); return; }
    if (equals(next, shown)) { setError(undefined); close(explicit); return; }
    setError(undefined);
    lastSent.current = { value: next };
    const mine = session.current;
    let result: void | Promise<unknown>;
    try {
      result = onSave(next);
    } catch (thrown) {
      setError({ message: failureMessage(thrown), failure: { reason: thrown } });
      return;
    }
    const done = () => {
      setAccepted({ value: next });
      setStatus(labels.saved);
      setSaved(true);
      // A parent may have closed a controlled editor while the save ran: the value still counts. An
      // editor opened again since is a new session the old save must not close.
      if (editingRef.current && session.current === mine) close(explicit);
    };
    if (!result || typeof (result as Promise<unknown>).then !== 'function') { done(); return; }
    inFlight.current = true;
    setPending(true);
    (result as Promise<unknown>).then(
      () => {
        if (!mounted.current) return;
        inFlight.current = false;
        setPending(false);
        done();
      },
      (reason: unknown) => {
        if (!mounted.current) return;
        inFlight.current = false;
        setPending(false);
        if (session.current !== mine) return;
        setStatus('');
        setError({ message: failureMessage(reason), failure: { reason } });
        editorRef.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
      },
    );
  };
  const save = (next?: T) => send(next === undefined ? draft : next, true);
  const retry = () => send(lastSent.current && equals(lastSent.current.value, draft) ? lastSent.current.value : draft, true);
  const change = (next: T) => {
    if (inFlight.current) return;
    setDraft(next);
    if (error && !error.failure) setError(undefined);
    if (commit === 'change') send(next, true);
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // An Escape that closes an open list inside the editor (a Combobox, a Select) is the list's.
      if (event.defaultPrevented || (event.target as HTMLElement).closest?.('[aria-expanded="true"]')) return;
      // Ours: an Escape that cancels the edit must not also close the drawer around it.
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === 'Enter' && !event.defaultPrevented && commit !== 'change') {
      const inField = (event.target as HTMLElement).matches('input, textarea');
      if (!inField) return;
      const isTextarea = (event.target as HTMLElement).tagName === 'TEXTAREA';
      if (isTextarea && !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      save();
    }
  };
  const onEditorBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (commit === 'explicit') return;
    // Focus moving to this field's own buttons (Save, Cancel, Try again) is not leaving it.
    const next = event.relatedTarget;
    if (next && event.currentTarget.contains(next as Node)) return;
    // Safari and macOS Firefox do not focus a clicked button: the blur comes with no relatedTarget
    // and the click follows. A press that started inside the editor is not leaving it; otherwise
    // wait a task (the click runs first) and save only if focus really left and Cancel did not run.
    if (pressInside.current) return;
    if (next) { send(draft, false); return; }
    const draftNow = draft;
    setTimeout(() => {
      if (!editingRef.current || pressInside.current) return;
      if (editorRef.current?.contains(document.activeElement)) return;
      send(draftNow, false);
    }, 0);
  };
  const onEditorPointerDown = () => {
    pressInside.current = true;
    // Released after the click that follows the press has run.
    const release = () => { setTimeout(() => { pressInside.current = false; }, 0); window.removeEventListener('pointerup', release, true); window.removeEventListener('pointercancel', release, true); };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
  };

  const liveRegion = <span className="uix-visually-hidden" role="status" aria-live="polite">{status}</span>;
  const empty = isEmpty(shown);
  const display = empty
    ? <span className="uix-inline-edit__placeholder">{placeholder ?? labels.empty}</span>
    : (renderView?.(shown) ?? String(shown));

  if (disabled || readOnlyReason != null) {
    return (
      <span className={cx('uix-inline-edit', 'uix-inline-edit--readonly', readOnlyReason != null && 'uix-inline-edit--reason', className)}>
        <span className="uix-inline-edit__value" aria-describedby={readOnlyReason != null ? reasonId : undefined}>{display}</span>
        {readOnlyReason != null && (
          <span id={reasonId} className="uix-inline-edit__reason">
            <span className="uix-visually-hidden">{labels.readOnly} </span>{readOnlyReason}
          </span>
        )}
      </span>
    );
  }

  // The view and the editor are the same root element with the live region as its second child, so
  // the region is never remounted with its text in it (a region inserted with text announces nothing).
  if (!isEditing) {
    return (
      <span className={cx('uix-inline-edit', trigger === 'icon' && 'uix-inline-edit--icon-trigger', className)}>
        {trigger === 'icon'
          ? (
            <>
              <span className="uix-inline-edit__value">{display}</span>
              <button ref={viewRef} type="button" className="uix-inline-edit__trigger" aria-label={fillLabel(labels.edit, { label })} onClick={start}>
                <PencilIcon size="sm" />
              </button>
            </>
          )
          : (
            <button ref={viewRef} type="button" className="uix-inline-edit__view" onClick={start}>
              <span className="uix-inline-edit__value">{display}</span>
              <span className="uix-visually-hidden">, {fillLabel(labels.edit, { label })}</span>
              <span className="uix-inline-edit__icon" aria-hidden="true"><PencilIcon size="sm" /></span>
            </button>
          )}
        {liveRegion}
      </span>
    );
  }

  const field = {
    id,
    'aria-label': label,
    'aria-describedby': error != null ? errorId : undefined,
    'aria-invalid': error != null ? true as const : undefined,
    disabled: pendingVisible,
    readOnly: pendingVisible,
  };
  const textDraft = typeof draft === 'string' ? draft : String(draft ?? '');
  const errorBody = error && (error.failure && renderError
    ? renderError(error.failure.reason, { message: error.message, draft, retry, cancel })
    : error.message);
  return (
    <span className={cx('uix-inline-edit', 'uix-inline-edit--editing', className)}>
      <div
        ref={editorRef}
        className="uix-inline-edit__editor"
        role="group"
        aria-label={fillLabel(labels.edit, { label })}
        aria-busy={pending || undefined}
        onKeyDown={onEditorKeyDown}
        onBlur={onEditorBlur}
        onPointerDownCapture={onEditorPointerDown}
      >
        <div className="uix-inline-edit__control">
          {renderEditor
            ? renderEditor({ value: draft, onChange: change, save, cancel, field })
            : multiline
              ? <Textarea {...field} disabled={false} rows={3} value={textDraft} invalid={error != null} onChange={(event) => change(event.currentTarget.value as T)} />
              : <Input {...field} disabled={false} size="sm" value={textDraft} invalid={error != null} onChange={(event) => change(event.currentTarget.value as T)} />}
        </div>
        <span className="uix-inline-edit__actions">
          {/* mousedown keeps focus in the field: in Safari a clicked button never takes it */}
          {commit !== 'change' && <Button type="button" size="sm" variant="primary" loading={pending} onMouseDown={(event) => event.preventDefault()} onClick={() => save()}>{labels.save}</Button>}
          <Button type="button" size="sm" disabled={pendingVisible} onMouseDown={(event) => event.preventDefault()} onClick={cancel}>{labels.cancel}</Button>
        </span>
        {errorBody != null && <div id={errorId} className="uix-field__error uix-inline-edit__error" role="alert">{errorBody}</div>}
      </div>
      {liveRegion}
    </span>
  );
}
