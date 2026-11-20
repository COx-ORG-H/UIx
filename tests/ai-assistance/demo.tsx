/* Mounts the docs page's live AI demo (packages/tokens/docs/live/ai-assistance-demo.tsx) exactly as
 * docs.js does, for tests/a11y/ai-assistance.spec.mjs: its event log and its fake model. */
import { mount } from '../../packages/tokens/docs/live/ai-assistance-demo.js';

mount(document.getElementById('root')!);
