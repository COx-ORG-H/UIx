/* AI proposals v1 (enterprise-UX study #5/#6; spec Docs/specs/2026-11-20-ai-proposals.md): the
 * content-free `uix-proposal` event seam, the band policy, AiLabel and its panel, SourceList,
 * AiSuggestion, the AI state of Field with useAiFieldValue, ProposalReview, AiOutputCard with the
 * shared announcer, and AiActor. The look and axe run in Chromium: tests/a11y/ai-assistance.spec.mjs.
 * Renders the BUILT dist — run `npm run build` first. */
import test, { before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement as h, act, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let dom;
let createRoot;
let ui;
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

before(async () => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
  expose('window', dom.window);
  expose('document', dom.window.document);
  expose('navigator', dom.window.navigator);
  expose('IS_REACT_ACT_ENVIRONMENT', true);
  ({ createRoot } = await import('react-dom/client'));
  ui = await import('../dist/index.js');
});
after(() => {
  dom.window.close();
  for (const name of ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT']) delete globalThis[name];
});
afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
  document.documentElement.removeAttribute('data-motion');
});

function mount() {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  return {
    host,
    render: (el) => act(async () => root.render(el)),
    unmount: async () => { await act(async () => root.unmount()); host.remove(); },
  };
}
const click = (el) => act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
/** Every `uix-proposal` detail dispatched while `fn` runs. */
async function collect(fn) {
  const seen = [];
  const off = ui.onProposalEvent((d) => seen.push(d));
  try { await fn(); } finally { off(); }
  return seen;
}
const announcer = () => document.body.querySelector(':scope > [data-uix-announcer]');

test('emitProposalEvent: an allow-listed, frozen detail that bubbles from its target, with timings', async () => {
  const host = document.createElement('section');
  document.body.append(host);
  const local = [];
  host.addEventListener(ui.PROPOSAL_EVENT, (e) => local.push(e.detail));
  const seen = await collect(async () => {
    assert.equal(ui.emitProposalEvent({ action: 'shown', proposalId: 'INC-1042:category', kind: 'suggestion', type: 'incident.category', consequence: 'low' }, host), true);
    assert.equal(ui.emitProposalEvent({ action: 'accepted', proposalId: 'INC-1042:category', kind: 'suggestion', secret: 'VPN is down for Ana' }, host), true);
    assert.equal(ui.emitProposalEvent({ action: 'undone', proposalId: 'INC-1042:category', kind: 'suggestion' }), true);
  });
  assert.equal(ui.PROPOSAL_EVENT, 'uix-proposal');
  assert.equal(local.length, 2, 'the event bubbles from the target it was sent on');
  assert.deepEqual(seen.map((d) => d.action), ['shown', 'accepted', 'undone'], 'document hears every one');
  assert.equal(Object.isFrozen(seen[1]), true);
  assert.equal('secret' in seen[1], false, 'an unknown key never reaches a listener');
  assert.equal(seen[0].type, 'incident.category');
  assert.equal(typeof seen[1].elapsedMs, 'number', 'accepted carries the time since shown');
  assert.equal(typeof seen[2].sinceAcceptMs, 'number', 'undone carries the time since accepted');
  assert.equal(seen[0].elapsedMs, undefined, 'shown has no elapsed time');
  assert.equal(typeof seen[0].at, 'number');
  host.remove();
});

test('emitProposalEvent refuses free text: a sentence, a name or an e-mail in an id is not sent', async () => {
  const warn = mock.method(console, 'warn', () => {});
  const seen = await collect(async () => {
    assert.equal(ui.emitProposalEvent({ action: 'accepted', proposalId: 'Reset Ana’s VPN token', kind: 'suggestion' }), false);
    assert.equal(ui.emitProposalEvent({ action: 'accepted', proposalId: 'ok-1', kind: 'suggestion', type: 'ana@example.com is cc' }), false);
    assert.equal(ui.emitProposalEvent({ action: 'accepted', proposalId: 'ok-1', kind: 'nonsense' }), false);
    assert.equal(ui.emitProposalEvent({ action: 'feedback', proposalId: 'ok-1', kind: 'output' }), false, 'feedback needs a rating');
    assert.equal(ui.emitProposalEvent({ action: 'clicked', proposalId: 'ok-1', kind: 'output' }), false);
  });
  assert.equal(seen.length, 0);
  assert.equal(warn.mock.callCount(), 5);
  for (const call of warn.mock.calls) {
    assert.doesNotMatch(String(call.arguments[0]), /Ana|example\.com/, 'the warning names the field, never the value');
  }
  assert.equal(ui.isProposalId('sugg_8f2c'), true);
  assert.equal(ui.isProposalId(' padded'), false);
  assert.equal(ui.isProposalId('x'.repeat(129)), false);
});

test('consequencePolicy: low may auto-apply, high never does and always needs approval; unknown is high', () => {
  assert.deepEqual(ui.consequencePolicy('low'), { band: 'low', surface: 'suggestion', autoApply: true, requiresApproval: false, undo: false });
  assert.equal(ui.consequencePolicy('medium').autoApply, false);
  assert.equal(ui.consequencePolicy('medium').undo, true);
  const high = ui.consequencePolicy('high');
  assert.equal(high.autoApply, false);
  assert.equal(high.requiresApproval, true);
  assert.equal(high.surface, 'proposal');
  assert.equal(ui.consequencePolicy('extreme').band, 'high', 'an unknown band gets the strictest rules');
  assert.equal(Object.isFrozen(high), true);
});

test('AiLabel: a plain mark without an explanation; with one, a button that opens what, why, sources, sharing and the limitation', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.AiLabel));
  assert.equal(host.querySelector('.uix-ai-label').textContent, 'AI');
  assert.equal(host.querySelector('button'), null);

  await render(h(ui.AiLabel, {
    subject: 'the category',
    explanation: {
      what: 'Category suggested by Assist',
      why: 'The description mentions VPN and a timeout',
      sources: [{ id: 'kb1', title: 'KB-204 VPN timeouts', href: '/kb/204', kind: 'Knowledge article' }],
      sharedHref: '/settings/ai',
    },
  }));
  const button = host.querySelector('button.uix-ai-label');
  assert.equal(button.getAttribute('type'), 'button');
  assert.equal(button.textContent, 'AI');
  assert.equal(button.getAttribute('aria-label'), 'AI: about the category', 'the visible word is inside the name (2.5.3)');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  assert.equal(panel.getAttribute('role'), 'dialog');
  assert.equal(document.getElementById(panel.getAttribute('aria-labelledby')).textContent, 'AIMade with AI');
  assert.match(panel.textContent, /What it isCategory suggested by Assist/);
  assert.match(panel.textContent, /WhyThe description mentions VPN/);
  assert.equal(panel.querySelector('.uix-source-list__link').getAttribute('href'), '/kb/204');
  assert.equal(panel.querySelector('.uix-ai-panel__shared a').getAttribute('href'), '/settings/ai');
  assert.match(panel.querySelector('.uix-ai-panel__limitation').textContent, /AI can be wrong/);

  await click(button);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(document.activeElement, button, 'Esc returns focus to the mark');
  await unmount();
});

test('SourceList: numbered records that open the record; none says so instead of hiding', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.SourceList, { sources: [
    { id: 'a', title: 'INC-0977', href: '/inc/977', kind: 'Similar incident', detail: 'Resolved 3 days ago' },
    { id: 'b', title: 'Runbook: VPN' },
  ] }));
  const items = host.querySelectorAll('.uix-source-list__item');
  assert.equal(host.querySelector('ol'), host.querySelector('.uix-source-list__items'));
  assert.equal(items.length, 2);
  assert.equal(items[0].querySelector('a').getAttribute('href'), '/inc/977');
  assert.equal(items[0].querySelector('.uix-source-list__meta').textContent, 'Similar incident · Resolved 3 days ago');
  assert.equal(items[1].querySelector('a'), null);
  const section = host.querySelector('section');
  assert.equal(document.getElementById(section.getAttribute('aria-labelledby')).textContent, 'Sources');

  await render(h(ui.SourceList, { sources: [] }));
  assert.match(host.textContent, /No sources: this is not based on a record you can check\./);
  await unmount();
});

test('AiSuggestion: a named group with Accept and Dismiss that report through the seam', async () => {
  const { host, render, unmount } = mount();
  const accepted = mock.fn();
  const dismissed = mock.fn();
  let seen = await collect(() => render(h(ui.AiSuggestion, {
    proposalId: 'INC-1:category', type: 'incident.category', consequence: 'medium', value: 'Network',
    explanation: { why: 'Mentions VPN' }, onAccept: accepted, onDismiss: dismissed,
  })));
  assert.deepEqual(seen.map((d) => [d.action, d.kind, d.consequence]), [['shown', 'suggestion', 'medium']]);
  const group = host.querySelector('.uix-ai-suggestion');
  assert.equal(group.getAttribute('role'), 'group');
  assert.equal(group.getAttribute('aria-label'), 'AI suggestion: Network');
  assert.equal(host.querySelector('.uix-ai-suggestion__accept').getAttribute('aria-label'), 'Accept Network');
  assert.equal(host.querySelector('.uix-ai-suggestion__dismiss').getAttribute('aria-label'), 'Dismiss Network');
  assert.equal(host.querySelector('button.uix-ai-label').getAttribute('aria-label'), 'AI: about Network');

  seen = await collect(() => render(h(ui.AiSuggestion, {
    proposalId: 'INC-1:category', type: 'incident.category', consequence: 'medium', value: 'Network', onAccept: accepted, onDismiss: dismissed,
  })));
  assert.equal(seen.length, 0, 'a re-render is not a second showing');

  seen = await collect(() => click(host.querySelector('.uix-ai-suggestion__accept')));
  assert.equal(accepted.mock.callCount(), 1);
  assert.deepEqual(seen.map((d) => [d.action, d.proposalId, d.type]), [['accepted', 'INC-1:category', 'incident.category']]);
  seen = await collect(() => click(host.querySelector('.uix-ai-suggestion__dismiss')));
  assert.equal(dismissed.mock.callCount(), 1);
  assert.equal(seen[0].action, 'dismissed');
  await unmount();
});

function AiCategoryField({ aiValue = 'Network', proposalId = 'INC-1:category', onCommit }) {
  const field = ui.useAiFieldValue({ aiValue, proposalId, type: 'incident.category', initialValue: '' });
  onCommit.current = field.commit;
  return h(ui.Field, { label: 'Category', ai: field.ai },
    h(ui.Input, { value: field.value, onChange: (e) => field.setValue(e.target.value), 'data-state': field.state }));
}
const typeInto = (input, value) => act(async () => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});

test('Field ai + useAiFieldValue: AI-filled is reviewed and marked; an edit makes it human; Revert to AI restores it', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render, unmount } = mount();
  const commit = { current: null };
  let seen = await collect(() => render(h(AiCategoryField, { onCommit: commit })));
  assert.deepEqual(seen.map((d) => [d.action, d.kind]), [['shown', 'field']]);
  const input = host.querySelector('input');
  assert.equal(input.value, 'Network');
  assert.equal(input.dataset.state, 'filled');
  assert.equal(input.getAttribute('data-warning'), 'true', 'AI-filled takes Input review');
  assert.equal(host.querySelector('.uix-field__label-row .uix-ai-label').textContent, 'AI', 'the AI mark beside the label');
  assert.equal(host.querySelector('.uix-field__ai-note').textContent, 'Filled in by AI. Check it.');
  assert.equal(host.querySelector('.uix-field__ai-note').getAttribute('role'), 'status');
  assert.equal(input.getAttribute('aria-describedby'), host.querySelector('.uix-field__msg').id);
  assert.equal(host.querySelector('label').querySelector('button'), null, 'nothing interactive inside the <label>');

  seen = await collect(async () => { await typeInto(input, 'Networ'); await typeInto(input, 'Network hardware'); });
  assert.deepEqual(seen.map((d) => d.action), ['edited'], 'edited is reported once, never per keystroke');
  assert.equal('value' in seen[0], false);
  assert.equal(input.dataset.state, 'edited');
  assert.equal(input.hasAttribute('data-warning'), false, 'an edited value is the person’s: no review state');
  assert.equal(host.querySelector('.uix-ai-label'), null, 'and no AI mark');
  const revert = host.querySelector('.uix-field__revert');
  assert.equal(revert.textContent, 'Revert to AI');
  assert.equal(revert.getAttribute('aria-label'), 'Revert to AI: Category');

  seen = await collect(() => click(revert));
  assert.deepEqual(seen.map((d) => d.action), ['reverted']);
  assert.equal(input.value, 'Network');
  assert.equal(input.dataset.state, 'filled');
  assert.equal(document.activeElement, input, 'focus lands on the control, not the body');
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'AI value restored');

  seen = await collect(() => act(async () => commit.current()));
  assert.deepEqual(seen.map((d) => d.action), ['accepted'], 'saving the AI value is the acceptance');
  await unmount();
});

test('Field ai renders on the server (Field stays server-renderable)', () => {
  const html = renderToStaticMarkup(h(ui.Field, { label: 'Priority', ai: { state: 'filled' } }, h(ui.Input, { defaultValue: 'P3' })));
  assert.match(html, /Filled in by AI\. Check it\./);
  assert.match(html, /data-warning="true"/);
  assert.match(html, /class="uix-ai-label"/);
});

test('ProposalReview: what, changes, reversibility and the band; high needs approval; one press approves once', async () => {
  const { host, render, unmount } = mount();
  const approve = mock.fn();
  const reject = mock.fn();
  const props = {
    proposalId: 'INC-1042:resolve', type: 'incident.resolve', consequence: 'high', title: 'Resolve INC-1042 as Fixed',
    changes: [{ id: 'state', label: 'State', before: 'In progress', after: 'Resolved' }, { id: 'code', label: 'Resolution code', after: 'Fixed' }],
    affected: 'INC-1042 and 2 linked incidents', reversible: false, onApprove: approve, onReject: reject,
  };
  let seen = await collect(() => render(h(ui.ProposalReview, props)));
  assert.equal(seen[0].action, 'shown');
  const card = host.querySelector('section.uix-proposal');
  assert.equal(document.getElementById(card.getAttribute('aria-labelledby')).tagName, 'H3');
  assert.equal(card.dataset.consequence, 'high');
  assert.equal(host.querySelector('.uix-proposal__band').textContent, 'High impact');
  assert.equal(host.querySelector('.uix-proposal__gate').textContent, 'Needs your approval');
  assert.equal(host.querySelector('.uix-proposal__reversible').textContent, 'Cannot be undone');
  const rows = [...host.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent));
  assert.deepEqual(rows, [['State', 'In progress', 'Resolved'], ['Resolution code', '–', 'Fixed']]);
  assert.equal(host.querySelector('caption').textContent, 'What changes');
  assert.match(host.querySelector('.uix-proposal__affected').textContent, /Affected INC-1042 and 2 linked incidents/);
  assert.notEqual(document.activeElement?.textContent, 'Approve', 'Approve never takes focus by itself');
  assert.equal(approve.mock.callCount(), 0, 'nothing is applied on mount');

  const approveButton = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Approve'));
  seen = await collect(async () => { await click(approveButton); await click(approveButton); });
  assert.equal(approve.mock.callCount(), 1, 'a double click approves once');
  assert.deepEqual(seen.map((d) => [d.action, d.consequence]), [['accepted', 'high']]);

  await render(h(ui.ProposalReview, { ...props, proposalId: 'INC-1043:assign', consequence: 'medium', reversible: true, undoSeconds: 30 }));
  assert.equal(host.querySelector('.uix-proposal__reversible').textContent, 'Can be undone for 30 s');
  assert.equal(host.querySelector('.uix-proposal__gate'), null);
  assert.equal(host.querySelector('.uix-proposal__band').textContent, 'Medium impact');
  seen = await collect(() => click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Reject')));
  assert.equal(reject.mock.callCount(), 1);
  assert.equal(seen[0].action, 'dismissed');
  await unmount();
});

test('ProposalReview: applied shows Undo for the undo window only; undo reports with the time since accepting', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  const { host, render, unmount } = mount();
  const undo = mock.fn();
  const base = {
    proposalId: 'INC-7:assign', consequence: 'medium', title: 'Assign to Network team', reversible: true, undoSeconds: 30,
    onApprove() {}, onReject() {}, onUndo: undo,
  };
  await render(h(ui.ProposalReview, { ...base, status: 'applying' }));
  assert.equal(host.querySelector('.uix-proposal__status').textContent, 'Applying…');
  await render(h(ui.ProposalReview, { ...base, status: 'applied' }));
  assert.equal(host.querySelector('.uix-proposal__status').textContent, 'Applied');
  const undoButton = () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Undo');
  assert.ok(undoButton(), 'Undo while the window is open');
  await act(async () => { mock.timers.tick(30_000); });
  assert.equal(undoButton(), undefined, 'gone once the 30 s have passed');

  await render(h(ui.ProposalReview, { ...base, proposalId: 'INC-8:assign', status: 'applied' }));
  const seen = await collect(() => click(undoButton()));
  assert.equal(undo.mock.callCount(), 1);
  assert.equal(seen[0].action, 'undone');
  await unmount();
});

test('AiOutputCard: status once, a shared Loading heartbeat, the whole answer once; never tokens', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { host, render, unmount } = mount();
  const stop = mock.fn();
  const base = { proposalId: 'INC-1:summary', type: 'incident.summary', title: 'Summary', statusText: 'Summarising 12 work notes', onStop: stop };
  await render(h(ui.AiOutputCard, { ...base, status: 'generating' }, 'The VPN'));
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'Summarising 12 work notes');
  const body = host.querySelector('.uix-ai-output__body');
  assert.equal(body.getAttribute('aria-busy'), 'true');
  assert.equal(body.hasAttribute('data-streaming'), true);
  assert.equal(host.querySelector('.uix-ai-output__status .uix-spinner').getAttribute('aria-hidden'), 'true', 'the ring is not a second live region');

  await render(h(ui.AiOutputCard, { ...base, status: 'generating' }, 'The VPN gateway timed out'));
  await act(async () => { mock.timers.tick(ui.AI_HEARTBEAT_MS); });
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'Loading', 'the heartbeat, not the streamed words');
  await render(h(ui.AiOutputCard, { ...base, status: 'generating', statusText: 'Checking 3 similar incidents' }, 'The VPN gateway timed out for'));
  await act(async () => { mock.timers.tick(ui.AI_HEARTBEAT_MS); });
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'Checking 3 similar incidents', 'a changed status is said instead of Loading');

  await render(h(ui.AiOutputCard, { ...base, status: 'done', onRetry() {}, onFeedback() {} }, 'The VPN gateway timed out for 40 users.'));
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'Summary ready. The VPN gateway timed out for 40 users.');
  await act(async () => { mock.timers.tick(ui.AI_HEARTBEAT_MS * 3); });
  await act(async () => { mock.timers.tick(1); });
  assert.equal(announcer().textContent, 'Summary ready. The VPN gateway timed out for 40 users.', 'the heartbeat stopped');
  assert.equal(body.hasAttribute('aria-busy'), false);
  assert.ok(host.querySelector('.uix-copy-button, button[aria-label="Copy"]'), 'Copy once there is text');
  await unmount();
});

test('AiOutputCard: Stop, Retry and quiet feedback report through the seam; announce="final" mutes the chatter', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { host, render, unmount } = mount();
  const stop = mock.fn();
  const retry = mock.fn();
  const rate = mock.fn();
  const base = { proposalId: 'INC-2:summary', title: 'Summary', onStop: stop, onRetry: retry, onFeedback: rate };
  await render(h(ui.AiOutputCard, { ...base, status: 'generating', announce: 'final', statusText: 'Calling the CMDB' }));
  await act(async () => { mock.timers.tick(1); });
  assert.notEqual(announcer().textContent, 'Calling the CMDB', 'final: no status at the start');
  let seen = await collect(() => click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Stop')));
  assert.equal(stop.mock.callCount(), 1);
  assert.equal(seen[0].action, 'stopped');

  await render(h(ui.AiOutputCard, { ...base, status: 'done', text: 'Three CIs changed.' }, 'Three CIs changed.'));
  const up = host.querySelector('[aria-label="Helpful"]');
  const down = host.querySelector('[aria-label="Not helpful"]');
  assert.equal(up.closest('[role="group"]').getAttribute('aria-label'), 'Was this helpful?');
  seen = await collect(() => click(down));
  assert.deepEqual(seen.map((d) => [d.action, d.rating]), [['feedback', 'down']]);
  assert.deepEqual(rate.mock.calls[0].arguments, ['down']);
  assert.equal(down.getAttribute('aria-pressed'), 'true');
  assert.equal(up.getAttribute('aria-pressed'), 'false');
  seen = await collect(() => click([...host.querySelectorAll('button')].find((b) => b.textContent === 'Retry')));
  assert.equal(retry.mock.callCount(), 1);
  assert.equal(seen[0].action, 'retried');
  await unmount();
});

test('reduced motion: no streaming caret, and useStreamingText hands text over in whole sentences', async () => {
  document.documentElement.setAttribute('data-motion', 'reduce');
  const { host, render, unmount } = mount();
  function Streamed({ text, streaming }) {
    return h('p', null, ui.useStreamingText(text, streaming));
  }
  await render(h(ui.AiOutputCard, { proposalId: 'x-1', title: 'Draft', status: 'generating', announce: 'none' }, 'Hello'));
  assert.equal(host.querySelector('.uix-ai-output__body').hasAttribute('data-streaming'), false);
  await render(h(Streamed, { text: 'The gateway timed out. Forty users were aff', streaming: true }));
  assert.equal(host.textContent, 'The gateway timed out.');
  await render(h(Streamed, { text: 'The gateway timed out. Forty users were affected.', streaming: false }));
  assert.equal(host.textContent, 'The gateway timed out. Forty users were affected.');
  document.documentElement.removeAttribute('data-motion');
  await render(h(Streamed, { text: 'The gateway timed out. Forty users were aff', streaming: true }));
  assert.equal(host.textContent, 'The gateway timed out. Forty users were aff', 'with motion: every token as it comes');
  await unmount();
});

test('AiActor: the AI is named as the proposer and a person as the approver; templates can reorder', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.AiActor, { name: 'Assist', approvedBy: 'Ana Kovač' }));
  assert.equal(host.textContent, 'Proposed by AssistAI, approved by Ana Kovač');
  await render(h(ui.AiActor, { name: 'Assist' }));
  assert.equal(host.textContent, 'AssistAI');
  await render(h(ui.UixLabelsProvider, { labels: { ai: { proposedBy: 'Vorgeschlagen von {name}', approvedBy: '{name} hat zugestimmt' } } },
    h(ui.AiActor, { name: 'Assist', approvedBy: 'Ana' })));
  assert.equal(host.textContent, 'Vorgeschlagen von AssistAI, Ana hat zugestimmt');
  await unmount();
});

test('UixLabelsProvider ai translates every AI word; an instance label still wins', async () => {
  const { host, render, unmount } = mount();
  await render(h(ui.UixLabelsProvider, { labels: { ai: { accept: '{value} übernehmen', dismiss: '{value} verwerfen', mark: 'KI', explain: 'KI: zu {subject}' } } },
    h(ui.AiSuggestion, { proposalId: 'p-1', value: 'Netzwerk', explanation: { why: 'VPN' }, onAccept() {}, onDismiss() {}, labels: { dismiss: 'Weg mit {value}' } })));
  assert.equal(host.querySelector('.uix-ai-suggestion__accept').getAttribute('aria-label'), 'Netzwerk übernehmen');
  assert.equal(host.querySelector('.uix-ai-suggestion__dismiss').getAttribute('aria-label'), 'Weg mit Netzwerk');
  assert.equal(host.querySelector('button.uix-ai-label').textContent, 'KI');
  assert.equal(host.querySelector('button.uix-ai-label').getAttribute('aria-label'), 'KI: zu Netzwerk');
  await unmount();
});
