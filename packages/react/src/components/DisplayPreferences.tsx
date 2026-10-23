"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../cx.js';
import { useUixLabels } from '../labels-context.js';
import { MonitorIcon, MoonIcon, SunIcon } from '../icons/components.js';
import { Segmented, SegmentedOption } from './Segmented.js';
import {
  DEFAULT_DISPLAY_PREFERENCES, DISPLAY_PREFERENCES_STORAGE_KEY, applyDisplayAttributes, parseDisplayPreferences,
  readSystemDisplayPreferences, resolveDisplayAttributes,
} from '../display-preferences-model.js';
import type { DisplayPreferenceValues, SystemDisplayPreferences, ThemePreference } from '../display-preferences-model.js';

// useLayoutEffect warns during SSR; fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;
/**
 * Same-tab change notice between hook instances (the `storage` event only reaches other tabs).
 * It carries the new values, so an instance never has to read them back from storage, which a
 * sandboxed frame or blocked site data makes throw.
 */
const CHANGE_EVENT = 'uixdisplaypreferencechange';
interface ChangeDetail { storageKey: string; value: DisplayPreferenceValues }

export interface UseDisplayPreferencesOptions {
  /** `localStorage` key. Default `DISPLAY_PREFERENCES_STORAGE_KEY`; pass the same key to `displayPreferencesScript`. */
  storageKey?: string;
  /** Your defaults for anything not stored yet. Pass the same to `displayPreferencesScript`. */
  defaults?: Partial<DisplayPreferenceValues>;
  /** Write the attributes on `<html>`. Default `true`; `false` for a preview that must not restyle the page. */
  apply?: boolean;
}

export interface UseDisplayPreferencesResult {
  /** The person's choices (`system` where they left it to the system). */
  preferences: DisplayPreferenceValues;
  /** The theme in force: `system` resolved against `prefers-color-scheme`. */
  resolvedTheme: 'light' | 'dark';
  setPreference: <K extends keyof DisplayPreferenceValues>(key: K, value: DisplayPreferenceValues[K]) => void;
  setPreferences: (next: DisplayPreferenceValues) => void;
}

/**
 * The display preferences (HAR-1372): read from `localStorage`, kept in step with the system
 * (`prefers-color-scheme`, `prefers-contrast`), with other tabs and with other users of the hook in
 * this tab, and written to `<html>` as the attributes the tokens read. Changing one applies at once,
 * with every transition suspended for that frame so nothing fades between themes.
 * The server renders `defaults`; the stored choice is read before the first paint on the client
 * (pair it with `displayPreferencesScript` in the head, so the page itself never flashes).
 */
export function useDisplayPreferences({ storageKey = DISPLAY_PREFERENCES_STORAGE_KEY, defaults: defaultOverrides, apply = true }: UseDisplayPreferencesOptions = {}): UseDisplayPreferencesResult {
  const defaults = { ...DEFAULT_DISPLAY_PREFERENCES, ...defaultOverrides };
  const defaultsKey = JSON.stringify(defaults);
  const [preferences, setState] = useState<DisplayPreferenceValues>(defaults);
  const [system, setSystem] = useState<SystemDisplayPreferences>({ dark: false, moreContrast: false });
  const [loaded, setLoaded] = useState(false);

  const read = useCallback(() => {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(storageKey); } catch { /* private mode */ }
    return parseDisplayPreferences(raw, JSON.parse(defaultsKey));
  }, [storageKey, defaultsKey]);
  // the latest choices: every instance in the tab keeps them in step through CHANGE_EVENT
  const latest = useRef(preferences);
  latest.current = preferences;

  useIsomorphicLayoutEffect(() => {
    setState(read());
    setSystem(readSystemDisplayPreferences());
    setLoaded(true);
  }, [read]);

  useEffect(() => {
    const queries = typeof matchMedia === 'function' ? [matchMedia('(prefers-color-scheme: dark)'), matchMedia('(prefers-contrast: more)')] : [];
    const onSystem = () => setSystem(readSystemDisplayPreferences());
    // another tab: storage has the new values; this tab: the event carries them
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) setState(read()); };
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<ChangeDetail>).detail;
      if (detail?.storageKey === storageKey) setState(detail.value);
    };
    for (const q of queries) q.addEventListener('change', onSystem);
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
      for (const q of queries) q.removeEventListener('change', onSystem);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, onChange);
    };
  }, [storageKey, read]);

  useIsomorphicLayoutEffect(() => {
    if (!apply || !loaded) return;
    const root = document.documentElement;
    const next = resolveDisplayAttributes(preferences, system);
    // nothing to change (the head script already applied it, or another instance did): no
    // switching frame either, which would cut a dialog's entrance short on mount
    const names = ['data-theme', 'data-contrast', 'data-text-scale', 'data-motion', 'data-density'] as const;
    if (names.every((name) => (next[name] ?? null) === root.getAttribute(name))) return undefined;
    // No transition while the tokens change under every element: a theme switch is one frame,
    // not a half-second fade of every border (motion contract: frequent, so no animation).
    root.setAttribute('data-uix-switching', '');
    applyDisplayAttributes(root, next);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-uix-switching')));
    return () => { cancelAnimationFrame(frame); root.removeAttribute('data-uix-switching'); };
  }, [apply, loaded, preferences, system]);

  const setPreferences = useCallback((next: DisplayPreferenceValues) => {
    setState(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* blocked storage: this page only */ }
    window.dispatchEvent(new CustomEvent<ChangeDetail>(CHANGE_EVENT, { detail: { storageKey, value: next } }));
  }, [storageKey]);

  const setPreference = useCallback(<K extends keyof DisplayPreferenceValues>(key: K, value: DisplayPreferenceValues[K]) => {
    setPreferences({ ...latest.current, [key]: value });
  }, [setPreferences]);

  return { preferences, resolvedTheme: resolveDisplayAttributes(preferences, system)['data-theme'], setPreference, setPreferences };
}

export interface DisplayPreferencesLabels {
  theme: string; light: string; dark: string; system: string;
  contrast: string; contrastStandard: string; contrastMore: string;
  textScale: string; textSmall: string; textDefault: string; textLarge: string; textLarger: string;
  motion: string; motionSystem: string; motionReduce: string;
  density: string; densityCompact: string; densityStandard: string; densityComfortable: string;
}

export const DEFAULT_DISPLAY_PREFERENCES_LABELS: DisplayPreferencesLabels = {
  theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System',
  contrast: 'Contrast', contrastStandard: 'Standard', contrastMore: 'More',
  textScale: 'Text size', textSmall: 'Small', textDefault: 'Default', textLarge: 'Large', textLarger: 'Larger',
  motion: 'Motion', motionSystem: 'System', motionReduce: 'Reduce',
  density: 'Density', densityCompact: 'Compact', densityStandard: 'Standard', densityComfortable: 'Comfortable',
};

const useDisplayLabels = (overrides?: Partial<DisplayPreferencesLabels>): DisplayPreferencesLabels => {
  const uixLabels = useUixLabels();
  return { ...DEFAULT_DISPLAY_PREFERENCES_LABELS, ...uixLabels.displayPreferences, ...overrides };
};

export interface ThemeSwitcherProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled theme. Leave it out and the switcher keeps the preference itself (`useDisplayPreferences`). */
  value?: ThemePreference;
  onValueChange?: (value: ThemePreference) => void;
  /** The storage key when uncontrolled. */
  storageKey?: string;
  /** `icons` shows the icons only (each keeps its word as its name); default shows icon and word. */
  display?: 'labels' | 'icons';
  labels?: Partial<DisplayPreferencesLabels>;
}

function ThemeOptions({ labels, iconsOnly }: { labels: DisplayPreferencesLabels; iconsOnly: boolean }) {
  const option = (value: ThemePreference, icon: ReactNode, word: string) => (
    <SegmentedOption value={value} aria-label={iconsOnly ? word : undefined}>
      {icon}{iconsOnly ? null : <span>{word}</span>}
    </SegmentedOption>
  );
  return <>{option('light', <SunIcon size="sm" />, labels.light)}{option('dark', <MoonIcon size="sm" />, labels.dark)}{option('system', <MonitorIcon size="sm" />, labels.system)}</>;
}

/**
 * Light / dark / system (HAR-1372), a radio group over `Segmented`. Uncontrolled, it reads and
 * writes the display preferences itself; controlled, it only reports.
 */
export function ThemeSwitcher({ value, onValueChange, storageKey, display = 'labels', labels: labelOverrides, className, ...props }: ThemeSwitcherProps) {
  const labels = useDisplayLabels(labelOverrides);
  const own = useDisplayPreferences({ storageKey, apply: value === undefined });
  const current = value ?? own.preferences.theme;
  return (
    <Segmented
      selection="radio"
      aria-label={labels.theme}
      className={cx('uix-theme-switcher', className)}
      value={current}
      onChange={(next) => {
        if (value === undefined) own.setPreference('theme', next as ThemePreference);
        onValueChange?.(next as ThemePreference);
      }}
      {...props}
    >
      <ThemeOptions labels={labels} iconsOnly={display === 'icons'} />
    </Segmented>
  );
}

export interface DisplayPreferencesProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Controlled values. Leave out to keep them in `localStorage` (`useDisplayPreferences`). */
  value?: DisplayPreferenceValues;
  onValueChange?: (value: DisplayPreferenceValues) => void;
  storageKey?: string;
  /** Show only some of the five settings, in this order. Default all. */
  settings?: readonly (keyof DisplayPreferenceValues)[];
  labels?: Partial<DisplayPreferencesLabels>;
}

/**
 * The five display settings (HAR-1372; MOTUS C-4, TENSOR A7): theme, contrast, text size, motion
 * and density, each a labelled radio group. Put it in a preferences page or an account menu's
 * dialog. Changes apply at once and are remembered.
 */
export function DisplayPreferences({ value, onValueChange, storageKey, settings = ['theme', 'contrast', 'textScale', 'motion', 'density'], labels: labelOverrides, className, ...props }: DisplayPreferencesProps) {
  const labels = useDisplayLabels(labelOverrides);
  const own = useDisplayPreferences({ storageKey, apply: value === undefined });
  const current = value ?? own.preferences;
  const id = useId();
  const change = <K extends keyof DisplayPreferenceValues>(key: K, next: DisplayPreferenceValues[K]) => {
    const all = { ...current, [key]: next };
    if (value === undefined) own.setPreference(key, next);
    onValueChange?.(all);
  };
  const row = <K extends keyof DisplayPreferenceValues>(key: K, title: string, options: ReactNode) => (
    <div className="uix-display-prefs__row" key={key}>
      <span className="uix-display-prefs__label" id={`${id}-${key}`}>{title}</span>
      <Segmented selection="radio" aria-labelledby={`${id}-${key}`} value={current[key]} onChange={(next) => change(key, next as DisplayPreferenceValues[K])}>
        {options}
      </Segmented>
    </div>
  );
  const rows: Record<keyof DisplayPreferenceValues, () => ReactNode> = {
    theme: () => row('theme', labels.theme, <ThemeOptions labels={labels} iconsOnly={false} />),
    contrast: () => row('contrast', labels.contrast, <>
      <SegmentedOption value="standard">{labels.contrastStandard}</SegmentedOption>
      <SegmentedOption value="more">{labels.contrastMore}</SegmentedOption>
      <SegmentedOption value="system">{labels.system}</SegmentedOption>
    </>),
    textScale: () => row('textScale', labels.textScale, <>
      <SegmentedOption value="sm">{labels.textSmall}</SegmentedOption>
      <SegmentedOption value="md">{labels.textDefault}</SegmentedOption>
      <SegmentedOption value="lg">{labels.textLarge}</SegmentedOption>
      <SegmentedOption value="xl">{labels.textLarger}</SegmentedOption>
    </>),
    motion: () => row('motion', labels.motion, <>
      <SegmentedOption value="system">{labels.motionSystem}</SegmentedOption>
      <SegmentedOption value="reduce">{labels.motionReduce}</SegmentedOption>
    </>),
    density: () => row('density', labels.density, <>
      <SegmentedOption value="compact">{labels.densityCompact}</SegmentedOption>
      <SegmentedOption value="standard">{labels.densityStandard}</SegmentedOption>
      <SegmentedOption value="comfortable">{labels.densityComfortable}</SegmentedOption>
    </>),
  };
  return (
    <div className={cx('uix-display-prefs', className)} {...props}>
      {settings.map((key) => rows[key]())}
    </div>
  );
}
