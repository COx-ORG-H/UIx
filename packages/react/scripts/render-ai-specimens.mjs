// Regenerates packages/tokens/docs/ai-specimens.js: the docs specimens for the AI primitives (AI
// proposals v1, spec Docs/specs/2026-11-20-ai-proposals.md) — the AI mark, suggestion chips, the AI
// state of a field, the approval card in its bands, the output card and the AI actor — from the
// BUILT package, so the styleguide shows exactly the markup the components render. The live demo
// with a fake model is docs/live/ai-assistance-demo.tsx.
//
//   npm run build -w @tensor_1/react
//   node packages/react/scripts/render-ai-specimens.mjs
//
// packages/react/src/ai-specimens.test.mjs fails when the committed module differs.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const here = dirname(fileURLToPath(import.meta.url));
export const SPECIMEN_MODULE = join(here, '../../tokens/docs/ai-specimens.js');

const caption = (text) => `<div class="uix-guide__subhead" data-ai-specimen>${text}</div>`;
const grid = { display: 'grid', gap: 'var(--uix-space-4)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 22rem), 1fr))', alignItems: 'start' };
const stack = { display: 'grid', gap: 'var(--uix-space-3)', minWidth: 0 };

/** Render every specimen. Returns `{ [route]: html }`. */
export async function renderAiSpecimens() {
  const ui = await import(pathToFileURL(join(here, '../dist/index.js')).href);
  // one render with its own id prefix: no id collides with another specimen on the page
  const html = (el) => renderToStaticMarkup(el, { identifierPrefix: 'docs-ai-' });
  const noop = () => {};
  const sources = [
    { id: 'kb-204', title: 'KB-204 VPN gateway timeouts', href: '#kb-204', kind: 'Knowledge article', detail: 'updated 2 days ago' },
    { id: 'inc-977', title: 'INC-0977 VPN drops for remote staff', href: '#inc-977', kind: 'Similar incident' },
  ];
  const explanation = {
    what: 'Category suggested by Assist',
    why: 'The description mentions the VPN gateway and a timeout after login.',
    sources,
    sharedHref: '#ai-data',
  };

  const triage = h('div', { style: stack },
    h(ui.Field, { label: 'Category', ai: { state: 'filled', explanation } }, h(ui.Input, { defaultValue: 'Network › VPN' })),
    h(ui.Field, { label: 'Priority', ai: { state: 'edited', onRevert: noop } }, h(ui.Input, { defaultValue: 'P2 – High' })),
    h('div', { style: { display: 'grid', gap: 'var(--uix-space-2)' } },
      h('span', { className: 'uix-field__label' }, 'Assignment group'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--uix-space-2)' } },
        h(ui.AiSuggestion, { proposalId: 'docs-assign-1', consequence: 'medium', value: 'Network Operations', explanation: { why: '14 of the last 20 VPN incidents went to this group.', sources: [] }, onAccept: noop, onDismiss: noop }),
        h(ui.AiSuggestion, { proposalId: 'docs-assign-2', consequence: 'medium', value: 'Service Desk L2', onAccept: noop, onDismiss: noop }))),
    h('div', { style: { display: 'grid', gap: 'var(--uix-space-1)', fontSize: 'var(--uix-text-meta)' } },
      h(ui.AiActor, { name: 'Assist', approvedBy: 'Ana Kovač' }),
      h(ui.AiActor, { name: 'Assist' })));

  const proposals = h('div', { style: stack },
    h(ui.ProposalReview, {
      proposalId: 'docs-resolve', consequence: 'high', title: 'Resolve INC-1042 and notify the caller',
      explanation: { why: 'The caller confirmed in the last comment that the VPN works again.', sources: sources.slice(0, 1) },
      changes: [
        { id: 'state', label: 'State', before: 'In progress', after: 'Resolved' },
        { id: 'code', label: 'Resolution code', after: 'Fixed' },
        { id: 'note', label: 'Customer reply', after: 'Sent to Lejla Hadžić' },
      ],
      affected: 'INC-1042 and 2 linked incidents',
      reversible: false,
      onApprove: noop, onReject: noop, onEdit: noop,
    }),
    h(ui.ProposalReview, {
      proposalId: 'docs-assign', consequence: 'medium', title: 'Assign INC-1042 to Network Operations', status: 'applied',
      reversible: true, undoSeconds: 30, onApprove: noop, onReject: noop, onUndo: noop,
    }));

  const output = h(ui.AiOutputCard, {
    proposalId: 'docs-summary', title: 'Summary', status: 'done',
    text: 'The VPN gateway in Sarajevo timed out for 40 remote users after the 08:00 certificate rotation.',
    sources, onRetry: noop, onFeedback: noop, rating: null,
    actions: h(ui.Button, { variant: 'secondary', size: 'sm' }, 'Post to work notes'),
  }, h('p', null, 'The VPN gateway in Sarajevo timed out for 40 remote users after the 08:00 certificate rotation. Two similar incidents were fixed by restarting the gateway service.'));
  const generating = h(ui.AiOutputCard, {
    proposalId: 'docs-draft', title: 'Reply draft', status: 'generating', statusText: 'Reading 12 work notes', onStop: noop, announce: 'none',
  }, h('p', null, 'Hello Lejla, thanks for confirming that the VPN'));

  return {
    'examples-crm-itsm': [
      caption('AI assistance (React <code>AiLabel</code>, <code>AiSuggestion</code>, <code>Field ai</code> with <code>useAiFieldValue</code>, <code>ProposalReview</code>, <code>AiOutputCard</code>, <code>SourceList</code>, <code>AiActor</code>; <code>.uix-ai-*</code>, <code>.uix-proposal</code>, <code>.uix-source-list</code>) — an incident triage. The AI mark opens what, why, the sources and what is shared. An AI-filled field takes the review state until a person edits it; an edited one offers Revert to AI. Two assignment groups are offered as chips (N-best, medium band). Resolving and notifying the caller is high: it needs an explicit Approve and cannot be undone. The assignment was applied and can be undone for 30 s. The summary has Copy, Retry, quiet thumbs and its sources; the draft is still generating. The component page has the rules and a live demo with a fake model.'),
      '<div data-ai-example>',
      html(h('div', { style: grid }, triage, proposals, h('div', { style: stack }, output, generating))),
      '</div>',
    ].join('\n'),
  };
}

export const aiSpecimenModule = (specimens) => `/* GENERATED by packages/react/scripts/render-ai-specimens.mjs — do not edit by hand.
 * The docs specimens for the AI primitives (AI proposals v1): the markup the built React components render.
 * showcase-data.js appends each block to its route.
 * packages/react/src/ai-specimens.test.mjs fails when this file and the components differ. */
export const AI_SPECIMENS = ${JSON.stringify(specimens, null, 2)};
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  writeFileSync(SPECIMEN_MODULE, aiSpecimenModule(await renderAiSpecimens()));
  console.log(`wrote ${SPECIMEN_MODULE}`);
}
