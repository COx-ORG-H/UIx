'use client';
/* @hx registry item — ported from @itsmx/shared-ui/src/form.tsx */

import { zodResolver } from '@hookform/resolvers/zod';
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
  /** Override the input type. Default: 'text' for strings, 'number' for numbers. */
  inputType?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'textarea';
  /** Mark the field as required visually (validity is enforced by the Zod schema). */
  required?: boolean;
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
      <div className="rounded border border-dashed border-[var(--border)] p-6 text-sm text-[rgb(var(--text-primary)/0.6)]">
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
        <p role="alert" className="text-sm text-[rgb(var(--danger-text))]">
          {props.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={props.loading || form.formState.isSubmitting}
        className="self-start rounded bg-[rgb(var(--text-primary))] px-4 py-2 text-sm font-medium text-[rgb(var(--bg-app))] disabled:opacity-50"
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
    'rounded border border-[var(--border)] bg-transparent px-3 py-2 text-sm',
    'focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus-ring))]',
    fieldState.error ? 'border-[rgb(var(--danger))]' : '',
  );

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {/*
         * Per Docs/ux-design-system.md § Forms: "Required fields marked
         * with an asterisk BEFORE the label, not after." Decorative
         * marker (aria-hidden) — the `aria-required` on the input is
         * what assistive tech consumes.
         */}
        {descriptor.required ? (
          <span aria-hidden="true" className="mr-1 text-[rgb(var(--danger))]">
            *
          </span>
        ) : null}
        {descriptor.label}
      </label>

      {inputType === 'textarea' ? (
        <textarea
          id={inputId}
          {...field}
          value={typeof field.value === 'string' ? field.value : ''}
          placeholder={descriptor.placeholder}
          aria-required={descriptor.required ? true : undefined}
          aria-invalid={fieldState.error ? true : undefined}
          aria-describedby={ariaDescribedBy}
          className={cn(baseInputClass, 'min-h-24 resize-y')}
        />
      ) : (
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

      {descriptor.description ? (
        <p id={describedBy} className="text-xs text-[rgb(var(--text-primary)/0.6)]">
          {descriptor.description}
        </p>
      ) : null}

      {fieldState.error ? (
        <p id={errorId} role="alert" className="text-xs text-[rgb(var(--danger-text))]">
          {fieldState.error.message ?? 'Invalid value.'}
        </p>
      ) : null}
    </div>
  );
}
