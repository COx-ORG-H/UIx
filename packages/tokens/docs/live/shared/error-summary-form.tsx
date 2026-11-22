/* Shared by the live Form errors documentation and tests/error-summary-form. The component API
 * stays in @tensor_1/react; this is the consuming form, including its values and validation. */
import { useState } from 'react';
import {
  Button, Combobox, ErrorSummary, Field, Input, SaveStatus, useFormErrors,
} from '../../../../react/src/index.js';
import type { ComboboxOption, FormFieldErrors } from '../../../../react/src/index.js';

interface Incident { title: string; email: string; team: string }
const EMPTY: Incident = { title: '', email: '', team: '' };

export const ERROR_SUMMARY_FORM_LABELS = {
  title: 'Title',
  titleError: 'Enter a title',
  titleLengthError: 'Title must be 60 characters or fewer',
  email: 'Requester email',
  emailHint: 'The person who reported it',
  emailError: 'Enter the requester’s email address',
  emailFormatError: 'Enter an email address in the correct format, like name@example.com',
  team: 'Team',
  teamError: 'Select the team that owns this incident',
  emptyTeams: 'No teams match',
  privacy: 'Only your service team sees this email address.',
  save: 'Save incident',
  saved: 'Incident saved',
  errorPrefix: 'Error:',
  summaryTitle: (count: number) => count === 1 ? '1 field needs attention' : `${count} fields need attention`,
};

const TEAMS: readonly ComboboxOption[] = [
  { value: 'operations', label: 'Operations' },
  { value: 'support', label: 'Support' },
];

export interface ErrorSummaryFormProps {
  idPrefix?: string;
  labels?: Partial<typeof ERROR_SUMMARY_FORM_LABELS>;
  teams?: readonly ComboboxOption[];
  onSave?: (values: Readonly<Incident>) => void;
}

/** A real three-field form: a failed submit focuses the summary, including the Combobox's input. */
export function ErrorSummaryForm({ idPrefix, labels, teams = TEAMS, onSave }: ErrorSummaryFormProps) {
  const text = { ...ERROR_SUMMARY_FORM_LABELS, ...labels };
  const [values, setValues] = useState(EMPTY);
  const [saved, setSaved] = useState(false);
  const validate = (value: Incident): FormFieldErrors<Incident> => ({
    title: !value.title.trim() ? text.titleError : value.title.length > 60 ? text.titleLengthError : undefined,
    email: !value.email.trim() ? text.emailError
      : !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email) ? text.emailFormatError : undefined,
    team: !teams.some((team) => team.value === value.team && !team.disabled) ? text.teamError : undefined,
  });
  const form = useFormErrors({ values, validate, idPrefix, labels: { errorPrefix: text.errorPrefix } });
  const set = (name: keyof Incident, value: string) => {
    setSaved(false);
    setValues((current) => ({ ...current, [name]: value }));
  };
  const emailControl = form.control('email');
  const privacyId = `${emailControl.id}-privacy`;
  // `id` would name the Combobox wrapper. Its public `inputId` is the summary's focus target.
  const { id: teamInputId, ...teamControl } = form.control('team');
  return (
    <form noValidate className="uix-form-stack" onSubmit={form.handleSubmit((valid) => {
      onSave?.(valid);
      setSaved(true);
      form.reset();
    })}>
      <ErrorSummary {...form.summary} title={text.summaryTitle(form.summary.errors.length)} labels={{ errorPrefix: text.errorPrefix }} />
      <Field label={text.title} required {...form.field('title')}>
        <Input {...form.control('title')} value={values.title} onChange={(event) => set('title', event.currentTarget.value)} />
      </Field>
      <Field label={text.email} hint={text.emailHint} required {...form.field('email')}>
        <Input {...emailControl} type="email" autoComplete="email" aria-describedby={privacyId}
          value={values.email} onChange={(event) => set('email', event.currentTarget.value)} />
      </Field>
      <p id={privacyId} className="uix-text-muted">{text.privacy}</p>
      <Field label={text.team} required {...form.field('team')}>
        <Combobox {...teamControl} inputId={teamInputId} label={text.team} emptyLabel={text.emptyTeams}
          options={teams} value={values.team} onValueChange={(value) => set('team', value)} />
      </Field>
      <div className="uix-cluster">
        <Button type="submit" variant="primary" wrap>{text.save}</Button>
        <SaveStatus state={saved ? 'saved' : 'idle'} labels={{ saved: text.saved }} delay={0} />
      </div>
    </form>
  );
}
