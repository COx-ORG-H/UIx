'use client';
/* @uix registry item — ported from @itsmx/shared-ui/src/form.tsx
 *
 * Phase 4c — additional field kinds, all NATIVE elements (no portal /
 * popover dependency): 'select', 'checkbox', 'radio-group', 'date'.
 * The 'date' kind is deliberately NOT a datepicker — it renders the
 * native <input type="date">, mirroring filter-popover's native-date
 * stance. Out of scope (later phases): field arrays, combobox, file
 * upload.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import {
  Controller,
  type ControllerFieldState,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import { cn } from './utils';

/**
 * Field metadata that drives layout + accessibility for the generic <Form />.
 * In real slices these come from the customization registry; for INF-05 we
 * accept the same shape inline so the component can be exercised without
 * the registry being live yet (registry lands at CUS-01).
 */
export interface FormFieldDescriptor<TName extends string = string> {
  name: TName;
  label: string;
  /** Optional help text shown under the input. */
  description?: string;
  /** Placeholder text inside the input. */
  placeholder?: string;
  /**
   * Override the input type. Default: 'text' for strings, 'number' for numbers.
   *
   * Phase 4c kinds and their Zod pairings:
   *   - 'select'       native <select>; pair with z.string().min(1) or z.enum([...])
   *   - 'checkbox'     native checkbox; pair with z.boolean()
   *   - 'radio-group'  fieldset of native radios; pair with z.enum([...])
   *   - 'date'         native <input type="date"> holding a 'YYYY-MM-DD'
   *                    string; pair with z.string().min(1)
   */
  inputType?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'url'
    | 'tel'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio-group'
    | 'date';
  /** Mark the field as required visually (validity is enforced by the Zod schema). */
  required?: boolean;
  /**
   * Option list — REQUIRED for the 'select' and 'radio-group' kinds
   * (ignored by every other kind). `disabled` options render but cannot
   * be chosen.
   */
  options?: ReadonlyArray<{ value: string; label: string; disabled?: boolean }>;
  /**
   * Initial visible rows for the 'textarea' kind; ignored otherwise. The
   * field also has a min-height floor and is vertically resizable.
   */
  rows?: number;
}

export interface FormProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
  schema: TSchema;
  fields: ReadonlyArray<FormFieldDescriptor<Extract<keyof z.infer<TSchema>, string>>>;
  onSubmit: SubmitHandler<z.infer<TSchema>>;
  defaultValues?: DefaultValues<z.infer<TSchema>>;
  /** Label for the submit button. Defaults to "Submit". */
  submitLabel?: string;
  /**
   * Optional custom render override for unusual fields (rare). May return
   * `null` for fields it doesn't customise — the Form then falls back to
   * `DefaultField` for those, so a page can override one or two fields
   * without having to re-implement (or accidentally drop) the rest.
   */
  renderField?: (args: {
    field: ControllerRenderProps<z.infer<TSchema>>;
    fieldState: ControllerFieldState;
    descriptor: FormFieldDescriptor;
  }) => ReactElement | null;
  /** Empty state shown when `fields` is empty. */
  empty?: ReactNode;
  /** External loading flag — disables submit while truthy. */
  loading?: boolean;
  /** Top-level error to display (e.g., server-side problem). */
  error?: string;
  className?: string;
  /**
   * CUS-03: resolver-provided overrides for per-field labels +
   * descriptions + placeholders. Parent components call useTranslations
   * with the form's surface keys and pass the result here; the form
   * folds these on top of each descriptor's own defaults at render time
   * (override → descriptor → empty). Per Docs/CLAUDE.md Hard Rule 11
   * (Forms render from the customization registry), the resolver is
   * the source of truth — descriptor values are the development-time
   * fallback when no override is wired up yet.
   */
  labels?: Record<string, string>;
  descriptions?: Record<string, string>;
  placeholders?: Record<string, string>;
}

/**
 * Generic schema-driven form. INF-05 ships the stub: it renders fields
 * derived from `fields[]` and binds them to a Zod schema. The customization
 * registry wiring (per-tenant label overrides) attaches at slice CUS-03;
 * for now the descriptor passes labels through verbatim.
 *
 * Hard rule reminder: every user-facing string passed to <Form /> must
 * already have gone through the resolver upstream. <Form /> is the render
 * surface, not the i18n boundary.
 */
export function Form<TSchema extends z.ZodObject<z.ZodRawShape>>(
  props: FormProps<TSchema>,
): ReactElement {
  type Values = z.infer<TSchema>;
  // exactOptionalPropertyTypes: only pass defaultValues if provided. Passing
  // `undefined` is rejected by react-hook-form's typed surface under that flag.
  const form: UseFormReturn<Values> = useForm<Values>({
    resolver: zodResolver(props.schema),
    ...(props.defaultValues !== undefined ? { defaultValues: props.defaultValues } : {}),
  });

  if (props.fields.length === 0) {
    return (
      <div className="rounded border border-dashed border-uix-line p-6 text-sm text-uix-hushed">
        {props.empty ?? 'No fields configured.'}
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(props.onSubmit)}
      className={cn('flex flex-col gap-4', props.className)}
      noValidate
    >
      {props.fields.map((descriptor) => {
        // CUS-03: fold resolver overrides onto each descriptor at render
        // time. The Form stays a presentational component — the parent
        // is responsible for resolving labels/descriptions/placeholders
        // (via useTranslations + customization.resolveSurfaces) and
        // passing them in.
        const resolved: FormFieldDescriptor = {
          ...descriptor,
          ...(props.labels?.[descriptor.name] !== undefined
            ? { label: props.labels[descriptor.name] as string }
            : {}),
          ...(props.descriptions?.[descriptor.name] !== undefined
            ? { description: props.descriptions[descriptor.name] as string }
            : {}),
          ...(props.placeholders?.[descriptor.name] !== undefined
            ? { placeholder: props.placeholders[descriptor.name] as string }
            : {}),
        };
        return (
          <Controller
            key={descriptor.name}
            name={descriptor.name as never}
            control={form.control}
            render={({ field, fieldState }) => {
              // A page-provided renderField may customise only SOME fields
              // and return null for the rest (e.g. /incidents/new overrides
              // title + the select fields only). Fall back to DefaultField
              // for those so descriptor-defined fields (description,
              // category, …) are never silently dropped.
              const custom = props.renderField?.({ field, fieldState, descriptor: resolved });
              return (
                custom ?? (
                  <DefaultField field={field} fieldState={fieldState} descriptor={resolved} />
                )
              );
            }}
          />
        );
      })}

      {props.error ? (
        <p role="alert" className="text-sm text-uix-danger">
          {props.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={props.loading || form.formState.isSubmitting}
        className="self-start rounded bg-uix-text px-4 py-2 text-sm font-medium text-uix-app disabled:opacity-50"
      >
        {props.submitLabel ?? 'Submit'}
      </button>
    </form>
  );
}

interface DefaultFieldProps {
  field: ControllerRenderProps<FieldValues>;
  fieldState: ControllerFieldState;
  descriptor: FormFieldDescriptor;
}

function DefaultField({ field, fieldState, descriptor }: DefaultFieldProps): ReactElement {
  const inputId = `field-${descriptor.name}`;
  const describedBy = descriptor.description ? `${inputId}-desc` : undefined;
  const errorId = fieldState.error ? `${inputId}-err` : undefined;
  const ariaDescribedBy = [describedBy, errorId].filter(Boolean).join(' ') || undefined;
  const inputType = descriptor.inputType ?? 'text';

  const baseInputClass = cn(
    'rounded border border-uix-line bg-transparent px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-uix-ring',
    fieldState.error ? 'border-uix-danger' : '',
  );

  /*
   * Per Docs/ux-design-system.md § Forms: "Required fields marked
   * with an asterisk BEFORE the label, not after." Decorative
   * marker (aria-hidden) — assistive tech consumes the `aria-required`
   * on the control (the input, or the radiogroup fieldset for
   * 'radio-group').
   */
  const requiredMark = descriptor.required ? (
    <span aria-hidden="true" className="mr-1 text-uix-danger">
      *
    </span>
  ) : null;

  const descriptionEl = descriptor.description ? (
    <p id={describedBy} className="text-xs text-uix-hushed">
      {descriptor.description}
    </p>
  ) : null;

  const errorEl = fieldState.error ? (
    <p id={errorId} role="alert" className="text-xs text-uix-danger">
      {fieldState.error.message ?? 'Invalid value.'}
    </p>
  ) : null;

  // 4c: checkbox — row layout with the label AFTER the box (htmlFor
  // preserved); description/error keep their place below the row. The
  // required-asterisk rule is unchanged (before the label text).
  if (inputType === 'checkbox') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id={inputId}
            name={field.name}
            ref={field.ref}
            checked={field.value === true}
            onChange={(e) => field.onChange(e.target.checked)}
            onBlur={field.onBlur}
            aria-required={descriptor.required ? true : undefined}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={ariaDescribedBy}
            className="mt-0.5 h-4 w-4"
            style={{ accentColor: 'var(--uix-accent)' }}
          />
          <label htmlFor={inputId} className="text-sm font-medium">
            {requiredMark}
            {descriptor.label}
          </label>
        </div>
        {descriptionEl}
        {errorEl}
      </div>
    );
  }

  // 4c: radio-group — <fieldset> + <legend> carrying the label/asterisk
  // (same visual style as the standalone label). aria-invalid +
  // aria-describedby sit on the fieldset since the error describes the
  // group, not one radio. role="radiogroup" (rather than the fieldset's
  // implicit role=group) because radiogroup validly supports both
  // aria-required and aria-invalid; group supports neither.
  if (inputType === 'radio-group') {
    return (
      <fieldset
        role="radiogroup"
        className="flex flex-col gap-1"
        aria-required={descriptor.required ? true : undefined}
        aria-invalid={fieldState.error ? true : undefined}
        aria-describedby={ariaDescribedBy}
      >
        <legend className="text-sm font-medium">
          {requiredMark}
          {descriptor.label}
        </legend>
        {(descriptor.options ?? []).map((opt, index) => {
          const optionId = `${inputId}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <input
                type="radio"
                id={optionId}
                name={field.name}
                // RHF's focus-on-first-error needs field.ref on exactly one
                // element of the group — the first radio, per convention.
                ref={index === 0 ? field.ref : undefined}
                value={opt.value}
                checked={field.value === opt.value}
                onChange={() => field.onChange(opt.value)}
                onBlur={field.onBlur}
                disabled={opt.disabled}
                className="h-4 w-4"
                style={{ accentColor: 'var(--uix-accent)' }}
              />
              <label
                htmlFor={optionId}
                className={cn('text-sm', opt.disabled ? 'text-uix-muted' : '')}
              >
                {opt.label}
              </label>
            </div>
          );
        })}
        {descriptionEl}
        {errorEl}
      </fieldset>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {requiredMark}
        {descriptor.label}
      </label>

      {inputType === 'select' ? (
        // 4c: native <select> in the baseInputClass family. appearance-none
        // suppresses the UA arrow; the lucide ChevronDown overlay replaces
        // it (pointer-events-none so clicks fall through to the select).
        // When a placeholder is set, a hidden disabled <option value="">
        // renders first so an empty value displays the placeholder text.
        <div className="relative">
          <select
            id={inputId}
            {...field}
            value={typeof field.value === 'string' ? field.value : ''}
            aria-required={descriptor.required ? true : undefined}
            aria-invalid={fieldState.error ? true : undefined}
            aria-describedby={ariaDescribedBy}
            className={cn(baseInputClass, 'h-9 w-full appearance-none pr-8')}
          >
            {descriptor.placeholder !== undefined ? (
              <option value="" disabled hidden>
                {descriptor.placeholder}
              </option>
            ) : null}
            {(descriptor.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-uix-muted"
          />
        </div>
      ) : inputType === 'textarea' ? (
        <textarea
          id={inputId}
          {...field}
          value={typeof field.value === 'string' ? field.value : ''}
          placeholder={descriptor.placeholder}
          rows={descriptor.rows}
          aria-required={descriptor.required ? true : undefined}
          aria-invalid={fieldState.error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(baseInputClass, 'min-h-24 resize-y')}
        />
      ) : (
        // 4c: the 'date' kind flows through this branch unchanged — a
        // native <input type="date"> whose value is the 'YYYY-MM-DD'
        // string, sharing the same typeof guard as text.
        <input
          id={inputId}
          {...field}
          value={
            inputType === 'number'
              ? typeof field.value === 'number'
                ? field.value
                : ''
              : typeof field.value === 'string'
                ? field.value
                : ''
          }
          type={inputType}
          placeholder={descriptor.placeholder}
          aria-required={descriptor.required ? true : undefined}
          aria-invalid={fieldState.error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={baseInputClass}
        />
      )}

      {descriptionEl}
      {errorEl}
    </div>
  );
}
