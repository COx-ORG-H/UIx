import { createElement, forwardRef, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../packages/react/src/components/Button.js';
import { MenuItem } from '../../packages/react/src/components/Menu.js';
import { XIcon } from '../../packages/react/src/icons-intrinsic.js';
import fixtures from './fixtures.json';
import type { IconProps } from '../../packages/react/src/icons/types.js';

// Checked-in SVGs rendered by the consumer's actual lucide-react 1.61.0. Replaying native
// SVG preserves the presentation-attribute cascade; no legacy runtime is shipped by UIx.
const Reference = forwardRef<SVGSVGElement, { markup: string }>(function Reference({ markup }, ref) {
  const svg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
  const attrs: Record<string, unknown> = Object.fromEntries([...svg.attributes].filter(({ name }) => name !== 'style').map(({ name, value }) => [name === 'class' ? 'className' : /^(aria|data)-/.test(name) ? name : name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), value]));
  if (svg.hasAttribute('style')) attrs.style = Object.fromEntries([...((svg as unknown as SVGSVGElement).style)].map((property) => [property.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), (svg as unknown as SVGSVGElement).style.getPropertyValue(property)]));
  return createElement('svg', { ...attrs, ref, dangerouslySetInnerHTML: { __html: svg.innerHTML } });
});
const cases: { id: keyof typeof fixtures.svg; props: IconProps; button?: 'md' | 'xs'; marker?: boolean; menu?: boolean }[] = [
  { id: 'default', props: {} }, { id: 'small', props: { size: 14 } },
  { id: 'button', props: { size: 14 }, button: 'md' }, { id: 'button-xs', props: {}, button: 'xs' },
  { id: 'class', props: { className: 'product-icon' } }, { id: 'length', props: { size: '1em' } },
  { id: 'style', props: { size: 14, style: { width: '1rem', height: '1rem' } } },
  { id: 'marker', props: { size: 14 }, marker: true },
  { id: 'menu', props: { size: 14 }, menu: true },
  { id: 'label', props: { 'aria-label': 'Schließen' } },
  { id: 'title', props: { 'aria-labelledby': 'icon-title', children: <title id="icon-title">Schließen</title> } },
];
function App() {
  const iconRef = useRef<SVGSVGElement>(null);
  useEffect(() => { document.documentElement.dataset.forwardedRef = String(iconRef.current instanceof SVGSVGElement); }, []);
  return <><h1>Symbolgrößen mit unveränderter CSS-Priorität</h1>{cases.map(({ id, props, button, marker, menu }) => {
    const wrap = (child: React.ReactNode) => button ? <Button size={button}>{child} Schließen</Button> : marker ? <span className="uix-step__marker">{child}</span> : menu ? <MenuItem icon={child}>Schließen</MenuItem> : child;
    return <section key={id} data-case={id}><h2>{id}</h2><span data-reference>{wrap(<Reference markup={fixtures.svg[id]} />)}</span><span data-candidate>{wrap(<XIcon {...props} ref={id === 'default' ? iconRef : undefined} />)}</span></section>;
  })}</>;
}
createRoot(document.getElementById('root')!).render(<App />);
