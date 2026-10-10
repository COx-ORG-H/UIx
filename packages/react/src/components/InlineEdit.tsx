"use client";

import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from '../cx.js';
import { fillLabel } from '../fill-label.js';
import { useUixLabels } from '../labels-context.js';
import { PencilIcon } from '../icons/components.js';
import { Button } from './Button.js';
import { Input } from './Input.js';
import { Textarea } from './Textarea.js';

/** Every word `InlineEdit` renders or announces. `{label}` is the field's name. */
export interface InlineEditLabels {
  /** Added to the view button's name after the value: "…, Edit {label}". */
  edit: string;
  save: string;
  cancel: string;
  /** Polite status while `onSave` runs. */
  saving: string;
  /** Polite status after a save. */
  saved: string;
  /** Shown when `onSave` rejects without a message of its own. */
  failed: string;
  /** What the view shows when the value is empty and no `placeholder` was given. */
  empty: string;
}

export const DEFAULT_INLINE_EDIT_LABELS: InlineEditLabels = {
  edit: 'Edit {label}',
  save: 'Save',
  cancel: 'Cancel',
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Could not save.',
  empty: 'Not set',
};

/** What a custom editor receives. Spread the field props onto your control. */
export interface InlineEditEditorProps {
  /** The draft. */
  value: string;
  onChange: (next: string) => void;
  /** Save the draft (what Enter does in the default editor). */
  save: () => void;
  cancel: () => void;
  /** `id`, the accessible name, the error wiring and `disabled` while saving. */
  field: {
    id: string;
    'aria-label': string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
    disabled: boolean;
  };
}

export interface InlineEditProps {
  /** The saved value. */
  value: string;
  /**
   * Save the new value. Return a promise to show the pending state; a rejection keeps the
   * editor open with the error under it (the rejection's message, else `labels.failed`).
   */
  onSave: (next: string) => void | Promise<void>;
  /** The field's name: "Title", "Due date". It names the edit button and the editor. */
  label: string;
  /** How the saved value shows. Default: the text itself. */
  renderView?: (value: string) => ReactNode;
  /**
   * A custom editor: a `Select`, a `Combobox`, a date field. Spread `field` onto the control.
   * Default: an `Input`, or a `Textarea` with `multiline`.
   */
  renderEditor?: (props: InlineEditEditorProps) => ReactNode;
  /** Edit in a textarea: Enter adds a line, Ctrl/⌘+Enter saves. */
  multiline?: boolean;
  /** Return a message to refuse the draft; nothing is saved while it returns one. */
  validate?: (next: string) => ReactNode | undefined;
  /** Shown in the view while the value is empty, e.g. "Add a description". */
  placeholder?: ReactNode;
  /** Read-only: the value shows as plain text, with no edit button. */
  disabled?: boolean;
  /** Each word defaults to `UixLabelsProvider` `inlineEdit`, then to English. */
  labels?: Partial<InlineEditLabels>;
  className?: string;
}

/**
 * A value that is edited in place (HAR-1381; TENSOR C16 `editable-record.tsx`): the value is
 * a button that says what it edits; activating it swaps in an editor with Save and Cancel.
 * Enter saves and Escape cancels; while `onSave` runs the editor is busy; a failed save keeps
 * the draft and shows why; afterwards focus is back on the value. Nothing is saved on blur.
 */
export function InlineEdit({
  value, onSave, label, renderView, renderEditor, multiline = false, validate, placeholder, disabled = false,
  labels: labelOverrides, className,
}: InlineEditProps) {
  const labels = { ...DEFAULT_INLINE_EDIT_LABELS, ...useUixLabels().inlineEdit, ...labelOverrides };
  const id = useId();
  const errorId = `${id}-error`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ReactNode>();
  const [status, setStatus] = useState('');
  const viewRef = useRef<HTMLButtonElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  /** Where focus goes after the next render: into the editor, or back to the value. */
  const focusNext = useRef<'editor' | 'view' | null>(null);
  const mounted = useRef(true);
  // Set on mount too: StrictMode runs the cleanup once before the real mount.
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    if (target === 'view') { viewRef.current?.focus(); return; }
    const control = editorRef.current?.querySelector<HTMLElement>('input, textarea, select, button, [tabindex]');
    control?.focus();
    if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.select();
  }, [editing]);

  const start = () => {
    setDraft(value);
    setError(undefined);
    setStatus('');
    focusNext.current = 'editor';
    setEditing(true);
  };
  const close = () => {
    focusNext.current = 'view';
    setEditing(false);
  };
  const cancel = () => {
    if (pending) return;
    setError(undefined);
    close();
  };
  const save = () => {
    if (pending) return;
    const issue = validate?.(draft);
    if (issue != null) { setError(issue); return; }
    if (draft === value) { close(); return; }
    setError(undefined);
    let result: void | Promise<void>;
    try {
      result = onSave(draft);
    } catch (thrown) {
      setError(thrown instanceof Error && thrown.message ? thrown.message : labels.failed);
      return;
    }
    if (!result || typeof result.then !== 'function') { setStatus(labels.saved); close(); return; }
    setPending(true);
    setStatus(labels.saving);
    result.then(
      () => {
        if (!mounted.current) return;
        setPending(false);
        setStatus(labels.saved);
        close();
      },
      (reason: unknown) => {
        if (!mounted.current) return;
        setPending(false);
        setStatus('');
        setError(typeof reason === 'string' && reason ? reason : reason instanceof Error && reason.message ? reason.message : labels.failed);
        focusNext.current = null;
        editorRef.current?.querySelector<HTMLElement>('input, textarea, select')?.focus();
      },
    );
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      // Ours: an Escape that cancels the edit must not also close the drawer around it.
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === 'Enter' && !event.defaultPrevented) {
      const inField = (event.target as HTMLElement).matches('input, textarea');
      if (!inField) return;
      const isTextarea = (event.target as HTMLElement).tagName === 'TEXTAREA';
      if (isTextarea && !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      save();
    }
  };

  const liveRegion = <span className="uix-visually-hidden" role="status" aria-live="polite">{status}</span>;
  const shown = value === '' ? <span className="uix-inline-edit__placeholder">{placeholder ?? labels.empty}</span> : (renderView?.(value) ?? value);

  if (disabled) {
    return <span className={cx('uix-inline-edit', 'uix-inline-edit--readonly', className)}><span className="uix-inline-edit__value">{shown}</span></span>;
  }

  if (!editing) {
    return (
      <span className={cx('uix-inline-edit', className)}>
        <button ref={viewRef} type="button" className="uix-inline-edit__view" onClick={start}>
          <span className="uix-inline-edit__value">{shown}</span>
          <span className="uix-visually-hidden">, {fillLabel(labels.edit, { label })}</span>
          <span className="uix-inline-edit__icon" aria-hidden="true"><PencilIcon size="sm" /></span>
        </button>
        {liveRegion}
      </span>
    );
  }

  const field = {
    id,
    'aria-label': label,
    'aria-describedby': error != null ? errorId : undefined,
    'aria-invalid': error != null ? true as const : undefined,
    disabled: pending,
  };
  return (
    <span className={cx('uix-inline-edit', 'uix-inline-edit--editing', className)}>
      <div ref={editorRef} className="uix-inline-edit__editor" role="group" aria-label={fillLabel(labels.edit, { label })} aria-busy={pending || undefined} onKeyDown={onEditorKeyDown}>
        <div className="uix-inline-edit__control">
          {renderEditor
            ? renderEditor({ value: draft, onChange: setDraft, save, cancel, field })
            : multiline
              ? <Textarea {...field} rows={3} value={draft} invalid={error != null} onChange={(event) => setDraft(event.currentTarget.value)} />
              : <Input {...field} size="sm" value={draft} invalid={error != null} onChange={(event) => setDraft(event.currentTarget.value)} />}
        </div>
        <span className="uix-inline-edit__actions">
          <Button type="button" size="sm" variant="primary" loading={pending} onClick={save}>{labels.save}</Button>
          <Button type="button" size="sm" disabled={pending} onClick={cancel}>{labels.cancel}</Button>
        </span>
        {error != null && <div id={errorId} className="uix-field__error uix-inline-edit__error" role="alert">{error}</div>}
      </div>
      {liveRegion}
    </span>
  );
}
