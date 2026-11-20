/* Live harness for the AI primitives (Docs/specs/2026-11-20-ai-proposals.md), bundled by build.mjs
 * from source for tests/a11y/ai-assistance.spec.mjs and the screenshots in the PR.
 *
 *   ?scene=all      the triage, both approval bands, a finished and a generating output card
 *   ?scene=stream   one output card and a Generate button: a fake model streams a reply word by word
 *   &motion=reduce  the in-app reduced-motion preference
 *
 * window.__events holds every `uix-proposal` detail; window.__said every text the shared polite
 * region was given (recorded by a MutationObserver), so a spec can check what a screen reader hears. */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AiActor, AiLabel, AiOutputCard, AiSuggestion, Button, Field, Input, ProposalReview, SourceList,
  onProposalEvent, useAiFieldValue, useStreamingText,
} from '../../packages/react/src/index.js';
import type { AiOutputStatus, ProposalEventDetail, ProposalStatus } from '../../packages/react/src/index.js';

declare global { interface Window { __events: ProposalEventDetail[]; __said: string[] } }
window.__events = [];
window.__said = [];
onProposalEvent((d) => { window.__events.push(d); });

// what the page's polite region is given, in order (the region is created on first use)
new MutationObserver(() => {
  const region = document.body.querySelector(':scope > [data-uix-announcer]');
  const text = region?.textContent ?? '';
  if (text && window.__said[window.__said.length - 1] !== text) window.__said.push(text);
}).observe(document.body, { subtree: true, childList: true, characterData: true });

const q = new URLSearchParams(location.search);
const scene = q.get('scene') ?? 'all';
const noop = () => {};

const SOURCES = [
  { id: 'kb-204', title: 'KB-204 VPN gateway timeouts', href: '#kb-204', kind: 'Knowledge article', detail: 'updated 2 days ago' },
  { id: 'inc-977', title: 'INC-0977 VPN drops for remote staff', href: '#inc-977', kind: 'Similar incident' },
];
const REPLY = 'The VPN gateway in Sarajevo timed out for about 40 remote users after the certificate rotation. Restarting the gateway service fixed it.';

function Triage() {
  const category = useAiFieldValue({
    aiValue: 'Network › VPN', proposalId: 'h-category', type: 'incident.category', initialValue: '',
    explanation: { what: 'Category suggested by Assist', why: 'The description mentions the VPN gateway and a timeout.', sources: SOURCES, sharedHref: '#ai-data' },
  });
  const [offers, setOffers] = useState(['Network Operations', 'Service Desk L2']);
  return (
    <section aria-label="Triage" style={{ display: 'grid', gap: 'var(--uix-space-3)', minWidth: 0 }}>
      <Field label="Category" ai={category.ai}>
        <Input value={category.value} onChange={(e) => category.setValue(e.target.value)} />
      </Field>
      <Field label="Short description" hint="One line"><Input defaultValue="VPN timeout after login" /></Field>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }} data-testid="offers">
        {offers.map((value, i) => (
          <AiSuggestion
            key={value} proposalId={`h-assign-${i}`} type="incident.assignment" consequence="medium" value={value}
            explanation={i === 0 ? { why: '14 of the last 20 VPN incidents went to this group.', sources: [] } : undefined}
            onAccept={() => setOffers([])} onDismiss={() => setOffers((list) => list.filter((v) => v !== value))}
          />
        ))}
      </div>
      <p style={{ margin: 0 }}>Static mark: <AiLabel /></p>
      <div style={{ display: 'grid', gap: 'var(--uix-space-1)' }}>
        <AiActor name="Assist" approvedBy="Ana Kovač" />
        <AiActor name="Assist" />
      </div>
      <SourceList sources={[]} />
    </section>
  );
}

function Proposals() {
  const [status, setStatus] = useState<ProposalStatus>('proposed');
  return (
    <section aria-label="Proposals" style={{ display: 'grid', gap: 'var(--uix-space-3)', minWidth: 0 }}>
      <ProposalReview
        proposalId="h-resolve" type="incident.resolve" consequence="high" status={status}
        title="Resolve INC-1042 and notify the caller"
        explanation={{ why: 'The caller confirmed the VPN works again.', sources: SOURCES.slice(0, 1) }}
        changes={[
          { id: 'state', label: 'State', before: 'In progress', after: 'Resolved' },
          { id: 'code', label: 'Resolution code', after: 'Fixed' },
          { id: 'reply', label: 'Customer reply', after: 'Sent to Lejla Hadžić' },
        ]}
        affected="INC-1042 and 2 linked incidents" reversible={false}
        onApprove={() => { setStatus('applying'); window.setTimeout(() => setStatus('applied'), 300); }}
        onReject={() => setStatus('rejected')} onEdit={noop}
      />
      <ProposalReview
        proposalId="h-assign" type="incident.assignment" consequence="medium" status="applied"
        title="Assign INC-1042 to Network Operations" reversible undoSeconds={30}
        onApprove={noop} onReject={noop} onUndo={noop}
      />
    </section>
  );
}

function Stream({ initial = null as AiOutputStatus | null }) {
  const [status, setStatus] = useState<AiOutputStatus | null>(initial);
  const [text, setText] = useState(initial === 'done' ? REPLY : '');
  const timer = useRef<number | null>(null);
  const stop = () => { if (timer.current != null) { window.clearInterval(timer.current); timer.current = null; } };
  useEffect(() => stop, []);
  const generate = () => {
    stop();
    setText('');
    setStatus('generating');
    const words = REPLY.split(' ');
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      setText(words.slice(0, i).join(' '));
      if (i >= words.length) { stop(); setStatus('done'); }
    }, Number(q.get('wordMs') ?? 400));
  };
  const shown = useStreamingText(text, status === 'generating');
  return (
    <section aria-label="Output" style={{ display: 'grid', gap: 'var(--uix-space-3)', minWidth: 0 }}>
      <div><Button variant="primary" onClick={generate}>Generate</Button></div>
      {status && (
        <AiOutputCard
          proposalId="h-summary" type="incident.summary" title="Summary" status={status}
          statusText="Summarising 12 work notes" text={status === 'done' ? REPLY : undefined} sources={SOURCES}
          explanation={{ what: 'Summary written by Assist', sources: SOURCES }}
          onStop={() => { stop(); setStatus('stopped'); }} onRetry={generate} onFeedback={noop}
          actions={<Button size="sm" variant="secondary">Post to work notes</Button>}
        >
          {shown ? <p>{shown}</p> : null}
        </AiOutputCard>
      )}
    </section>
  );
}

function App() {
  if (scene === 'stream') return <><h1>AI output</h1><Stream /></>;
  return (
    <>
      <h1>AI assistance</h1>
      <div style={{ display: 'grid', gap: 'var(--uix-space-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', alignItems: 'start' }}>
        <Triage />
        <Proposals />
        <div style={{ display: 'grid', gap: 'var(--uix-space-4)', minWidth: 0 }}>
          <Stream initial="done" />
          <AiOutputCard proposalId="h-draft" title="Reply draft" status="generating" statusText="Reading 12 work notes" onStop={noop} announce="none">
            <p>Hello Lejla, thanks for confirming that the VPN</p>
          </AiOutputCard>
        </div>
      </div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
