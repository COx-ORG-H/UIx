/* The arrival cue from script: `[data-uix-arrival]` is the attribute form of `.uix-arrival`
 * (arrival.css), the "you are here" tint on the element a person landed on. An attribute, not a
 * class, so React re-rendering the element's `className` never cuts the cue short. Internal: the
 * DataWorkspace return-to-row cue (Peek return experiment) is its only caller so far. */

const handlers = new WeakMap<HTMLElement, (event: AnimationEvent) => void>();

export interface PlayArrivalOptions {
  /** Start this far into the cue (ms): a node that replaced the one playing it picks it up there. */
  elapsed?: number;
  /** The cue ended on its own. */
  onEnd?: () => void;
}

/** Play the arrival cue on `el` once; playing it again restarts it. It removes itself when done. */
export function playArrival(el: HTMLElement, { elapsed = 0, onEnd }: PlayArrivalOptions = {}): void {
  if (el.hasAttribute('data-uix-arrival')) {
    el.removeAttribute('data-uix-arrival');
    // read layout so the browser sees the attribute go, then come back: the animation restarts
    void el.offsetWidth;
  }
  el.setAttribute('data-uix-arrival', '');
  if (elapsed > 0) {
    const cue = el.getAnimations?.().find((animation) => 'animationName' in animation && String((animation as CSSAnimation).animationName).startsWith('uix-arrival'));
    if (cue) cue.currentTime = elapsed;
  }
  const previous = handlers.get(el);
  if (previous) el.removeEventListener('animationend', previous);
  // Only the cue's own animation ends it, not one of a control inside the element.
  const done = (event: AnimationEvent) => {
    if (event.target !== el || !event.animationName.startsWith('uix-arrival')) return;
    el.removeAttribute('data-uix-arrival');
    el.removeEventListener('animationend', done);
    handlers.delete(el);
    onEnd?.();
  };
  handlers.set(el, done);
  el.addEventListener('animationend', done);
}
