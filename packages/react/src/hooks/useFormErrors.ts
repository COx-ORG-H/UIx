"use client";

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useUixLabels } from '../labels-context.js';
import { DEFAULT_ERROR_SUMMARY_LABELS } from '../components/ErrorSummary.js';
import type { ErrorSummaryItem, ErrorSummaryLabels } from '../components/ErrorSummary.js';

/** A message per field name; `undefined`, `null`, `false` or `''` means the field is fine. */
export type FormFieldErrors<V> = { [K in Extract<keyof V, string>]?: ReactNode };

export interface UseFormErrorsOptions<V extends object> {
  /** The form's values, owned by the form (state, a reducer, a form library). */
  values: V;
  /**
   * Every field's error for these values, in the order of the form (the summary keeps that order).
   * Write messages GOV.UK's way: say what to do ("Enter a title"), with no "please", "sorry" or
   * "invalid"; the summary repeats them word for word.
   */
  validate: (values: V) => FormFieldErrors<V>;
  /**
   * Whether a value counts as not filled in. An empty field is not flagged when the person leaves
   * it (they may be skipping ahead), only on submit. Default: `null`, `undefined`, blank text, an
   * empty array.
   */
  isEmpty?: (value: unknown, name: string) => boolean;
  /** Prefix of the controls' ids (default: generated). The id of field `name` is `${idPrefix}-${name}`. */
  idPrefix?: string;
  labels?: Partial<ErrorSummaryLabels>;
}

/** What `form.field(name)` returns: spread it onto `Field`. */
export interface FormErrorsFieldProps {
  error: ReactNode | undefined;
  errorAnnounce: 'polite' | 'off';
  errorPrefix: string;
}

/** What `form.control(name)` returns: spread it onto the control (for a `Combobox`, pass `id` as `inputId`). */
export interface FormErrorsControlProps {
  id: string;
  name: string;
  onBlur: () => void;
}

export interface FormErrorsApi<V extends object> {
  /** The errors showing now, by field. */
  errors: FormFieldErrors<V>;
  /** Props for the `Field` of `name`: the error it shows, how it is announced, the "Error:" prefix. */
  field: (name: Extract<keyof V, string>) => FormErrorsFieldProps;
  /** Props for the control of `name`: its id (the summary links to it), `name`, and the blur that checks it. */
  control: (name: Extract<keyof V, string>) => FormErrorsControlProps;
  /** Props for the `ErrorSummary`: the errors of the last submit that still stand, and the focus key. */
  summary: { errors: ErrorSummaryItem[]; focusKey: number };
  /**
   * The form's `onSubmit`. It prevents the browser's submit, checks every field, and either shows
   * the summary (focus moves to it) or calls `onValid` with the values.
   */
  handleSubmit: (onValid: (values: V) => unknown) => (event?: FormEvent) => void;
  /**
   * Show errors the server found (a 400 / 422). A field's server error goes once its value
   * changes; `formErrors` are entries of the whole form, with no link, until the next submit.
   * Focus moves to the summary.
   */
  setServerErrors: (errors: FormFieldErrors<V>, formErrors?: readonly ReactNode[]) => void;
  /** Forget every shown error and the summary (after a save, or a reset of the form). */
  reset: () => void;
  /** How many submits failed: the summary's focus key. */
  failedSubmits: number;
}

/** Where a shown error came from: leaving the field, or a submit. */
type Source = 'blur' | 'submit';

/** A summary entry: the field, and the words the summary showed for it. */
interface Listed { name: string; message: ReactNode }

/**
 * Whether a field still says what the summary said. Text compares as text; a node (a sentence with a
 * link) is a new object every render, so two nodes count as the same message.
 */
const sameMessage = (a: ReactNode, b: ReactNode) => (typeof a === 'string' || typeof b === 'string' || typeof a === 'number' || typeof b === 'number' ? a === b : true);

const present = (message: ReactNode) => message !== undefined && message !== null && message !== false && message !== '';

const defaultIsEmpty = (value: unknown) => value == null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0);

/**
 * Field errors with GOV.UK's summary and "reward early, punish late" timing (the UIx enterprise UX
 * study, forms notes section 1), over the form's own state and `Field`:
 *
 * - leaving a filled-in field shows its error, politely announced; an empty one waits for submit;
 * - a field showing an error re-checks on every change and clears the moment it passes;
 * - a failed submit shows every error at once, silent at the fields, and an `ErrorSummary` that
 *   takes focus, links to each field with the same words, and puts "Error: " in the page title;
 * - server errors join the same channels and clear when their field changes.
 *
 * It holds no values and renders nothing; it is not a form library.
 */
export function useFormErrors<V extends object>({ values, validate, isEmpty = defaultIsEmpty, idPrefix, labels: labelsProp }: UseFormErrorsOptions<V>): FormErrorsApi<V> {
  type Name = Extract<keyof V, string>;
  const labels: ErrorSummaryLabels = { ...DEFAULT_ERROR_SUMMARY_LABELS, ...useUixLabels().errorSummary, ...labelsProp };
  const generated = useId();
  const prefix = idPrefix ?? `uix-form${generated.replace(/:/g, '')}`;
  const idOf = useCallback((name: string) => `${prefix}-${name}`, [prefix]);

  const checked = validate(values);
  /** The fields whose error may show, and why. A field leaves this once it passes. */
  const [revealed, setRevealed] = useState<Partial<Record<string, Source>>>({});
  /** The server's errors, each with the value it was about. */
  const [server, setServer] = useState<Partial<Record<string, { message: ReactNode; value: unknown }>>>({});
  const [formErrors, setFormErrors] = useState<readonly ReactNode[]>([]);
  /** The fields the last failed submit listed, in form order, with the words the summary showed. */
  const [listed, setListed] = useState<readonly Listed[]>([]);
  const [failedSubmits, setFailedSubmits] = useState(0);

  const latest = useRef({ values, checked, isEmpty, server });
  latest.current = { values, checked, isEmpty, server };

  const valueOf = (name: string) => (values as Record<string, unknown>)[name];
  const serverError = (name: string) => {
    const entry = server[name];
    return entry && Object.is(entry.value, valueOf(name)) ? entry.message : undefined;
  };
  const shownError = (name: string): ReactNode | undefined => {
    const own = (checked as Record<string, ReactNode>)[name];
    if (revealed[name] && present(own)) return own;
    const fromServer = serverError(name);
    return present(fromServer) ? fromServer : undefined;
  };

  const onBlurOf = useCallback((name: string) => {
    const now = latest.current;
    if (now.isEmpty((now.values as Record<string, unknown>)[name], name)) return;
    if (!present((now.checked as Record<string, ReactNode>)[name])) return;
    setRevealed((current) => (current[name] ? current : { ...current, [name]: 'blur' }));
  }, []);

  const handleSubmit = useCallback((onValid: (values: V) => unknown) => (event?: FormEvent) => {
    event?.preventDefault();
    const { values: now, checked: errors, server: fromServer } = latest.current;
    const own = errors as Record<string, ReactNode>;
    const failing = Object.keys(own).filter((name) => present(own[name]));
    // A refusal from the server still stands while its field holds the value it refused: submitting
    // that again would only be refused again.
    const refused = Object.keys(fromServer).filter((name) => !failing.includes(name)
      && Object.is(fromServer[name]?.value, (now as Record<string, unknown>)[name]));
    setFormErrors([]);
    if (!failing.length && !refused.length) {
      setListed([]);
      onValid(now);
      return;
    }
    // Every field the summary lists is silent at the field from now on, a blurred one included:
    // the summary announces it.
    setRevealed((current) => {
      const next = { ...current };
      for (const name of failing) next[name] = 'submit';
      return next;
    });
    setListed([
      ...failing.map((name) => ({ name, message: own[name] })),
      ...refused.map((name) => ({ name, message: fromServer[name]?.message })),
    ]);
    setFailedSubmits((count) => count + 1);
  }, []);

  const setServerErrors = useCallback((errors: FormFieldErrors<V>, form: readonly ReactNode[] = []) => {
    const now = latest.current.values as Record<string, unknown>;
    const names = Object.keys(errors).filter((name) => present((errors as Record<string, ReactNode>)[name]));
    setServer(Object.fromEntries(names.map((name) => [name, { message: (errors as Record<string, ReactNode>)[name], value: now[name] }])));
    setFormErrors(form.filter(present));
    setListed(names.map((name) => ({ name, message: (errors as Record<string, ReactNode>)[name] })));
    if (names.length || form.some(present)) setFailedSubmits((count) => count + 1);
  }, []);

  const reset = useCallback(() => {
    setRevealed({});
    setServer({});
    setFormErrors([]);
    setListed([]);
  }, []);

  const errors: Record<string, ReactNode> = {};
  for (const name of new Set([...Object.keys(checked), ...Object.keys(server)])) {
    const message = shownError(name);
    if (present(message)) errors[name] = message;
  }

  /** The summary still says what the field says: the entry stands. */
  const standing = (entry: Listed) => present(errors[entry.name]) && sameMessage(entry.message, errors[entry.name]);

  // Clear early: a revealed field that now passes goes back to waiting for its next blur, so
  // breaking it again while typing does not flag it mid-word; a server error goes once its field
  // changed. A summary entry goes once its field passes or says something else (a new message in
  // the summary's alert region would interrupt the typing; the field announces it politely), and
  // stays gone until the next submit.
  const passed = Object.keys(revealed).filter((name) => !present((checked as Record<string, ReactNode>)[name]));
  const stale = Object.keys(server).filter((name) => !Object.is(server[name]?.value, valueOf(name)));
  const gone = listed.filter((entry) => !standing(entry)).map((entry) => entry.name);
  useEffect(() => {
    const drop = <T extends object>(names: string[]) => (current: T) => {
      const next = { ...current } as Record<string, unknown>;
      for (const name of names) delete next[name];
      return next as T;
    };
    if (passed.length) setRevealed(drop(passed));
    if (stale.length) setServer(drop(stale));
    if (gone.length) setListed((current) => current.filter((entry) => !gone.includes(entry.name)));
  }, [passed.join('|'), stale.join('|'), gone.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const summaryErrors: ErrorSummaryItem[] = [
    ...formErrors.map((message, index) => ({ message, key: `form-${index}` })),
    ...listed.filter(standing).map((entry) => ({ message: errors[entry.name], target: idOf(entry.name) })),
  ];

  return {
    errors: errors as FormFieldErrors<V>,
    field: (name: Name) => ({
      error: errors[name],
      // An error the summary lists was announced there; any other (found on leaving the field, or
      // a new message where the summary's was) is polite. 'polite' also while there is no error, so
      // the field's announcing region is in place before one arrives.
      errorAnnounce: listed.some((entry) => entry.name === name && standing(entry)) ? 'off' : 'polite',
      errorPrefix: labels.errorPrefix,
    }),
    control: (name: Name) => ({ id: idOf(name), name, onBlur: () => onBlurOf(name) }),
    summary: { errors: summaryErrors, focusKey: failedSubmits },
    handleSubmit,
    setServerErrors,
    reset,
    failedSubmits,
  };
}
