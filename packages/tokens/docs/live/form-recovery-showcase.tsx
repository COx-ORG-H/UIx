import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, ErrorSummary, Field, Input } from '../../../react/src/index.js';
import { ErrorSummaryForm } from './shared/error-summary-form.js';
import type { ErrorSummaryFormProps } from './shared/error-summary-form.js';

const GERMAN: ErrorSummaryFormProps['labels'] = {
  title: 'Titel', titleError: 'Geben Sie einen Titel ein', titleLengthError: 'Der Titel darf höchstens 60 Zeichen enthalten',
  email: 'E-Mail-Adresse', emailHint: 'Die Person, die den Vorfall gemeldet hat',
  emailError: 'Geben Sie die E-Mail-Adresse der meldenden Person ein',
  emailFormatError: 'Geben Sie eine E-Mail-Adresse im Format name@beispiel.de ein',
  team: 'Zuständiges Team', teamError: 'Wählen Sie das Team aus, das für die Untersuchung und Behebung dieses Vorfalls verantwortlich ist. Ihre bisherigen Eingaben bleiben erhalten.',
  emptyTeams: 'Keine passenden Teams', privacy: 'Nur Ihr Serviceteam sieht diese E-Mail-Adresse.',
  save: 'Vorfall speichern', saved: 'Vorfall gespeichert', errorPrefix: 'Fehler:',
  summaryTitle: (count) => count === 1 ? '1 Feld muss korrigiert werden' : `${count} Felder müssen korrigiert werden`,
};
const TEAMS = [{ value: 'operations', label: 'Betrieb' }, { value: 'support', label: 'Support' }];
const SCENARIOS = [
  { id: 'validation', label: '01 · Recover a form', title: 'Report an incident', steps: ['Save the empty form to see all three errors.', 'Press Tab to move through the error links, then Enter to reach a field.', 'Correct the fields and choose a team. Save again: your input stays in place.'] },
  { id: 'translated', label: '02 · Longer translations', title: 'Einen Vorfall melden', steps: ['Save the empty form to show German messages.', 'Narrow the browser or increase zoom. The summary and field messages wrap.', 'Correct one field and watch the heading count change.'] },
  { id: 'unavailable', label: '03 · A field disappears', title: 'A safe place to recover', steps: ['Choose Check details to show an error.', 'Hide the field, then follow its error link.', 'Focus returns to the summary. Show the field again and follow the link to reach it.'] },
] as const;

function UnavailableField() {
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [value, setValue] = useState('');
  return <div className="uix-form-stack">
    <ErrorSummary errors={shown ? [{ message: 'Enter the incident title', target: 'demo-conditional-title' }] : []} focusKey={attempt} />
    {visible && <Field label="Incident title" error={shown ? 'Enter the incident title' : undefined} errorAnnounce="off" errorPrefix="Error:">
      <Input id="demo-conditional-title" value={value} onChange={(event) => {
        setValue(event.currentTarget.value);
        if (event.currentTarget.value.trim()) setShown(false);
      }} />
    </Field>}
    <div className="uix-cluster">
      <Button variant="primary" wrap onClick={() => { setShown(!value.trim()); setAttempt((current) => current + 1); }}>Check details</Button>
      <Button wrap onClick={() => setVisible((current) => !current)}>{visible ? 'Hide field' : 'Show field'}</Button>
    </div>
    <p className="recovery-demo__caption">This simulates a conditional field disappearing after validation.</p>
  </div>;
}

function Showcase() {
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>(SCENARIOS[0]);
  const [reset, setReset] = useState(0);
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    try { localStorage.setItem('uix-theme', next ? 'dark' : 'light'); } catch { /* preview still works without storage */ }
  };
  return <main className="recovery-demo">
    <header className="recovery-demo__header"><a className="recovery-demo__brand" href="explorer.html">UIx / demos</a><Button wrap onClick={toggleTheme}>{dark ? 'Use light theme' : 'Use dark theme'}</Button></header>
    <div className="recovery-demo__hero"><p className="recovery-demo__eyebrow">FORM RECOVERY · INTERACTIVE DEMO</p><h1>A clear way back<br />when a form goes wrong.</h1><p className="recovery-demo__lead">Try the improved error summary with real fields. Find what needs attention, move there with the keyboard, and keep everything you’ve entered.</p></div>
    <div className="recovery-demo__layout">
      <aside aria-label="Demo scenarios"><div className="recovery-demo__scenarios">{SCENARIOS.map((item) => <Button key={item.id} wrap variant={scenario.id === item.id ? 'primary' : 'secondary'} aria-pressed={scenario.id === item.id} onClick={() => setScenario(item)}>{item.label}</Button>)}</div><ol className="recovery-demo__steps">{scenario.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="recovery-demo__caption">Switching scenarios starts a fresh example.</p></aside>
      <section className="recovery-demo__panel" aria-labelledby="demo-heading">
        <div className="recovery-demo__panel-header"><div className="recovery-demo__toolbar"><h2 id="demo-heading" lang={scenario.id === 'translated' ? 'de' : 'en'}>{scenario.title}</h2><Button size="sm" wrap onClick={() => setReset((current) => current + 1)}>Reset example</Button></div><p className="recovery-demo__caption">Demo only. Nothing is sent or stored.</p></div>
        <div className="recovery-demo__example" key={`${scenario.id}-${reset}`} lang={scenario.id === 'translated' ? 'de' : 'en'}>{scenario.id === 'unavailable' ? <UnavailableField /> : <ErrorSummaryForm idPrefix="showcase" labels={scenario.id === 'translated' ? GERMAN : undefined} teams={scenario.id === 'translated' ? TEAMS : undefined} />}</div>
      </section>
    </div>
    <div className="recovery-demo__changes"><section><h2>One clear starting point</h2><p>A failed save focuses the summary. Its links take you straight to each input, including the team picker.</p></section><section><h2>Your work stays with you</h2><p>Correct a field without losing your place. Messages clear as you fix them, and your values remain after the demo save.</p></section><section><h2>Room for real language</h2><p>Long messages wrap in narrow spaces. Missing fields return you to the summary without jumping to a broken destination.</p></section></div>
    <footer className="recovery-demo__footer"><a href="explorer.html#form-errors">Read the form recovery guide</a><a href="explorer.html">Browse all UIx components</a></footer>
  </main>;
}

const root = document.getElementById('form-recovery-demo');
if (root) createRoot(root).render(<Showcase />);
