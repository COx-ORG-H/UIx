/* The live AI demo on its component page (Enterprise patterns → AI assistance → "Try it").
 *
 * Mounts the real @tensor_1/react AI pieces, bundled from source by build.mjs, around a fake model
 * that answers from canned text: a triage with an AI-filled field and suggestion chips, a
 * high-impact resolution behind ProposalReview, and a summary that streams in with Stop, Retry and
 * feedback. Beside it, a log of every `uix-proposal` event exactly as a product's adapter receives
 * it. docs.js imports this when the page opens and calls `mount`, which returns the unmount. */
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AiOutputCard, AiSuggestion, AiActor, Button, Field, Input, ProposalReview,
  emitProposalEvent, onProposalEvent, useAiFieldValue, useStreamingText,
} from '../../../react/src/index.js';
import type { AiOutputStatus, ProposalEventDetail, ProposalStatus } from '../../../react/src/index.js';

const SOURCES = [
  { id: 'kb-204', title: 'KB-204 VPN gateway timeouts', href: '#ai-assistance', kind: 'Knowledge article' },
  { id: 'inc-977', title: 'INC-0977 VPN drops for remote staff', href: '#ai-assistance', kind: 'Similar incident' },
];
const SUMMARY = 'The VPN gateway in Sarajevo timed out for about 40 remote users after the 08:00 certificate rotation. '
  + 'Two similar incidents last month were fixed by restarting the gateway service. '
  + 'The caller confirmed at 09:12 that the connection works again.';

function EventLog({ events }: { events: ProposalEventDetail[] }) {
  return (
    <section aria-labelledby="ai-demo-log" style={{ minWidth: 0 }}>
      <h3 id="ai-demo-log" style={{ fontSize: 'var(--uix-text-body)', margin: '0 0 var(--uix-space-2)' }}>uix-proposal events</h3>
      {events.length === 0
        ? <p className="uix-text-muted" style={{ margin: 0, fontSize: 'var(--uix-text-meta)' }}>Nothing yet. Every action on the left adds a line.</p>
        : (
          <ol style={{ margin: 0, paddingInlineStart: 'var(--uix-space-5)', display: 'grid', gap: 'var(--uix-space-1)', fontFamily: 'var(--uix-font-mono)', fontSize: 'var(--uix-text-meta)' }}>
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} style={{ overflowWrap: 'anywhere' }}>
                {e.action} · {e.kind} · {e.proposalId}{e.consequence ? ` · ${e.consequence}` : ''}{e.rating ? ` · ${e.rating}` : ''}
                {e.elapsedMs !== undefined ? ` · ${e.elapsedMs} ms after shown` : ''}{e.sinceAcceptMs !== undefined ? ` · ${e.sinceAcceptMs} ms after accept` : ''}
              </li>
            ))}
          </ol>
        )}
    </section>
  );
}

function Triage() {
  const category = useAiFieldValue({
    aiValue: 'Network › VPN', proposalId: 'demo-INC-1042-category', type: 'incident.category', initialValue: '',
    explanation: { what: 'Category suggested by the fake model', why: 'The description mentions the VPN gateway and a timeout.', sources: SOURCES },
  });
  const [priority, setPriority] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [groupOffers, setGroupOffers] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-3)', minWidth: 0 }}>
      <Field label="Category" ai={category.ai}>
        <Input value={category.value} onChange={(e) => category.setValue(e.target.value)} />
      </Field>
      <div style={{ display: 'grid', gap: 'var(--uix-space-2)' }}>
        <span className="uix-field__label">Priority{priority ? `: ${priority}` : ''}</span>
        {!priority && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' }}>
            {['P2 – High', 'P3 – Moderate'].map((p, i) => (
              <AiSuggestion
                key={p} proposalId={`demo-INC-1042-priority-${i + 1}`} type="incident.priority" value={p}
                explanation={{ why: i === 0 ? '40 users are affected.' : 'A workaround exists: the web VPN.', sources: [] }}
                onAccept={() => setPriority(p)} onDismiss={() => {}}
              />
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: 'var(--uix-space-2)' }}>
        <span className="uix-field__label">Assignment group{group ? `: ${group}` : ''}</span>
        {group ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--uix-space-2)', flexWrap: 'wrap', fontSize: 'var(--uix-text-meta)' }}>
            <AiActor name="Fake model" approvedBy="you" />
            <Button size="sm" variant="ghost" onClick={() => {
              emitProposalEvent({ action: 'undone', proposalId: 'demo-INC-1042-assign', kind: 'suggestion', consequence: 'medium' });
              setGroup(null);
              setGroupOffers(true);
            }}>Undo</Button>
          </span>
        ) : groupOffers ? (
          <AiSuggestion
            proposalId="demo-INC-1042-assign" type="incident.assignment" consequence="medium" value="Network Operations"
            explanation={{ why: '14 of the last 20 VPN incidents went to this group.', sources: SOURCES.slice(1) }}
            onAccept={() => setGroup('Network Operations')} onDismiss={() => setGroupOffers(false)}
          />
        ) : null}
      </div>
      <div><Button size="sm" variant="secondary" onClick={category.commit}>Save the incident</Button></div>
    </div>
  );
}

function Resolution() {
  const [status, setStatus] = useState<ProposalStatus>('proposed');
  const [run, setRun] = useState(1);
  return (
    <div style={{ display: 'grid', gap: 'var(--uix-space-2)', minWidth: 0 }}>
      <ProposalReview
        proposalId={`demo-INC-1042-resolve-${run}`} type="incident.resolve" consequence="high"
        title="Resolve INC-1042 and notify the caller" status={status}
        explanation={{ why: 'The caller confirmed at 09:12 that the VPN works again.', sources: SOURCES.slice(0, 1) }}
        changes={[
          { id: 'state', label: 'State', before: 'In progress', after: 'Resolved' },
          { id: 'code', label: 'Resolution code', after: 'Fixed' },
          { id: 'reply', label: 'Customer reply', after: 'Sent to the caller' },
        ]}
        affected="INC-1042 and 2 linked incidents" reversible={false}
        onApprove={() => { setStatus('applying'); window.setTimeout(() => setStatus('applied'), 900); }}
        onReject={() => setStatus('rejected')}
      />
      {(status === 'applied' || status === 'rejected') && (
        <div><Button size="sm" variant="ghost" onClick={() => { setRun((r) => r + 1); setStatus('proposed'); }}>New proposal</Button></div>
      )}
    </div>
  );
}

function Summary() {
  const [status, setStatus] = useState<AiOutputStatus | null>(null);
  const [text, setText] = useState('');
  const [run, setRun] = useState(0);
  const timer = useRef<number | null>(null);
  const stopTimer = () => { if (timer.current != null) { window.clearInterval(timer.current); timer.current = null; } };
  useEffect(() => stopTimer, []);
  const generate = () => {
    stopTimer();
    setRun((r) => r + 1);
    setText('');
    setStatus('generating');
    const words = SUMMARY.split(' ');
    let i = 0;
    // the fake model: a pause to "read", then a word every 70 ms
    window.setTimeout(() => {
      timer.current = window.setInterval(() => {
        i += 1;
        setText(words.slice(0, i).join(' '));
        if (i >= words.length) { stopTimer(); setStatus('done'); }
      }, 70);
    }, 1200);
  };
  const shown = useStreamingText(text, status === 'generating');
  if (!status) return <div><Button variant="primary" onClick={generate}>Summarise INC-1042</Button></div>;
  return (
    <AiOutputCard
      proposalId={`demo-INC-1042-summary-${run}`} type="incident.summary" title="Summary" status={status}
      statusText={text ? 'Writing the summary' : 'Reading 12 work notes'} text={status === 'done' ? SUMMARY : text}
      sources={SOURCES} explanation={{ what: 'Summary written by the fake model', why: 'From the description and 12 work notes.', sources: SOURCES }}
      onStop={() => { stopTimer(); setStatus('stopped'); }}
      onRetry={generate}
      onFeedback={() => {}}
      actions={<Button size="sm" variant="secondary">Post to work notes</Button>}
    >
      {shown ? <p>{shown}</p> : null}
    </AiOutputCard>
  );
}

function Demo() {
  const [events, setEvents] = useState<ProposalEventDetail[]>([]);
  // on document, as a product's adapter listens: a child's `shown` fires before this effect could
  // attach to an element, and document has every event the page sends
  useEffect(() => onProposalEvent((d) => {
    if (d.proposalId.startsWith('demo-')) setEvents((list) => [d, ...list].slice(0, 14));
  }), []);
  return (
    <div className="uix-docs__live-demo" style={{ display: 'grid', gap: 'var(--uix-space-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))', alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 'var(--uix-space-5)', minWidth: 0 }}>
        <Triage />
        <Resolution />
        <Summary />
      </div>
      <EventLog events={events} />
    </div>
  );
}

export function mount(el: HTMLElement): () => void {
  const root = createRoot(el);
  root.render(<StrictMode><Demo /></StrictMode>);
  return () => root.unmount();
}
