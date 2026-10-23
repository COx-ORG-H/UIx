/* The display-preference contract (HAR-1372): what a person can choose, how it is stored, and the
 * attributes on <html> that @tensor_1/tokens reads (components/display-preferences.css):
 *   data-theme="light|dark"      the colour theme (the kit's existing switch)
 *   data-contrast="more"         stronger secondary text and borders
 *   data-text-scale="sm|lg|xl"   the rem scale (md writes no attribute)
 *   data-motion="reduce"         the reduced-motion policy, also without the OS setting
 *   data-density="compact|comfortable"  table row and control heights (standard writes none)
 * Pure and framework-free: the hook, the components and the pre-paint script share it. */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ContrastPreference = 'standard' | 'more' | 'system';
export type TextScalePreference = 'sm' | 'md' | 'lg' | 'xl';
export type MotionPreference = 'system' | 'reduce';
export type DensityPreference = 'compact' | 'standard' | 'comfortable';

export interface DisplayPreferenceValues {
  theme: ThemePreference;
  contrast: ContrastPreference;
  textScale: TextScalePreference;
  motion: MotionPreference;
  density: DensityPreference;
}

/** What the system says, for the `system` choices. */
export interface SystemDisplayPreferences {
  dark: boolean;
  moreContrast: boolean;
}

/** The attributes written on <html>; `undefined` means the attribute is removed. */
export interface DisplayAttributes {
  'data-theme': 'light' | 'dark';
  'data-contrast'?: 'more';
  'data-text-scale'?: 'sm' | 'lg' | 'xl';
  'data-motion'?: 'reduce';
  'data-density'?: 'compact' | 'comfortable';
}

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferenceValues = {
  theme: 'system', contrast: 'system', textScale: 'md', motion: 'system', density: 'standard',
};

/** The default `localStorage` key. */
export const DISPLAY_PREFERENCES_STORAGE_KEY = 'uix-display-preferences';

export const DISPLAY_PREFERENCE_OPTIONS = {
  theme: ['light', 'dark', 'system'],
  contrast: ['standard', 'more', 'system'],
  textScale: ['sm', 'md', 'lg', 'xl'],
  motion: ['system', 'reduce'],
  density: ['compact', 'standard', 'comfortable'],
} as const satisfies { [K in keyof DisplayPreferenceValues]: readonly DisplayPreferenceValues[K][] };

/** Read stored preferences; anything missing or unknown falls back to `defaults`. */
export function parseDisplayPreferences(raw: string | null | undefined, defaults: DisplayPreferenceValues = DEFAULT_DISPLAY_PREFERENCES): DisplayPreferenceValues {
  let stored: Record<string, unknown> = {};
  try { stored = raw ? (JSON.parse(raw) ?? {}) : {}; } catch { stored = {}; }
  if (typeof stored !== 'object') stored = {};
  const pick = <K extends keyof DisplayPreferenceValues>(key: K): DisplayPreferenceValues[K] => {
    const value = stored[key];
    return (DISPLAY_PREFERENCE_OPTIONS[key] as readonly string[]).includes(value as string) ? value as DisplayPreferenceValues[K] : defaults[key];
  };
  return { theme: pick('theme'), contrast: pick('contrast'), textScale: pick('textScale'), motion: pick('motion'), density: pick('density') };
}

/** The <html> attributes for a set of preferences, resolving `system` against the system. */
export function resolveDisplayAttributes(prefs: DisplayPreferenceValues, system: SystemDisplayPreferences): DisplayAttributes {
  const theme = prefs.theme === 'system' ? (system.dark ? 'dark' : 'light') : prefs.theme;
  const more = prefs.contrast === 'more' || (prefs.contrast === 'system' && system.moreContrast);
  return {
    'data-theme': theme,
    'data-contrast': more ? 'more' : undefined,
    'data-text-scale': prefs.textScale === 'md' ? undefined : prefs.textScale,
    'data-motion': prefs.motion === 'reduce' ? 'reduce' : undefined,
    'data-density': prefs.density === 'standard' ? undefined : prefs.density,
  };
}

/** Write (or remove) the attributes on an element, normally `document.documentElement`. */
export function applyDisplayAttributes(root: Element, attributes: DisplayAttributes): void {
  for (const name of ['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-density'] as const) {
    const value = attributes[name];
    if (value == null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
}

/** The system's answers from `matchMedia`; all false where there is none (SSR, tests). */
export function readSystemDisplayPreferences(): SystemDisplayPreferences {
  const mm = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches;
  return { dark: mm('(prefers-color-scheme: dark)'), moreContrast: mm('(prefers-contrast: more)') };
}

/**
 * An inline script for the document head that applies the stored preferences before the first
 * paint, so a dark or large-text page never flashes light or small (HAR-1372). Self-contained ES5;
 * it never throws. Put it in a `<script>` before the stylesheets:
 *   <script dangerouslySetInnerHTML={{ __html: displayPreferencesScript() }} />
 * It mirrors parseDisplayPreferences + resolveDisplayAttributes (tested to agree).
 */
export function displayPreferencesScript(storageKey: string = DISPLAY_PREFERENCES_STORAGE_KEY, defaults: DisplayPreferenceValues = DEFAULT_DISPLAY_PREFERENCES): string {
  return `(function(){try{var d=document.documentElement,p={};try{p=JSON.parse(localStorage.getItem(${JSON.stringify(storageKey)})||'{}')||{}}catch(e){}`
    + `if(typeof p!=='object')p={};var D=${JSON.stringify(defaults)},O=${JSON.stringify(DISPLAY_PREFERENCE_OPTIONS)};for(var k in O)if(O[k].indexOf(p[k])<0)p[k]=D[k];`
    + `var m=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches)};`
    + `var s=function(n,v){if(v)d.setAttribute(n,v);else d.removeAttribute(n)};`
    + `s('data-theme',p.theme==='light'||p.theme==='dark'?p.theme:(m('(prefers-color-scheme: dark)')?'dark':'light'));`
    + `s('data-contrast',p.contrast==='more'||(p.contrast!=='standard'&&m('(prefers-contrast: more)'))?'more':'');`
    + `s('data-text-scale',p.textScale==='sm'||p.textScale==='lg'||p.textScale==='xl'?p.textScale:'');`
    + `s('data-motion',p.motion==='reduce'?'reduce':'');`
    + `s('data-density',p.density==='compact'||p.density==='comfortable'?p.density:'')`
    + `}catch(e){}})();`;
}
