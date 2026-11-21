import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { Comment, CommentComposer, CommentReaction, CommentThread, CommentUnreadDivider } from '../dist/index.js';

const internal = { label: 'Intern', hint: 'Sophie Wagner sieht das nicht.', submitLabel: 'Intern speichern' };
const external = { label: 'An Sophie Wagner', hint: 'Geht per E-Mail an Sophie Wagner.', submitLabel: 'An Sophie Wagner senden' };

test('legacy and system comments retain their appearance, and mixed audiences have text and icons', () => {
  const old = render(h(Comment, { author: 'Mia', replyTo: 'Sophie' }, 'Original'));
  assert.match(old, /In reply to/);
  assert.doesNotMatch(old, /data-audience|comment__audience/);
  assert.doesNotMatch(render(h(Comment, { variant: 'system', audience: { kind: 'internal', label: 'Intern' } }, 'Assigned')), /data-audience|comment__audience/);
  const message = render(h(Comment, {
    author: 'Mia',
    audience: { kind: 'internal', label: 'Intern' },
    unreadLabel: 'Neu',
    actions: h(CommentReaction, { label: 'Gefällt mir, 2', glyph: '+', count: 2, pressed: true }),
  }, 'Privat'));
  assert.match(message, /data-audience="internal"/);
  assert.match(message, /uix-comment__audience[^>]*><svg[^]*?<\/svg>Intern/);
  assert.match(message, /uix-comment__unread">Neu/);
  assert.match(message, /aria-label="Gefällt mir, 2" aria-pressed="true"/);
});

test('a long thread keeps an old unread reply and the latest three visible in order', () => {
  const replies = ['a','b','c','d','e','f'].map((id) => ({ id, unread: id === 'b', content: id.toUpperCase() }));
  const html = render(h(CommentThread, {
    root: h(Comment, { author: 'Sophie' }, 'Root'),
    replies, summary: '6 Antworten', label: 'Antworten',
    showEarlierLabel: (count) => count + ' weitere Antworten',
    hideEarlierLabel: 'Weniger Antworten',
    composer: h('textarea', { 'aria-label': 'Entwurf', defaultValue: 'Entwurf' }),
  }));
  assert.match(html, /2 weitere Antworten/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /<li id="a" tabindex="-1" hidden="">A<\/li><li id="b" tabindex="-1">B<\/li><li id="c" tabindex="-1" hidden="">C<\/li><li id="d" tabindex="-1">D<\/li><li id="e" tabindex="-1">E<\/li><li id="f" tabindex="-1">F<\/li>/);
  assert.match(html, /<textarea aria-label="Entwurf">Entwurf<\/textarea>/);
});

test('an active search result can be reached without exposing all older replies', () => {
  const html = render(h(CommentThread, {
    root: 'Root', summary: '5 Antworten', label: 'Antworten', revealReplyId: 'result',
    replies: ['earlier', 'result', 'third', 'fourth', 'fifth'].map((id) => ({ id, content: id })),
    showEarlierLabel: (count) => String(count), hideEarlierLabel: 'Weniger Antworten',
  }));
  assert.match(html, /id="earlier" tabindex="-1" hidden=""/);
  assert.match(html, /id="result" tabindex="-1">result/);
});

test('composer locks a forced-internal thread and keeps audience controls and label consistent while pending', () => {
  const locked = render(h(CommentComposer, { audience: 'external', internal, audienceLabel: 'Sichtbarkeit' }));
  assert.match(locked, /data-audience="internal"/);
  assert.match(locked, /Sophie Wagner sieht das nicht\./);
  assert.match(locked, /Intern speichern/);
  assert.doesNotMatch(locked, /radiogroup|An Sophie Wagner senden/);

  const pending = render(h(CommentComposer, { audience: 'external', internal, external, audienceLabel: 'Sichtbarkeit', onAudienceChange() {}, pending: true }));
  assert.match(pending, /data-audience="external"/);
  assert.match(pending, /role="radiogroup"[^]*?Sichtbarkeit/);
  assert.match(pending, /Intern[^]*?An Sophie Wagner/);
  assert.match(pending, /Geht per E-Mail an Sophie Wagner\./);
  assert.match(pending, /An Sophie Wagner senden/);
  assert.equal((pending.match(/ disabled=""/g) ?? []).length, 2);
  assert.match(pending, /aria-busy="true"/);
  assert.match(pending, /aria-disabled="true"/);
});

test('the divider has one spoken label and separately named navigation buttons', () => {
  const html = render(h(CommentUnreadDivider, {
    label: '1 Antwort weiter oben', progress: '1 von 1',
    previous: { label: 'Zur neuen Antwort', onClick() {} },
  }));
  assert.match(html, /role="separator" aria-label="1 Antwort weiter oben"/);
  assert.match(html, /role="status">1 von 1/);
  assert.match(html, /aria-label="Zur neuen Antwort"/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
});
