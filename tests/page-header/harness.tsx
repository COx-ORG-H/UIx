import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, PageHeader } from '../../packages/react/src/index.js';

// Matches the nested Classified title of TENSOR's archived CI record (HAR-2823).
const LONG_NAME = `Prüfserver ${'Wiederherstellung'.repeat(5)}`;

function Harness() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeader id="short" title="Vorfälle" />
      {(['default', 'display'] as const).flatMap(size => [false, true].map(withHelp => (
        <PageHeader
          key={`${size}-${withHelp}`}
          id={`${size}-${withHelp ? 'help' : 'plain'}`}
          as="h2"
          size={size}
          eyebrow="Server · SRV-0001"
          title={<span>{LONG_NAME}</span>}
          {...(withHelp ? { help: 'Das archivierte CI bleibt bis zur Wiederherstellung unverändert.', helpLabel: 'Hilfe zum CI' } : {})}
          actions={<Button variant="secondary" onClick={() => setSaved(true)}>Wiederherstellen</Button>}
        />
      )))}
      <p role="status">{saved ? 'CI wiederhergestellt.' : ''}</p>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
