/* Steps the in-place text swaps of tests/text-swap/harness.html frame by frame, on a frozen clock,
 * for tests/a11y/text-swap.spec.mjs (the assertions) and tests/text-swap/frames.mjs (the stills for
 * review). Shared so the frames the operator sees are the frames the test measures.
 *
 * How a frame is made: Playwright's clock is paused, so script timers, requestAnimationFrame and
 * performance.now (the Select's per-frame blur, the tooltip's hand-over, a result's hold) only move
 * when `clock.runFor` moves them. CSS transitions and animations run on the compositor's own time,
 * so every one is paused and seeked to the same instant (Web Animations `currentTime`). A frame
 * taken this way does not depend on how loaded the machine is. */

/** Each swap: how to start it, when it has started, and which text leaves and which arrives.
 *  `old` / `new` are run in the page and return an element, or [element, '::before']. */
const dragEnter = () => {
  const dt = new DataTransfer();
  dt.items.add(new File(['x'], 'Bericht.pdf', { type: 'application/pdf' }));
  dt.items.add(new File(['x'], 'Foto.png', { type: 'image/png' }));
  document.querySelector('#drop .uix-file-drop').dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
};

/** Retime a swap locally: `vars` on the element `selector` finds (a wrapper, as a product would). */
const retime = (selector, vars) => async (page) => {
  await page.evaluate(([sel, v]) => { const el = document.querySelector(sel); for (const [k, x] of Object.entries(v)) el.style.setProperty(k, x); }, [selector, vars]);
};

export const SWAPS = {
  'button-result': {
    title: 'Button: label → result',
    root: '#btn',
    trigger: () => window.__swap.result('success'),
    started: () => !!document.querySelector('#btn .uix-btn__face[data-result]'),
    old: () => document.querySelector('#btn .uix-btn__label'),
    new: () => document.querySelector('#btn .uix-btn__result[data-kind="success"]'),
    span: 260,
  },
  'button-back': {
    title: 'Button: result → label (after the hold)',
    root: '#btn',
    // the result has shown and settled; the hold (RESULT_HOLD_MS) ends on the paused clock
    setup: async (page) => {
      await page.evaluate(() => window.__swap.result('success'));
      await until(page, () => !!document.querySelector('#btn .uix-btn__face[data-result]'));
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    },
    clockTrigger: 1500,
    started: () => !document.querySelector('#btn .uix-btn__face[data-result]'),
    old: () => document.querySelector('#btn .uix-btn__result[data-kind="success"]'),
    new: () => document.querySelector('#btn .uix-btn__label'),
    span: 260,
  },
  'button-short': {
    title: 'Button: label → result, a wrapper sets --uix-dur: 40ms (shorter than the exit token)',
    root: '#btn',
    setup: retime('#btn-wrap', { '--uix-dur': '40ms' }),
    trigger: () => window.__swap.result('success'),
    started: () => !!document.querySelector('#btn .uix-btn__face[data-result]'),
    old: () => document.querySelector('#btn .uix-btn__label'),
    new: () => document.querySelector('#btn .uix-btn__result[data-kind="success"]'),
    span: 100,
  },
  'select-local': {
    title: 'Select: trigger value, a wrapper sets --uix-dur-overlay: 100ms and --uix-dur-swap-out: 60ms',
    root: '#team',
    setup: retime('#team-wrap', { '--uix-dur-overlay': '100ms', '--uix-dur-swap-out': '60ms' }),
    trigger: () => window.__swap.select('Rechenzentrum'),
    started: () => document.querySelector('button#team')?.hasAttribute('data-swap'),
    old: () => [document.querySelector('button#team'), '::before'],
    new: () => document.querySelector('button#team .uix-select__value'),
    span: 160,
  },
  select: {
    title: 'Select: trigger value',
    root: '#team',
    trigger: () => window.__swap.select('Rechenzentrum'),
    started: () => document.querySelector('button#team')?.hasAttribute('data-swap'),
    old: () => [document.querySelector('button#team'), '::before'],
    new: () => document.querySelector('button#team .uix-select__value'),
    span: 460,
  },
  'file-drop': {
    title: 'FileDrop: sentence → drag summary',
    root: '#drop .uix-file-drop',
    thumb: 300,
    trigger: dragEnter,
    started: () => document.querySelector('#drop .uix-file-drop')?.hasAttribute('data-dragging'),
    old: () => document.querySelector('#drop .uix-file-drop__text'),
    new: () => document.querySelector('#drop .uix-file-drop__summary'),
    span: 200,
  },
  'file-drop-back': {
    title: 'FileDrop: drag summary → sentence',
    root: '#drop .uix-file-drop',
    thumb: 300,
    setup: async (page) => {
      await page.evaluate(SWAPS['file-drop'].trigger);
      await until(page, SWAPS['file-drop'].started);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    },
    trigger: () => document.querySelector('#drop .uix-file-drop').dispatchEvent(new DragEvent('dragleave', { bubbles: true, cancelable: true })),
    started: () => !document.querySelector('#drop .uix-file-drop')?.hasAttribute('data-dragging'),
    old: () => document.querySelector('#drop .uix-file-drop__summary'),
    new: () => document.querySelector('#drop .uix-file-drop__text'),
    span: 200,
  },
  'file-drop-reenter': {
    title: 'FileDrop: the drag leaves and comes back 40 ms later',
    root: '#drop .uix-file-drop',
    thumb: 300,
    // mid-way back: the sentence is fading in again and the summary has just been emptied
    setup: async (page) => {
      await SWAPS['file-drop-back'].setup(page);
      await page.evaluate(SWAPS['file-drop-back'].trigger);
      await until(page, SWAPS['file-drop-back'].started);
      await page.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 40; }));
    },
    trigger: dragEnter,
    started: () => document.querySelector('#drop .uix-file-drop')?.hasAttribute('data-dragging'),
    old: () => document.querySelector('#drop .uix-file-drop__text'),
    new: () => document.querySelector('#drop .uix-file-drop__summary'),
    span: 200,
  },
  tooltip: {
    title: 'Tooltip: hand-over to a neighbour (2.60 exception)',
    root: '#toolbar',
    clip: { top: -48, left: -40, width: 240, height: 92 },
    thumb: 170,
    setup: async (page) => {
      await page.locator('#toolbar').getByRole('button', { name: 'Link einfügen' }).hover();
      await page.clock.runFor(1200);
      await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    },
    pointer: (page) => page.locator('#toolbar').getByRole('button', { name: 'Kopieren' }).hover(),
    started: () => !!document.querySelector('.uix-tooltip__content--leaving'),
    old: () => document.querySelector('.uix-tooltip__content--leaving > .uix-tooltip__label'),
    new: () => document.querySelector('.uix-tooltip__bubble:popover-open .uix-tooltip__content:not(.uix-tooltip__content--leaving) > .uix-tooltip__label'),
    span: 460,
  },
  count: {
    title: 'Count: 8 → 9 (one node; the old figure is replaced at once)',
    root: '#count',
    clip: { top: -8, left: -24, width: 64, height: 48 },
    thumb: 64,
    trigger: () => window.__swap.count(9),
    started: () => document.querySelector('#count .uix-count')?.getAttribute('data-uix-tick') === 'up',
    old: () => null,
    new: () => document.querySelector('#count .uix-count'),
    span: 200,
  },
};

/** Wait for `fn` (run in the page) on the paused clock, moving it 10 ms at a time. */
async function until(page, fn, what = 'condition') {
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(fn)) return;
    await page.clock.runFor(10);
  }
  throw new Error(`${what} never held: ${fn}`);
}

/** Freeze the page's clock before it loads (call before `page.goto`). */
export async function freezeClock(page) {
  await page.clock.install();
}

/** Put the stepper into the page and pause the clock; returns `step(t)` and `read()`. */
export async function startStepper(page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.evaluate(() => {
    // How visible a node's text is: its opacity times every ancestor's, 0 when it holds no text.
    const ink = (target) => {
      if (!target) return 0;
      const [el, pseudo] = Array.isArray(target) ? target : [target, null];
      if (!el) return 0;
      if (pseudo) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content === 'none' || cs.content === 'normal') return 0;
      } else if (!el.textContent.trim()) return 0;
      let o = Number(getComputedStyle(el, pseudo).opacity);
      for (let p = el.parentElement; p; p = p.parentElement) o *= Number(getComputedStyle(p).opacity);
      return o;
    };
    window.__ink = ink;
    window.__stepper = { t: 0, born: new Map() };
    window.__stepTo = (t) => {
      const s = window.__stepper;
      const live = new Set(document.getAnimations());
      for (const a of live) if (!s.born.has(a)) s.born.set(a, s.t);
      for (const a of [...s.born.keys()]) if (!live.has(a)) s.born.delete(a);
      s.t = t;
      for (const [a, b] of s.born) { a.pause(); a.currentTime = Math.max(0, t - b); }
    };
  });
}

/**
 * Start `swap` and step it in `dt` ms frames. Calls `onFrame(t)` after each frame is in place
 * (take a still there). Returns [{ t, old, new }] with the old and new text's visibility (0–1).
 */
export async function runSwap(page, swap, { dt = 10, onFrame } = {}) {
  if (swap.setup) await swap.setup(page);
  await page.evaluate(() => { window.__stepper.t = 0; window.__stepper.born.clear(); });
  if (swap.pointer) await swap.pointer(page);
  else if (swap.clockTrigger) await page.clock.runFor(swap.clockTrigger);
  else await page.evaluate(swap.trigger);
  // React commits on its own (MessageChannel), not on the paused clock; a hover may wait on a timer
  await until(page, swap.started, `${swap.title}: start`);
  const read = `(() => ({ old: window.__ink((${swap.old})()), new: window.__ink((${swap.new})()) }))()`;
  const frames = [];
  for (let t = 0; t <= swap.span; t += dt) {
    if (t > 0) await page.clock.runFor(dt);
    await page.evaluate((at) => window.__stepTo(at), t);
    const v = await page.evaluate(read);
    frames.push({ t, ...v });
    if (onFrame) await onFrame(t);
  }
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  return frames;
}

/** The worst frame: how visible the fainter of the two texts is when both show. */
export const overlap = (frames) => frames.reduce((m, f) => Math.max(m, Math.min(f.old, f.new)), 0);
