/* RTE-01 — RichTextEditor, EmojiPicker and ReactionBar in jsdom: no network egress
 * (TENSOR's on-prem edition is air-gapped), the onChange discipline, emoji insertion,
 * source mode and the same-origin emoji image rule.
 *
 * Every way a page can reach the network is spied on — fetch, XMLHttpRequest,
 * WebSocket, EventSource, sendBeacon, Image/img.src, src/href/srcset attributes and
 * appended img/link/script/iframe/source elements — and no recorded URL may be absolute.
 * The emoji picker uses its real default loader (a bundled dynamic import); a loader
 * hook only adds the JSON import attribute Node needs and bundlers do not.
 * Run after `npm run build`: node --test (from packages/react). */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

register(
  'data:text/javascript,export async function resolve(s, c, next) { const r = await next(s, c); if (r.url.endsWith(".json")) return { ...r, importAttributes: { type: "json" } }; return r; }',
  import.meta.url,
);

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (error) => {
  if (!/Not implemented/.test(error.message)) console.error(error);
});
const jsdom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://app.example.test/incidents/42',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = jsdom;

// ── globals the React/ProseMirror stack expects ────────────────────────────────
const expose = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
for (const name of [
  'window', 'document', 'navigator', 'Node', 'Text', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement',
  'HTMLImageElement', 'HTMLCanvasElement', 'DocumentFragment', 'MutationObserver', 'Range', 'Selection', 'DOMParser',
  'Event', 'KeyboardEvent', 'MouseEvent', 'FocusEvent', 'InputEvent', 'CustomEvent', 'UIEvent', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'localStorage', 'getSelection', 'CSS',
]) {
  if (name in window) expose(name, name === 'window' ? window : window[name]);
}
expose('IS_REACT_ACT_ENVIRONMENT', true);
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.HTMLElement.prototype.scrollIntoView ??= function scrollIntoView() {};
window.document.elementFromPoint ??= () => null;
window.Range.prototype.getBoundingClientRect ??= () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
window.Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] });

// Native Popover API (not in jsdom).
const openPopovers = new WeakSet();
const togglePopover = (el, open) => {
  if (openPopovers.has(el) === open) return;
  if (open) openPopovers.add(el); else openPopovers.delete(el);
  const event = new window.Event('toggle');
  Object.assign(event, { newState: open ? 'open' : 'closed', oldState: open ? 'closed' : 'open' });
  el.dispatchEvent(event);
};
Object.assign(window.HTMLElement.prototype, {
  showPopover() { togglePopover(this, true); },
  hidePopover() { togglePopover(this, false); },
  togglePopover() { togglePopover(this, !openPopovers.has(this)); },
});
const nativeMatches = window.Element.prototype.matches;
window.Element.prototype.matches = function matches(selector) {
  if (selector === ':popover-open') return openPopovers.has(this);
  return nativeMatches.call(this, selector);
};

// ── egress spies ───────────────────────────────────────────────────────────────
const requests = [];
const record = (kind, url) => requests.push({ kind, url: String(url) });
const fetchSpy = async (input) => { record('fetch', typeof input === 'string' ? input : input?.url); throw new Error('network disabled'); };
window.fetch = fetchSpy;
expose('fetch', fetchSpy);
const xhrOpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = function open(method, url, ...rest) { record('xhr', url); return xhrOpen.call(this, method, url, ...rest); };
class SpyWebSocket { constructor(url) { record('websocket', url); throw new Error('network disabled'); } }
class SpyEventSource { constructor(url) { record('eventsource', url); throw new Error('network disabled'); } }
window.WebSocket = SpyWebSocket;
window.EventSource = SpyEventSource;
expose('WebSocket', SpyWebSocket);
expose('EventSource', SpyEventSource);
window.navigator.sendBeacon = (url) => { record('beacon', url); return false; };
const srcDescriptor = Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype, 'src');
Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
  ...srcDescriptor,
  set(value) { record('img.src', value); srcDescriptor.set.call(this, value); },
});
const setAttribute = window.Element.prototype.setAttribute;
const URL_ATTRS = new Set(['src', 'href', 'srcset', 'poster', 'data', 'action', 'formaction', 'background']);
window.Element.prototype.setAttribute = function spySetAttribute(name, value) {
  const attr = String(name).toLowerCase();
  if (URL_ATTRS.has(attr) && this.localName !== 'a') record(`${this.localName}[${attr}]`, value);
  if (attr === 'style' && /url\(/i.test(String(value))) record(`${this.localName}[style]`, value);
  return setAttribute.call(this, name, value);
};
const RESOURCE_TAGS = new Set(['img', 'link', 'script', 'iframe', 'source', 'video', 'audio', 'object', 'embed', 'image']);
new window.MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      for (const el of [node, ...node.querySelectorAll('*')]) {
        if (!RESOURCE_TAGS.has(el.localName)) continue;
        for (const attr of ['src', 'href', 'srcset', 'data']) {
          if (el.hasAttribute(attr)) record(`appended ${el.localName}[${attr}]`, el.getAttribute(attr));
        }
      }
    }
  }
}).observe(window.document, { childList: true, subtree: true });

const ABSOLUTE = /^\s*(?:[a-z][a-z\d+.-]*:|\/\/|\\\\)/i;
const absoluteRequests = () => requests.filter((r) => ABSOLUTE.test(r.url) && !/^(?:data:,?|blob:|about:blank)$/i.test(r.url.trim()));
const remoteResources = () => [...window.document.querySelectorAll([...RESOURCE_TAGS].join(','))]
  .flatMap((el) => ['src', 'href', 'srcset', 'data'].map((a) => el.getAttribute(a)).filter((v) => v && ABSOLUTE.test(v)));

// Loaded after the globals exist.
const React = await import('react');
const { act, createElement: h, useState } = React;
const { createRoot } = await import('react-dom/client');
const { RichTextEditor } = await import('../dist/rich-text.js');
const { EmojiPicker, ReactionBar } = await import('../dist/emoji.js');
const { OFFLINE_EMOJI_ITEMS } = await import('../dist/rich-text/emoji-items.js');
const { resetEmojiSupportCache } = await import('../dist/emoji-image.js');

const settle = async (ms = 30) => {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
  }
};
const mount = async (element) => {
  const host = window.document.createElement('div');
  window.document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(element));
  await settle();
  return { host, root, rerender: (next) => act(async () => root.render(next)), unmount: () => act(async () => root.unmount()) };
};
const click = (el) => act(async () => {
  el.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  el.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }));
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
});
const typeInto = (input, value) => act(async () => {
  const proto = input.localName === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
});
const keydown = (el, key) => act(async () => {
  el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
});
const editorOf = (host) => host.querySelector('.ProseMirror')?.editor;

const SOURCE = '# Outage\n\n\n* keep   this  list\n* as written\n\n| a | b |\n|:-|-:|\n| 1 | 2 |\n\nLast paragraph.\n';

before(() => { requests.length = 0; });
after(() => {
  // Leave nothing running for node:test to wait on.
  window.close();
});

test('offline emoji list: the configured extension-emoji list contains no http string', async () => {
  assert.ok(OFFLINE_EMOJI_ITEMS.length > 1800);
  assert.ok(!JSON.stringify(OFFLINE_EMOJI_ITEMS).includes('http'));
  assert.ok(OFFLINE_EMOJI_ITEMS.every((item) => item.emoji && !('fallbackImage' in item)));
  assert.ok(!OFFLINE_EMOJI_ITEMS.some((item) => item.name === 'octocat'), 'no GitHub custom emoji');

  const view = await mount(h(RichTextEditor, { value: 'x', onChange() {}, 'aria-label': 'Body' }));
  const emoji = editorOf(view.host).extensionManager.extensions.find((ext) => ext.name === 'emoji');
  assert.ok(emoji, 'emoji extension configured');
  assert.equal(emoji.options.forceFallbackImages, false);
  assert.ok(emoji.options.emojis.length > 1800);
  assert.ok(!JSON.stringify(emoji.options.emojis).includes('http'), 'configured list has no http string');
  await view.unmount();
});

test('egress: RichTextEditor (full, comment, template) makes no network request and adds no remote resource', async () => {
  requests.length = 0;
  for (const features of ['full', 'comment', 'template']) {
    const changes = [];
    function Host() {
      const [value, setValue] = useState(SOURCE);
      return h(RichTextEditor, {
        value,
        onChange: (md) => { changes.push(md); setValue(md); },
        features,
        variant: features === 'comment' ? 'composer' : 'field',
        onUploadImage: async () => ({ src: '/api/images/1', alt: 'x' }),
        resolveImageSrc: (src) => (src.startsWith('/api/') ? src : null),
        'aria-label': `Body ${features}`,
        maxLength: 500,
      });
    }
    const view = await mount(h(Host));
    const editor = editorOf(view.host);
    assert.ok(editor, `${features}: editor mounted`);
    assert.deepEqual(changes, [], `${features}: no onChange on mount`);

    // :shortcode suggestion → Unicode emoji
    await act(async () => { editor.chain().focus('end').insertContent(' :thumbsu').run(); });
    await settle();
    const listbox = view.host.querySelector('[role="listbox"]');
    assert.ok(listbox, `${features}: suggestion list open`);
    assert.equal(editor.view.dom.getAttribute('aria-controls'), listbox.id);
    assert.ok(editor.view.dom.getAttribute('aria-activedescendant'));
    await keydown(editor.view.dom, 'Enter');
    await settle();
    assert.ok(changes.at(-1).includes('Last paragraph. 👍'), `${features}: ${JSON.stringify(changes.at(-1))}`);
    assert.ok(!changes.at(-1).includes(':thumbsu'));
    assert.ok(changes.at(-1).startsWith('# Outage\n\n\n* keep   this  list\n* as written\n\n| a | b |\n|:-|-:|\n| 1 | 2 |'), 'untouched blocks keep their bytes');

    // toolbar picker: open, wait for the bundled data, search, pick
    await click(view.host.querySelector('[data-tool="emoji"]'));
    await settle();
    const search = [...window.document.querySelectorAll('.uix-emoji-picker__search')].at(-1);
    assert.ok(search, `${features}: picker open`);
    await typeInto(search, 'party');
    await settle();
    const result = view.host.querySelector('.uix-emoji-picker__btn');
    assert.ok(result, `${features}: search results`);
    const picked = result.textContent;
    await click(result);
    await settle();
    assert.ok(changes.at(-1).includes(picked), `${features}: picked ${picked}`);

    // source mode round trip
    await click(view.host.querySelector('[data-tool="source"]'));
    await settle();
    const textarea = view.host.querySelector('textarea.uix-rich-text__source');
    assert.equal(textarea.value, changes.at(-1));
    await typeInto(textarea, `${textarea.value}\n\nFrom source ✅`);
    assert.ok(changes.at(-1).endsWith('From source ✅'));
    await click(view.host.querySelector('[data-tool="source"]'));
    await settle();
    assert.ok(view.host.querySelector('.ProseMirror').textContent.includes('From source ✅'));

    // link popover refuses unsafe URLs without creating a link
    await click(view.host.querySelector('[data-tool="link"]'));
    await settle();
    const linkInput = view.host.querySelector('.uix-rich-text__link input');
    await typeInto(linkInput, 'javascript:alert(1)');
    await keydown(linkInput, 'Enter');
    assert.ok(view.host.querySelector('.uix-rich-text__link [role="alert"]'), 'invalid link message');
    assert.ok(!changes.at(-1).includes('javascript:'));
    await view.unmount();
  }
  assert.deepEqual(absoluteRequests(), []);
  assert.deepEqual(remoteResources(), []);
  assert.ok(requests.every((r) => r.kind !== 'fetch' && r.kind !== 'xhr' && r.kind !== 'websocket'), JSON.stringify(requests));
});

test('link popover inside a host form: Apply and Enter insert the link and never submit the host form', async () => {
  // Consumers mount the editor inside their own record form. The popover renders in
  // place (no portal), so any submit it raises reaches the host form — React bubbles
  // synthetic onSubmit through ancestors, and a nested <form> is invalid HTML anyway.
  const hostSubmits = [];
  const changes = [];
  function Host() {
    const [value, setValue] = useState('Runbook');
    return h('form', { onSubmit: (event) => { hostSubmits.push(event.type); event.preventDefault(); } },
      h(RichTextEditor, { value, onChange: (md) => { changes.push(md); setValue(md); }, 'aria-label': 'Body' }));
  }
  const view = await mount(h(Host));
  const popover = view.host.querySelector('.uix-rich-text__link');

  await act(async () => { editorOf(view.host).chain().focus('end').run(); });
  await click(view.host.querySelector('[data-tool="link"]'));
  await settle();
  const linkInput = popover.querySelector('input');
  await typeInto(linkInput, 'https://example.test/runbook');
  const apply = [...popover.querySelectorAll('button')].at(-1);
  await click(apply);
  await settle();
  assert.deepEqual(hostSubmits, [], 'Apply did not submit the host form');
  assert.ok(changes.at(-1)?.includes('](https://example.test/runbook)'), JSON.stringify(changes.at(-1)));

  await click(view.host.querySelector('[data-tool="link"]'));
  await settle();
  await typeInto(linkInput, 'https://example.test/other');
  const composing = new window.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
  const changesBeforeIme = changes.length;
  await act(async () => { linkInput.dispatchEvent(composing); });
  await settle();
  assert.equal(composing.defaultPrevented, false, 'an IME composition Enter is left to the IME');
  assert.equal(changes.length, changesBeforeIme, 'an IME composition Enter does not apply the link');
  const enter = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  await act(async () => { linkInput.dispatchEvent(enter); });
  await settle();
  assert.equal(enter.defaultPrevented, true, 'Enter cannot fall through to implicit submission of the host form');
  assert.ok(changes.at(-1)?.includes('](https://example.test/other)'), JSON.stringify(changes.at(-1)));
  assert.deepEqual(hostSubmits, []);
  assert.equal(popover.querySelector('form') === null, true, 'no <form> nested inside the host form');
  assert.equal(String(apply.type), 'button', 'Apply is not a submit button');
  await view.unmount();
});

test('onChange fires for user edits only — never on mount or external value changes', async () => {
  const changes = [];
  const view = await mount(h(RichTextEditor, { value: SOURCE, onChange: (md) => changes.push(md), 'aria-label': 'Body' }));
  await view.rerender(h(RichTextEditor, { value: 'Replaced from the server.', onChange: (md) => changes.push(md), 'aria-label': 'Body' }));
  await settle();
  const editor = editorOf(view.host);
  assert.equal(editor.view.dom.textContent, 'Replaced from the server.');
  await view.rerender(h(RichTextEditor, { value: 'Replaced from the server.', onChange: (md) => changes.push(md), 'aria-label': 'Body', disabled: true }));
  await settle();
  assert.deepEqual(changes, []);
  assert.equal(editor.view.dom.getAttribute('aria-disabled'), 'true');
  assert.equal(editor.isEditable, false);
  await view.unmount();
});

test('egress: EmojiPicker and ReactionBar load, search and pick without network access', async () => {
  requests.length = 0;
  window.localStorage.clear(); // recents from earlier tests would come first
  const picked = [];
  const toggled = [];
  const view = await mount(h('div', null,
    h(EmojiPicker, { onSelect: (e) => picked.push(e), locale: 'de', trigger: h('button', { type: 'button', id: 'open-picker' }, 'Emoji') }),
    h(ReactionBar, {
      reactions: [{ emoji: '👍', count: 2, reactedByMe: true, names: ['Ana', 'Ben'] }],
      onToggle: (e) => toggled.push(e),
    }),
  ));
  await click(view.host.querySelector('#open-picker'));
  await settle();
  const dialog = view.host.querySelector('[role="dialog"]');
  assert.ok(dialog.querySelector('.uix-emoji-picker__nav'), 'categories rendered');
  assert.equal(dialog.querySelector('.uix-emoji-picker__heading').textContent, 'Smileys & Emotionen');
  await typeInto(dialog.querySelector('input[type="search"]'), 'daumen');
  await settle();
  const first = dialog.querySelector('.uix-emoji-picker__btn');
  assert.match(first.getAttribute('aria-label'), /Daumen/);
  await keydown(dialog.querySelector('input[type="search"]'), 'Enter');
  assert.equal(picked.length, 1);

  // reaction chip toggles; the add button offers quick picks first
  await click(view.host.querySelector('.uix-reaction'));
  assert.deepEqual(toggled, ['👍']);
  await click(view.host.querySelector('.uix-reaction-add'));
  await settle();
  const quick = [...view.host.querySelectorAll('.uix-reactions .uix-emoji-picker__section')][0];
  assert.equal(quick.querySelector('h3').textContent, 'Frequently used');
  await click([...quick.querySelectorAll('button')].find((b) => b.textContent === '👍'));
  assert.deepEqual(toggled, ['👍'], 'already reacted → picking it again does not un-react');
  await click([...quick.querySelectorAll('button')].find((b) => b.textContent === '🎉') ?? quick.querySelectorAll('button')[3]);
  await settle();
  await view.unmount();
  assert.deepEqual(absoluteRequests(), []);
  assert.deepEqual(remoteResources(), []);
  assert.deepEqual(requests.filter((r) => r.kind === 'fetch' || r.kind === 'xhr'), []);
});

test('egress: emojiImageBaseUrl only ever yields same-origin images', async () => {
  // A canvas that draws everything in grey: the device "cannot draw" colour emoji.
  const getContext = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, fillText() {},
    getImageData: (x, y, w, hgt) => ({ data: new Uint8ClampedArray(w * hgt * 4).fill(90) }),
  });
  const warnings = [];
  const warn = console.warn;
  console.warn = (message) => warnings.push(String(message));
  try {
    requests.length = 0;
    resetEmojiSupportCache();
    const reactions = [{ emoji: '👩‍💻', count: 1, reactedByMe: false, names: ['Ana'] }];
    const local = await mount(h('div', null,
      h(ReactionBar, { reactions, onToggle() {}, emojiImageBaseUrl: '/static/emoji/' }),
      h(RichTextEditor, { value: 'Deployed ❤️ today', onChange() {}, 'aria-label': 'Body', emojiImageBaseUrl: './emoji' }),
    ));
    const chipImg = local.host.querySelector('.uix-reaction img.uix-emoji-img');
    assert.equal(chipImg?.getAttribute('src'), '/static/emoji/1f469-200d-1f4bb.png');
    assert.equal(chipImg.getAttribute('alt'), '👩‍💻');
    const inline = local.host.querySelector('.ProseMirror img.uix-emoji-img');
    assert.equal(inline?.getAttribute('src'), './emoji/2764-fe0f.png');
    assert.ok(local.host.querySelector('.uix-rich-text__emoji-text'), 'glyph kept in the text');
    await local.unmount();

    resetEmojiSupportCache();
    for (const base of ['https://cdn.example.test/emoji', '//cdn.example.test/emoji', '/\\cdn.example.test', 'javascript:alert(1)', 'data:image/png;base64,x']) {
      const remote = await mount(h(ReactionBar, { reactions, onToggle() {}, emojiImageBaseUrl: base }));
      assert.equal(remote.host.querySelector('img'), null, `${base} ignored`);
      await remote.unmount();
    }
    assert.ok(warnings.some((w) => w.includes('emojiImageBaseUrl')), 'dev warning logged');
    assert.deepEqual(absoluteRequests(), []);
    assert.deepEqual(remoteResources(), []);
  } finally {
    window.HTMLCanvasElement.prototype.getContext = getContext;
    console.warn = warn;
    resetEmojiSupportCache();
  }
});

// ── images in every preset (TENSOR HAR-749) ────────────────────────────────────
const pasteInto = (host, { files = [], text = '' }) => act(async () => {
  const event = new window.Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { files, types: text ? ['text/plain', 'Files'] : ['Files'], getData: (type) => (type === 'text/plain' ? text : '') },
  });
  host.querySelector('.ProseMirror').dispatchEvent(event);
});
const png = () => new window.File([new Uint8Array([137, 80, 78, 71])], 'screenshot.png', { type: 'image/png' });
const statusOf = (host) => host.querySelector('.uix-rich-text__status');

test('images: comment and template presets take a pasted image when onUploadImage is set', async () => {
  for (const features of ['comment', 'template']) {
    const uploads = [];
    const changes = [];
    const view = await mount(h(RichTextEditor, {
      value: '', features, 'aria-label': 'Work note',
      onChange: (md) => changes.push(md),
      onUploadImage: async (file) => { uploads.push(file.name); return { src: '/files/1.png', alt: 'shot' }; },
    }));
    assert.ok(view.host.querySelector('button[aria-label="Image"]'), `${features}: toolbar image button`);
    await pasteInto(view.host, { files: [png()] });
    await settle();
    assert.deepEqual(uploads, ['screenshot.png'], `${features}: onUploadImage called`);
    assert.ok(changes.at(-1)?.includes('![shot](/files/1.png)'), `${features}: image in the markdown`);
    await view.unmount();
  }
});

test('images: without onUploadImage a pasted image inserts nothing and the status line says why', async () => {
  const changes = [];
  const view = await mount(h(RichTextEditor, { value: '', features: 'comment', 'aria-label': 'Work note', onChange: (md) => changes.push(md) }));
  assert.equal(view.host.querySelector('button[aria-label="Image"]'), null, 'no image button');
  await pasteInto(view.host, { files: [png()] });
  await settle();
  assert.deepEqual(changes, [], 'nothing inserted');
  assert.equal(statusOf(view.host).textContent, "Images can't be added here.");
  assert.equal(statusOf(view.host).getAttribute('role'), 'status');
  assert.equal(statusOf(view.host).dataset.kind, 'notice');

  // The notice clears with the next edit.
  await act(async () => { editorOf(view.host).commands.insertContent('ok'); });
  assert.equal(statusOf(view.host).textContent, '');
  await view.unmount();

  const custom = await mount(h(RichTextEditor, {
    value: '', features: 'full', 'aria-label': 'Decision', onChange() {},
    imagesUnavailableReason: 'Attach files to the incident instead.',
  }));
  await pasteInto(custom.host, { files: [png()] });
  await settle();
  assert.equal(statusOf(custom.host).textContent, 'Attach files to the incident instead.');
  await custom.unmount();
});

test('images: a paste that also carries text (Excel, Word) is a text paste — no upload, no notice', async () => {
  const uploads = [];
  const view = await mount(h(RichTextEditor, {
    value: '', features: 'comment', 'aria-label': 'Work note', onChange() {},
    onUploadImage: async (file) => { uploads.push(file.name); return { src: '/files/1.png', alt: '' }; },
  }));
  await pasteInto(view.host, { files: [png()], text: 'a\tb\n1\t2' });
  await settle();
  assert.deepEqual(uploads, []);
  assert.equal(statusOf(view.host).textContent, '');
  await view.unmount();

  const off = await mount(h(RichTextEditor, { value: '', features: 'comment', 'aria-label': 'Work note', onChange() {} }));
  await pasteInto(off.host, { files: [png()], text: 'cells' });
  await settle();
  assert.equal(statusOf(off.host).textContent, '');
  await off.unmount();
});
