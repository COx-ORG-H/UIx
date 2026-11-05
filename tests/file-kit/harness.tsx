/* Live harness for the file kit (2.57), bundled by build.mjs from source for
 * tests/a11y/file-kit.spec.mjs: the incident page's Anhänge panel at its real 340 px (FileDrop
 * over the whole panel, compact FileRows in every state), the same rows at full width, and the
 * kind icons in three sizes.
 *   - #step advances the live upload by 20 %, #finish completes it (state "done");
 *   - a drop on the panel adds rows (uploading at 0 %);
 *   - window.__files lists what FileDrop handed over. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, FILE_KINDS, FileDrop, FileKindIcon, FileRow, DEFAULT_FILE_KIND_LABELS } from '../../packages/react/src/index.js';
import type { FileRowState } from '../../packages/react/src/index.js';

declare global { interface Window { __files: string[] } }
window.__files = [];

const STATIC: { name: string; size: number; state?: FileRowState; meta?: string }[] = [
  { name: 'fehlermeldung-antrag.png', size: 412_000, meta: 'L. Brandt, 14:10' },
  { name: 'WG Störung Förderportal – Rückmeldung LfA.msg', size: 96_000, meta: 'D. Weber, 14:02' },
  { name: 'Antragseingang_November.xlsx', size: 214_000, meta: 'D. Weber, 13:58' },
  { name: 'Notfallhandbuch_Förderportal_v4.pdf', size: 2_400_000, meta: 'D. Weber, 13:55' },
  { name: 'har-mitschnitt-antrag.zip', size: 31_000_000, state: 'scanning' },
  { name: 'nginx-upstream.conf', size: 3_000, state: 'blocked' },
  { name: 'export-antraege-1340.csv', size: 1_100_000, state: 'failed' },
];

function Rows({ compact, live, added }: { compact: boolean; live: { progress: number; state: FileRowState }; added: string[] }) {
  const density = compact ? 'compact' : 'default';
  const noop = () => {};
  return (
    <ul className="uix-file-rows">
      {added.map((name) => <FileRow key={name} as="li" density={density} name={name} size={500_000} state="uploading" progress={0} onCancel={noop} />)}
      <FileRow as="li" density={density} id={compact ? 'live' : undefined} name="foerderportal-gateway-2026-11-05.log" size={8_700_000} meta="L. Brandt, 14:10"
        state={live.state} progress={live.progress} onCancel={noop} href="#download" onMoreActions={noop} />
      {STATIC.map((f) => (
        <FileRow key={f.name} as="li" density={density} name={f.name} size={f.size} meta={f.meta} state={f.state ?? 'idle'}
          href="#download" onMoreActions={noop} onDetails={noop} onRetry={noop} />
      ))}
    </ul>
  );
}

function App() {
  const panel = useRef<HTMLElement>(null);
  const [live, setLive] = useState<{ progress: number; state: FileRowState }>({ progress: 0.2, state: 'uploading' });
  const [added, setAdded] = useState<string[]>([]);
  return (
    <>
      <div className="controls">
        <Button id="step" size="sm" variant="secondary" onClick={() => setLive((l) => ({ state: 'uploading', progress: Math.min(1, Math.round((l.progress + 0.2) * 10) / 10) }))}>Weiter</Button>
        <Button id="finish" size="sm" variant="secondary" onClick={() => setLive({ progress: 1, state: 'done' })}>Fertig</Button>
        <Button id="rest" size="sm" variant="secondary" onClick={() => setLive({ progress: 0, state: 'idle' })}>Ruhe</Button>
      </div>
      <section ref={panel} id="panel" className="panel" aria-label="Anhänge">
        <FileDrop id="drop" targetRef={panel} accept="image/*,.log,.pdf,.msg,.xlsx,.zip,.conf,.csv,.txt" onFiles={(files) => {
          window.__files.push(...files.map((f) => f.name));
          setAdded((a) => [...files.map((f) => f.name), ...a]);
        }} />
        <Rows compact live={live} added={added} />
      </section>
      <section id="wide" aria-label="Anhänge, breit">
        <Rows compact={false} live={live} added={[]} />
      </section>
      <section id="icons" aria-label="Dateiarten" className="icons">
        {FILE_KINDS.map((kind) => (
          <figure key={kind} style={{ margin: 0, display: 'grid', justifyItems: 'center', gap: 'var(--uix-space-2)' }}>
            <span style={{ display: 'flex', gap: 'var(--uix-space-3)', alignItems: 'end' }}>
              <FileKindIcon kind={kind} name={`x.${{ img: 'png', doc: 'pdf', sheet: 'xlsx', mail: 'msg', code: 'conf', log: 'log', archive: 'zip', other: 'bin' }[kind]}`} size="sm" />
              <FileKindIcon kind={kind} name={`x.${{ img: 'jpeg', doc: 'docx', sheet: 'csv', mail: 'eml', code: 'json', log: 'evtx', archive: '7z', other: 'dat' }[kind]}`} />
              <FileKindIcon kind={kind} name={`x.${{ img: 'heic', doc: 'pptx', sheet: 'ods', mail: 'msg', code: 'yaml', log: 'trace', archive: 'tgz', other: 'iso' }[kind]}`} size="lg" label={DEFAULT_FILE_KIND_LABELS[kind]} />
            </span>
            <figcaption style={{ fontSize: 'var(--uix-text-meta)', color: 'var(--uix-text-muted)' }}>{DEFAULT_FILE_KIND_LABELS[kind]}</figcaption>
          </figure>
        ))}
      </section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
