/* FR-1 — web-components feasibility spike (THROWAWAY, not a shipped package).
 *
 * One <uix-button> custom element, in two modes, to probe how UIx's --uix-* / .uix-* system
 * interacts with the shadow DOM boundary:
 *
 *   <uix-button variant="primary">Save</uix-button>          → LIGHT DOM
 *     Renders `.uix-btn` in the light DOM, so the page's component stylesheet
 *     (@tensor_1/tokens/styles) styles it directly — identical to a hand-written `.uix-btn`.
 *
 *   <uix-button variant="primary" shadow>Save</uix-button>   → SHADOW DOM
 *     KEY FINDING: `--uix-*` CUSTOM PROPERTIES inherit through the shadow boundary (so the tokens
 *     are visible inside), but `.uix-*` class RULES from the page do NOT pierce the boundary — the
 *     button would be unstyled unless the component CSS is RE-INJECTED into the shadow root. This
 *     spike re-injects it with a <link> (production would use `adoptedStyleSheets` with the CSS
 *     inlined/bundled once and shared across instances).
 */

class UixButton extends HTMLElement {
  connectedCallback() {
    const variant = this.getAttribute('variant') || 'primary';
    const label = (this.getAttribute('label') || this.textContent || 'Button').trim();
    const useShadow = this.hasAttribute('shadow');
    // path to the component CSS to re-inject in shadow mode (relative to the host page)
    const cssHref = this.getAttribute('css') || '../../packages/tokens/build/css/components.css';

    const buttonHTML = `<button class="uix-btn uix-btn--${variant}">${label}</button>`;

    if (useShadow) {
      const root = this.attachShadow({ mode: 'open' });
      // --uix-* custom properties DO inherit across this boundary — no need to redeclare tokens.
      // .uix-* class RULES do NOT — so re-inject the component CSS for the button to look right.
      root.innerHTML = `<link rel="stylesheet" href="${cssHref}">${buttonHTML}`;
    } else {
      // Light DOM: the page's .uix-btn rules apply directly. Same pixels as a plain .uix-btn.
      this.textContent = '';
      this.innerHTML = buttonHTML;
    }
  }
}

customElements.define('uix-button', UixButton);
