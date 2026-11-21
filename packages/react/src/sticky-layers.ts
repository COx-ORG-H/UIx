/**
 * Sticky-layer focus offsets (WCAG 2.2 SC 2.4.11 Focus Not Obscured, technique C43, failure F110).
 *
 * A layer that stays put while content scrolls under it (the Toaster, the TaskTray, a product's own
 * fixed header) registers here. The registry keeps two custom properties on `<html>` current with
 * a ResizeObserver: `--uix-sticky-top` (how far fixed top layers reach down from the viewport's top
 * edge) and `--uix-sticky-bottom` (how far fixed bottom layers reach up from its bottom edge). The
 * stylesheet turns them into `scroll-padding` on the page's scrollers, so the browser stops a
 * focused element clear of the layers (base.css, app-shell.css). `scroll-padding` adds no scroll
 * range, so while a bottom layer is up (`data-uix-sticky-bottom` on `<html>`) the stylesheet also
 * adds room after the page's last content as tall as the layers' reach: the last row can scroll
 * clear of a toast too.
 *
 * CSS cannot help a scroller that ends under a layer when the page around it cannot scroll any
 * further (a 640 px table at the bottom of the window, a toast over its last rows). While any layer
 * is registered, a keyboard focus (`:focus-visible`) that lands under one is moved clear of it in
 * code, one frame later: the nearest scroller that can move does. Code that scrolls by index uses
 * `stickyInsets()` for the same numbers (useVirtualRows `scrollToIndex`).
 *
 * Module state lives on a `Symbol.for` global: the CommonJS build bundles each entry on its own,
 * and two copies of this registry would each write the properties (LESSONS_LEARNED 289fb84).
 */

export type StickyEdge = 'top' | 'bottom';

interface Layer { el: HTMLElement; edge: StickyEdge }
interface Registry {
  layers: Set<Layer>;
  observer: ResizeObserver | null;
  frame: number;
  listening: boolean;
  written: { top: number; bottom: number };
  listeners?: Set<() => void>;
}

const KEY = Symbol.for('@tensor_1/react/sticky-layers');
const host = globalThis as typeof globalThis & { [KEY]?: Registry };
const registry: Registry = (host[KEY] ??= { layers: new Set(), observer: null, frame: 0, listening: false, written: { top: 0, bottom: 0 } });
const listeners = (registry.listeners ??= new Set());

/** The CSS custom property for how far fixed top layers reach down, written on `<html>`. */
export const STICKY_TOP_PROPERTY = '--uix-sticky-top';
/** The CSS custom property for how far fixed bottom layers reach up, written on `<html>`. */
export const STICKY_BOTTOM_PROPERTY = '--uix-sticky-bottom';
/** Set on `<html>` while a bottom layer reaches over the viewport; the stylesheet adds trailing room under it. */
const STICKY_BOTTOM_ATTRIBUTE = 'data-uix-sticky-bottom';

const viewportHeight = (doc: Document) => doc.documentElement.clientHeight || doc.defaultView?.innerHeight || 0;

/** A layer that takes up room: laid out, not `visibility: hidden`, and at least 1 px tall. */
function drawnRect(el: HTMLElement): DOMRect | null {
  if (!el.isConnected) return null;
  const rect = el.getBoundingClientRect();
  if (rect.height < 1 || rect.width < 1) return null;
  const view = el.ownerDocument.defaultView;
  if (view && view.getComputedStyle(el).visibility === 'hidden') return null;
  return rect;
}

const isFixed = (el: HTMLElement) => el.ownerDocument.defaultView?.getComputedStyle(el).position === 'fixed';

/**
 * How far the registered fixed layers reach in from the viewport's top and bottom edges, in CSS
 * pixels. A layer in the top layer (a toaster moved into an open modal) counts like any other.
 */
export function stickyInsets(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): { top: number; bottom: number } {
  if (!doc) return { top: 0, bottom: 0 };
  const height = viewportHeight(doc);
  let top = 0;
  let bottom = 0;
  for (const { el, edge } of registry.layers) {
    if (el.ownerDocument !== doc || !isFixed(el)) continue;
    const rect = drawnRect(el);
    if (!rect) continue;
    if (edge === 'top') top = Math.max(top, Math.min(height, rect.bottom));
    else bottom = Math.max(bottom, Math.min(height, height - rect.top));
  }
  return { top: Math.max(0, Math.ceil(top)), bottom: Math.max(0, Math.ceil(bottom)) };
}

function write() {
  registry.frame = 0;
  if (typeof document === 'undefined') return;
  const next = stickyInsets(document);
  const root = document.documentElement.style;
  if (next.top !== registry.written.top) {
    if (next.top) root.setProperty(STICKY_TOP_PROPERTY, `${next.top}px`); else root.removeProperty(STICKY_TOP_PROPERTY);
  }
  if (next.bottom !== registry.written.bottom) {
    if (next.bottom) root.setProperty(STICKY_BOTTOM_PROPERTY, `${next.bottom}px`); else root.removeProperty(STICKY_BOTTOM_PROPERTY);
    // the stylesheet's trailing room after the page's and the kit scrollers' last content exists only
    // while this is set (scroll-padding adds no scroll range; base.css)
    document.documentElement.toggleAttribute(STICKY_BOTTOM_ATTRIBUTE, next.bottom > 0);
  }
  if (next.top === registry.written.top && next.bottom === registry.written.bottom) return;
  registry.written = next;
  for (const listener of [...listeners]) listener();
}

/**
 * The offsets last written to `<html>` (the same object until they change), for
 * `useSyncExternalStore`. `{ top: 0, bottom: 0 }` with no layer.
 */
export function getStickyInsets(): { readonly top: number; readonly bottom: number } {
  return registry.written;
}

/** Calls `listener` whenever the written offsets change. Returns the unsubscribe function. */
export function subscribeStickyInsets(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Measures now (a registration, a removal) and writes the properties. */
function measure() {
  if (registry.frame) { cancelAnimationFrame(registry.frame); registry.frame = 0; }
  write();
}
/** Measures at the next frame (a resize, a layer that changed size). */
function schedule() {
  if (registry.frame || typeof requestAnimationFrame === 'undefined') return;
  registry.frame = requestAnimationFrame(write);
}

// ── keeping keyboard focus clear of the layers ────────────────────────────────────────────────

const SCROLLS = /^(auto|scroll|overlay)$/;
/** The element's vertical scroll containers, nearest first, ending at the page's scroller; stops at
 *  a fixed or top-layer ancestor (scrolling the page never moves what is inside one). */
function scrollChain(el: HTMLElement): HTMLElement[] {
  const doc = el.ownerDocument;
  const view = doc.defaultView;
  const chain: HTMLElement[] = [];
  if (!view) return chain;
  for (let node = el.parentElement; node && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (SCROLLS.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) chain.push(node);
    if (style.position === 'fixed' || inTopLayer(node)) return chain;
  }
  const page = (doc.scrollingElement as HTMLElement | null) ?? doc.documentElement;
  chain.push(page);
  return chain;
}

function inTopLayer(node: Element): boolean {
  try { return node.matches(':modal, :popover-open'); } catch { return node.matches('dialog[open]'); }
}
const topLayerOf = (el: Element) => {
  for (let node: Element | null = el; node; node = node.parentElement) if (inTopLayer(node)) return node;
  return null;
};

/** The band of a scroller's box the browser treats as clear: inside its `scroll-padding`. */
function scrollerBand(scroller: HTMLElement): { top: number; bottom: number } {
  const doc = scroller.ownerDocument;
  const view = doc.defaultView!;
  const style = view.getComputedStyle(scroller);
  const padTop = parseFloat(style.scrollPaddingTop) || 0;
  const padBottom = parseFloat(style.scrollPaddingBottom) || 0;
  if (scroller === doc.scrollingElement || scroller === doc.documentElement) {
    return { top: padTop, bottom: viewportHeight(doc) - padBottom };
  }
  const rect = scroller.getBoundingClientRect();
  const top = rect.top + scroller.clientTop;
  return { top: top + padTop, bottom: top + scroller.clientHeight - padBottom };
}

/**
 * The amount (in px, positive = scroll down) `el` must move to be clear of every registered layer
 * that covers it and of its scrollers' padding: its whole box when it fits, else its top.
 * 0 when nothing covers it.
 */
function overlap(el: HTMLElement, chain: HTMLElement[]): number {
  const rect = el.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) return 0;
  const layer = topLayerOf(el);
  let top = -Infinity;
  let bottom = Infinity;
  for (const { el: l, edge } of registry.layers) {
    if (l.contains(el) || l.ownerDocument !== el.ownerDocument) continue;
    // a layer under a modal does not cover what is in the modal
    if (layer && topLayerOf(l) == null) continue;
    const r = drawnRect(l);
    if (!r || r.right <= rect.left || r.left >= rect.right) continue;
    if (edge === 'top' && r.top < rect.bottom) top = Math.max(top, r.bottom);
    if (edge === 'bottom' && r.bottom > rect.top) bottom = Math.min(bottom, r.top);
  }
  if (top === -Infinity && bottom === Infinity) return 0;
  // a layer only counts while it covers some of the element: one beside it is no reason to scroll
  const covered = rect.top < top || rect.bottom > bottom;
  if (!covered) return 0;
  for (const scroller of chain) {
    const band = scrollerBand(scroller);
    top = Math.max(top, band.top);
    bottom = Math.min(bottom, band.bottom);
  }
  if (bottom - top < 1) return 0;
  if (rect.top < top) return rect.top - top;
  if (rect.bottom > bottom) return Math.min(rect.bottom - bottom, rect.top - top);
  return 0;
}

/**
 * Scrolls `el` clear of the registered layers that cover it, by the least amount, starting with
 * its nearest scroller (internal; also called by components after they reveal a row).
 */
export function keepClearOfStickyLayers(el: HTMLElement): void {
  if (!registry.layers.size || !el.isConnected) return;
  const chain = scrollChain(el);
  for (let round = 0; round < chain.length + 1; round += 1) {
    const delta = overlap(el, chain);
    if (Math.abs(delta) < 1) return;
    let moved = false;
    for (const scroller of chain) {
      const before = scroller.scrollTop;
      const max = scroller.scrollHeight - scroller.clientHeight;
      const next = Math.min(max, Math.max(0, before + delta));
      if (Math.abs(next - before) < 1) continue;
      scroller.scrollTop = next;
      moved = scroller.scrollTop !== before;
      if (moved) break;
    }
    if (!moved) return;
  }
}

function onFocusIn(event: FocusEvent) {
  const target = event.target as HTMLElement | null;
  if (!target || target.nodeType !== 1 || typeof target.getBoundingClientRect !== 'function') return;
  if (typeof requestAnimationFrame === 'undefined') return;
  // after the browser's own focus scroll, which runs after the focus events
  requestAnimationFrame(() => {
    if (target.ownerDocument.activeElement !== target) return;
    let keyboard = true;
    try { keyboard = target.matches(':focus-visible'); } catch { /* an engine without :focus-visible */ }
    if (keyboard) keepClearOfStickyLayers(target);
  });
}

function onResize() { schedule(); }

// ── registration ──────────────────────────────────────────────────────────────────────────────

/**
 * Registers `el` as a layer that stays over scrolling content at `edge` (a fixed toaster or tray at
 * the bottom, a fixed header at the top). Returns the function that removes it. Without a DOM it
 * does nothing.
 */
export function registerStickyLayer(el: HTMLElement, edge: StickyEdge): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => {};
  const layer: Layer = { el, edge };
  registry.layers.add(layer);
  if (typeof ResizeObserver !== 'undefined') {
    registry.observer ??= new ResizeObserver(schedule);
    registry.observer.observe(el);
  }
  if (!registry.listening) {
    registry.listening = true;
    document.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('resize', onResize);
  }
  measure();
  return () => {
    if (!registry.layers.delete(layer)) return;
    if (![...registry.layers].some((other) => other.el === el)) registry.observer?.unobserve?.(el);
    if (!registry.layers.size) {
      registry.observer?.disconnect();
      registry.observer = null;
      registry.listening = false;
      document.removeEventListener('focusin', onFocusIn, true);
      window.removeEventListener('resize', onResize);
    }
    measure();
  };
}
