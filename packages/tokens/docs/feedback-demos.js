/* The live demo under the state-feedback specimens (motion rollout WP2): a Button driven through
 * the same attributes and timings the React Button uses (packages/react/src/motion-timing.ts), so
 * the docs show the motion, not only the frames. The markup is generated (feedback-specimens.js). */
const PENDING_DELAY_MS = 300;
const PENDING_MIN_VISIBLE_MS = 500;
const RESULT_HOLD_MS = 1500;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Replays the change highlight and a count tick on the specimens above (as the React hooks do).
const replay = (el, attribute, value = '') => {
  el.removeAttribute(attribute);
  void el.offsetWidth;
  el.setAttribute(attribute, value);
};

export const initFeedbackDemos = (root) => {
  root.querySelectorAll('[data-feedback-change-run]').forEach((button) => {
    button.addEventListener('click', () => {
      const block = root.querySelector('[data-feedback-change]');
      if (!block) return;
      block.querySelectorAll('.uix-change-highlight').forEach((el) => replay(el, 'data-uix-changed'));
      const count = block.querySelector('.uix-count');
      if (count) { count.textContent = String(Number(count.textContent) + 1); replay(count, 'data-uix-tick', 'up'); }
    });
  });

  root.querySelectorAll('[data-feedback-demo]').forEach((demo) => {
    const button = demo.querySelector('[data-feedback-target]');
    const marker = button?.querySelector(':scope > [hidden]');
    const face = button?.querySelector('.uix-btn__face');
    const announce = demo.querySelector('[data-feedback-announce]');
    if (!button || !marker || !face || !announce) return;
    let running = false;
    demo.addEventListener('click', async (event) => {
      const run = event.target.closest('[data-feedback-run]');
      if (!run || running) return;
      running = true;
      const ms = Number(run.dataset.feedbackRun);
      const fails = run.hasAttribute('data-feedback-fail');
      face.removeAttribute('data-result');
      announce.textContent = '';
      for (const [name, value] of [['aria-busy', 'true'], ['aria-disabled', 'true'], ['data-pending', 'true']]) button.setAttribute(name, value);
      let shownAt = 0;
      const show = setTimeout(() => { shownAt = Date.now(); marker.setAttribute('data-uix-btn-busy', 'true'); }, PENDING_DELAY_MS);
      await wait(ms);
      clearTimeout(show);
      for (const name of ['aria-busy', 'aria-disabled', 'data-pending']) button.removeAttribute(name);
      if (shownAt) await wait(Math.max(0, PENDING_MIN_VISIBLE_MS - (Date.now() - shownAt)));
      marker.removeAttribute('data-uix-btn-busy');
      const kind = fails ? 'error' : 'success';
      face.setAttribute('data-result', kind);
      announce.textContent = face.querySelector(`[data-kind="${kind}"]`).textContent;
      await wait(RESULT_HOLD_MS);
      face.removeAttribute('data-result');
      announce.textContent = '';
      running = false;
    });
  });
};
