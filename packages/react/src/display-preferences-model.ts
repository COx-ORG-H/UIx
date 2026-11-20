/* The display-preference contract (HAR-1372): what a person can choose, how it is stored, and the
 * attributes on <html> that @tensor_1/tokens reads (components/display-preferences.css):
 *   data-theme="light|dark"      the colour theme (the kit's existing switch)
 *   data-contrast="more"         stronger secondary text and borders
 *   data-text-scale="sm|lg|xl"   the rem scale (md writes no attribute)
 *   data-motion="reduce"         the reduced-motion policy, also without the OS setting
 *   data-transparency="reduce"   no blur behind scrims, overlays and arriving rows; firmer scrims
 *                                (data-contrast="more" implies it, in the stylesheet)
 *   data-density="compact|comfortable"  table row and control heights (standard writes none)
 * Pure and framework-free: the hook, the components and the pre-paint script share it. */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ContrastPreference = 'standard' | 'more' | 'system';
export type TextScalePreference = 'sm' | 'md' | 'lg' | 'xl';
export type MotionPreference = 'system' | 'reduce';
export type TransparencyPreference = 'standard' | 'reduce' | 'system';
export type DensityPreference = 'compact' | 'standard' | 'comfortable';

export interface DisplayPreferenceValues {
  theme: ThemePreference;
  contrast: ContrastPreference;
  textScale: TextScalePreference;
  motion: MotionPreference;
  transparency: TransparencyPreference;
  density: DensityPreference;
}

/** What the system says, for the `system` choices. */
export interface SystemDisplayPreferences {
  dark: boolean;
  moreContrast: boolean;
  /** `prefers-reduced-transparency: reduce`; only Chromium reports it, so elsewhere it stays false. */
  reducedTransparency?: boolean;
}

/** The attributes written on <html>; `undefined` means the attribute is removed. */
export interface DisplayAttributes {
  'data-theme': 'light' | 'dark';
  'data-contrast'?: 'more';
  'data-text-scale'?: 'sm' | 'lg' | 'xl';
  'data-motion'?: 'reduce';
  'data-transparency'?: 'reduce';
  'data-density'?: 'compact' | 'comfortable';
}

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferenceValues = {
  theme: 'system', contrast: 'system', textScale: 'md', motion: 'system', transparency: 'system', density: 'standard',
};

/** The default `localStorage` key. */
export const DISPLAY_PREFERENCES_STORAGE_KEY = 'uix-display-preferences';

export const DISPLAY_PREFERENCE_OPTIONS = {
  theme: ['light', 'dark', 'system'],
  contrast: ['standard', 'more', 'system'],
  textScale: ['sm', 'md', 'lg', 'xl'],
  motion: ['system', 'reduce'],
  transparency: ['standard', 'reduce', 'system'],
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
  return { theme: pick('theme'), contrast: pick('contrast'), textScale: pick('textScale'), motion: pick('motion'), transparency: pick('transparency'), density: pick('density') };
}

/** The <html> attributes for a set of preferences, resolving `system` against the system. */
export function resolveDisplayAttributes(prefs: DisplayPreferenceValues, system: SystemDisplayPreferences): DisplayAttributes {
  const theme = prefs.theme === 'system' ? (system.dark ? 'dark' : 'light') : prefs.theme;
  const more = prefs.contrast === 'more' || (prefs.contrast === 'system' && system.moreContrast);
  const clear = prefs.transparency === 'reduce' || (prefs.transparency === 'system' && !!system.reducedTransparency);
  return {
    'data-theme': theme,
    'data-contrast': more ? 'more' : undefined,
    'data-text-scale': prefs.textScale === 'md' ? undefined : prefs.textScale,
    'data-motion': prefs.motion === 'reduce' ? 'reduce' : undefined,
    'data-transparency': clear ? 'reduce' : undefined,
    'data-density': prefs.density === 'standard' ? undefined : prefs.density,
  };
}

/** Every attribute the display preferences write on <html>. */
export const DISPLAY_ATTRIBUTE_NAMES = ['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-transparency', 'data-density'] as const;

/** Write (or remove) the attributes on an element, normally `document.documentElement`. */
export function applyDisplayAttributes(root: Element, attributes: DisplayAttributes): void {
  for (const name of DISPLAY_ATTRIBUTE_NAMES) {
    const value = attributes[name];
    if (value == null) root.removeAttribute(name);
    else if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
}

/** The system's answers from `matchMedia`; all false where there is none (SSR, tests). */
export function readSystemDisplayPreferences(): SystemDisplayPreferences {
  const mm = (query: string) => typeof matchMedia === 'function' && matchMedia(query).matches;
  return { dark: mm('(prefers-color-scheme: dark)'), moreContrast: mm('(prefers-contrast: more)'), reducedTransparency: mm('(prefers-reduced-transparency: reduce)') };
}

/**
 * An inline script for the document head that applies the stored preferences before the first
 * paint, so a dark or large-text page never flashes light or small (HAR-1372). Self-contained ES5;
 * it never throws. Put it in a `<script>` before the stylesheets:
 *   <script dangerouslySetInnerHTML={{ __html: displayPreferencesScript() }} />
 * It mirrors parseDisplayPreferences + resolveDisplayAttributes (tested to agree).
 */
export function displayPreferencesScript(storageKey: string = DISPLAY_PREFERENCES_STORAGE_KEY, defaults: DisplayPreferenceValues = DEFAULT_DISPLAY_PREFERENCES): string {
  // JSON is JavaScript syntax, but an HTML parser still recognizes </script> inside it.
  const inlineJSON = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
  return `(function(){try{var d=document.documentElement,p={};try{p=JSON.parse(localStorage.getItem(${inlineJSON(storageKey)})||'{}')||{}}catch(e){}`
    + `if(typeof p!=='object')p={};var D=${inlineJSON(defaults)},O=${inlineJSON(DISPLAY_PREFERENCE_OPTIONS)};for(var k in O)if(O[k].indexOf(p[k])<0)p[k]=D[k];`
    + `var m=function(q){return !!(window.matchMedia&&window.matchMedia(q).matches)};`
    + `var s=function(n,v){if(v)d.setAttribute(n,v);else d.removeAttribute(n)};`
    + `s('data-theme',p.theme==='light'||p.theme==='dark'?p.theme:(m('(prefers-color-scheme: dark)')?'dark':'light'));`
    + `s('data-contrast',p.contrast==='more'||(p.contrast!=='standard'&&m('(prefers-contrast: more)'))?'more':'');`
    + `s('data-text-scale',p.textScale==='sm'||p.textScale==='lg'||p.textScale==='xl'?p.textScale:'');`
    + `s('data-motion',p.motion==='reduce'?'reduce':'');`
    + `s('data-transparency',p.transparency==='reduce'||(p.transparency!=='standard'&&m('(prefers-reduced-transparency: reduce)'))?'reduce':'');`
    + `s('data-density',p.density==='compact'||p.density==='comfortable'?p.density:'')`
    + `}catch(e){}})();`;
}
