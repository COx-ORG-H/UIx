"use client";

import type { CSSProperties, ChangeEvent } from 'react';
import { useState } from 'react';
import { cx } from '../cx.js';
import { normalizeHex } from '../color-model.js';
import { ColorPicker } from './ColorPicker.js';

export interface BrandProfileTypography {
  sans?: string;
  heading?: string;
  mono?: string;
}

export interface BrandProfileLogo {
  src: string;
  alt: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  brand: string;
  brandForeground: string;
  typography?: BrandProfileTypography;
  logo?: BrandProfileLogo;
}

export interface AppliedBrandProfileSnapshot {
  profileId?: string;
  properties: Record<string, string>;
  logoSrc?: string;
  logoAlt?: string;
}

const PROFILE_PROPERTIES = {
  brand: '--uix-brand',
  brandForeground: '--uix-brand-fg',
  sans: '--uix-font-sans',
  heading: '--uix-font-heading',
  mono: '--uix-font-mono',
} as const;
const EMPTY_PROFILES: BrandProfile[] = [];
const EMPTY_COLORS: string[] = [];

/** Apply only the existing UIx brand/font slots and readable logo metadata. */
export function applyBrandProfile(profile: BrandProfile, target?: HTMLElement | null): AppliedBrandProfileSnapshot | undefined {
  const element = target ?? (typeof document === 'undefined' ? undefined : document.documentElement);
  if (!element) return undefined;
  const brand = normalizeHex(profile.brand);
  const foreground = normalizeHex(profile.brandForeground);
  if (!brand || !foreground) throw new TypeError('Brand profiles require valid hex brand and foreground colors.');
  const properties: Record<string, string> = {};
  Object.values(PROFILE_PROPERTIES).forEach((property) => { properties[property] = element.style.getPropertyValue(property); });
  const snapshot: AppliedBrandProfileSnapshot = {
    profileId: element.dataset.uixBrandProfile,
    properties,
    logoSrc: element.dataset.uixBrandLogoSrc,
    logoAlt: element.dataset.uixBrandLogoAlt,
  };
  element.style.setProperty(PROFILE_PROPERTIES.brand, brand);
  element.style.setProperty(PROFILE_PROPERTIES.brandForeground, foreground);
  const typography = profile.typography ?? {};
  for (const [key, property] of Object.entries({ sans: PROFILE_PROPERTIES.sans, heading: PROFILE_PROPERTIES.heading, mono: PROFILE_PROPERTIES.mono })) {
    const value = typography[key as keyof BrandProfileTypography];
    if (value) element.style.setProperty(property, value); else element.style.removeProperty(property);
  }
  element.dataset.uixBrandProfile = profile.id;
  if (profile.logo) {
    element.dataset.uixBrandLogoSrc = profile.logo.src;
    element.dataset.uixBrandLogoAlt = profile.logo.alt;
  } else {
    delete element.dataset.uixBrandLogoSrc;
    delete element.dataset.uixBrandLogoAlt;
  }
  return snapshot;
}

export function restoreBrandProfile(snapshot: AppliedBrandProfileSnapshot, target?: HTMLElement | null): void {
  const element = target ?? (typeof document === 'undefined' ? undefined : document.documentElement);
  if (!element) return;
  Object.entries(snapshot.properties).forEach(([property, value]) => {
    if (value) element.style.setProperty(property, value); else element.style.removeProperty(property);
  });
  if (snapshot.profileId) element.dataset.uixBrandProfile = snapshot.profileId; else delete element.dataset.uixBrandProfile;
  if (snapshot.logoSrc) element.dataset.uixBrandLogoSrc = snapshot.logoSrc; else delete element.dataset.uixBrandLogoSrc;
  if (snapshot.logoAlt) element.dataset.uixBrandLogoAlt = snapshot.logoAlt; else delete element.dataset.uixBrandLogoAlt;
}

export interface BrandProfileEditorProps {
  value: BrandProfile;
  onChange: (profile: BrandProfile) => void;
  profiles?: BrandProfile[];
  onSelectProfile?: (profile: BrandProfile) => void;
  onApply?: (profile: BrandProfile) => void;
  applyTarget?: HTMLElement | null;
  onLogoFile?: (file: File) => void;
  colorPresets?: string[];
  className?: string;
}

/** Small controlled editor composition for serializable UIx brand profiles. */
export function BrandProfileEditor({
  value, onChange, profiles = EMPTY_PROFILES, onSelectProfile, onApply, applyTarget, onLogoFile,
  colorPresets = EMPTY_COLORS, className,
}: BrandProfileEditorProps) {
  const [announcement, setAnnouncement] = useState('');
  const update = (patch: Partial<BrandProfile>) => onChange({ ...value, ...patch });
  const apply = () => {
    if (applyTarget !== null) applyBrandProfile(value, applyTarget);
    onApply?.(value);
    setAnnouncement(`${value.name} applied.`);
  };
  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onLogoFile?.(file);
  };
  const previewStyle = {
    '--uix-brand': normalizeHex(value.brand) ?? value.brand,
    '--uix-brand-fg': normalizeHex(value.brandForeground) ?? value.brandForeground,
    ...(value.typography?.sans ? { '--uix-font-sans': value.typography.sans } : {}),
    ...(value.typography?.heading ? { '--uix-font-heading': value.typography.heading } : {}),
  } as CSSProperties;

  return (
    <section className={cx('uix-brand-profiles', className)} aria-label="Brand profile editor">
      <div className="uix-brand-profiles__form">
        {profiles.length > 0 && <label className="uix-field__label">Profile
          <select className="uix-select" value={value.id} onChange={(event) => {
            const selected = profiles.find((profile) => profile.id === event.currentTarget.value);
            if (selected) onSelectProfile?.(selected);
          }}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
        </label>}
        <label className="uix-field__label">Name<input className="uix-input" value={value.name} onChange={(event) => update({ name: event.currentTarget.value })} /></label>
        <div className="uix-brand-profiles__colors">
          <label>Brand<ColorPicker label="Brand color" value={value.brand} foreground={value.brandForeground} presets={colorPresets} onChange={(brand) => update({ brand })} /></label>
          <label>On brand<ColorPicker label="Brand foreground color" value={value.brandForeground} foreground={value.brand} presets={colorPresets} onChange={(brandForeground) => update({ brandForeground })} /></label>
        </div>
        <label className="uix-field__label">Body font<input className="uix-input" value={value.typography?.sans ?? ''} onChange={(event) => update({ typography: { ...value.typography, sans: event.currentTarget.value || undefined } })} /></label>
        <label className="uix-field__label">Heading font<input className="uix-input" value={value.typography?.heading ?? ''} onChange={(event) => update({ typography: { ...value.typography, heading: event.currentTarget.value || undefined } })} /></label>
        <label className="uix-file-upload uix-brand-profiles__upload">Logo file<input type="file" accept="image/*" onChange={onFile} /></label>
        <button type="button" className="uix-btn uix-btn--primary" onClick={apply}>Apply profile</button>
        <span className="uix-visually-hidden" aria-live="polite">{announcement}</span>
      </div>
      <div className="uix-brand-profiles__preview" style={previewStyle} aria-label={`Live preview of ${value.name}`}>
        <div className="uix-brand-profiles__preview-header">
          {value.logo ? <img src={value.logo.src} alt={value.logo.alt} /> : <span className="uix-brand-profiles__logo-placeholder">Logo</span>}
          <strong>{value.name || 'Brand preview'}</strong>
        </div>
        <div className="uix-brand-profiles__preview-body">
          <h3>Readable, serializable branding</h3>
          <p>Accent, links, rings, and muted states continue through the existing UIx token chain.</p>
          <button type="button" className="uix-btn uix-btn--primary">Primary action</button>
          <a href="#brand-profile-preview">Preview link</a>
        </div>
      </div>
    </section>
  );
}

/** Canonical Phase 46.9 export; equivalent to BrandProfileEditor. */
export const BrandProfiles = BrandProfileEditor;
