import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ErrorSummary, Input } from '../../packages/react/src/index.js';
import { ErrorSummaryForm } from '../../packages/tokens/docs/live/shared/error-summary-form.js';
import type { ErrorSummaryFormProps } from '../../packages/tokens/docs/live/shared/error-summary-form.js';

declare global {
  interface Window { __errorSummary: { saves: number; focused: number; savedValues?: Readonly<{ title: string; email: string; team: string }> } }
}

const GERMAN_LABELS: ErrorSummaryFormProps['labels'] = {
  title: 'Titel', titleError: 'Geben Sie einen Titel ein', titleLengthError: 'Der Titel darf höchstens 60 Zeichen enthalten',
  email: 'E-Mail-Adresse der meldenden Person', emailHint: 'Die Person, die den Vorfall gemeldet hat',
  emailError: 'Geben Sie die E-Mail-Adresse der meldenden Person ein',
  emailFormatError: 'Geben Sie eine E-Mail-Adresse im Format name@beispiel.de ein',
  team: 'Zuständiges Team', teamError: `Wählen Sie das zuständige Team: ${'TEAM-0123456789'.repeat(16)}`,
  emptyTeams: 'Keine passenden Teams', privacy: 'Nur Ihr Serviceteam sieht diese E-Mail-Adresse.',
  save: 'Vorfall speichern', saved: 'Vorfall gespeichert', errorPrefix: 'Fehler:',
  summaryTitle: (count) => count === 1 ? '1 Feld muss korrigiert werden' : `${count} Felder müssen korrigiert werden`,
};
const GERMAN_TEAMS = [{ value: 'operations', label: 'Betrieb' }, { value: 'support', label: 'Support' }];

function TeamAvailability() {
  const [teams, setTeams] = useState([{ value: 'operations', label: 'Operations', disabled: false }]);
  return <section id="availability" aria-labelledby="availability-heading">
    <h2 id="availability-heading">Changing team availability</h2>
    <Button wrap onClick={() => setTeams([])}>Remove Operations</Button>
    <Button wrap onClick={() => setTeams([{ value: 'operations', label: 'Operations', disabled: true }])}>Disable Operations</Button>
    <ErrorSummaryForm idPrefix="availability" teams={teams} onSave={save} />
  </section>;
}

function PassiveSummary() {
  const [version, setVersion] = useState(0);
  return (
    <section id="passive" aria-labelledby="passive-title">
      <h2 id="passive-title">Passive focus</h2>
      <Button wrap onClick={() => setVersion((current) => current + 1)}>Update background errors</Button>
      <ErrorSummary autoFocus={false} prefixTitle={false}
        errors={version ? [{ message: `Check the background update ${version}`, target: 'passive-input' }] : []} />
      <Input id="passive-input" aria-label="Background value" />
    </section>
  );
}

window.__errorSummary = { saves: 0, focused: 0 };
const save: NonNullable<ErrorSummaryFormProps['onSave']> = (values) => {
  window.__errorSummary.saves += 1;
  window.__errorSummary.savedValues = values;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1>Error summary form recovery</h1>
    <section id="recovery" aria-labelledby="recovery-heading" onFocusCapture={(event) => {
      if (event.target.hasAttribute('data-uix-error-summary')) window.__errorSummary.focused += 1;
    }}>
      <h2 id="recovery-heading">Report an incident</h2>
      <ErrorSummaryForm idPrefix="recovery" onSave={save} />
    </section>
    <section id="localized" aria-labelledby="localized-heading" lang="de">
      <h2 id="localized-heading">Einen Vorfall melden</h2>
      <ErrorSummaryForm idPrefix="localized" labels={GERMAN_LABELS} teams={GERMAN_TEAMS} onSave={save} />
    </section>
    <PassiveSummary />
    <TeamAvailability />
  </StrictMode>,
);
