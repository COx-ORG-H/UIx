/* uix icons — lucide glyphs as inline SVG (currentColor, sized via --uix-icon-*).
   lucide is ISC-licensed. Add glyphs here as components need them. viewBox 24, stroke-width 2, round caps. */
const PATHS = {
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  'moon': '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  'copy': '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'check': '<path d="M20 6 9 17l-5-5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'star': '<path d="M11.5 2.7a.6.6 0 0 1 1 0l2.4 5 5.4.8a.6.6 0 0 1 .3 1l-3.9 3.8.9 5.4a.6.6 0 0 1-.8.6L12 17l-4.8 2.5a.6.6 0 0 1-.8-.6l.9-5.4L3.4 9.5a.6.6 0 0 1 .3-1l5.4-.8z"/>',
  'pin': '<path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  'x': '<path d="M18 6 6 18M6 6l12 12"/>',
  'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  'more-horizontal': '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  'plus': '<path d="M5 12h14M12 5v14"/>',
  'minus': '<path d="M5 12h14"/>',
  'panel-left': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
  'arrow-up-right': '<path d="M7 7h10v10M7 17 17 7"/>',
  'arrow-down-right': '<path d="M7 7 17 17M17 7v10H7"/>',
};

/** Return an inline-SVG string for `name`, sized to --uix-icon-<size> (sm|md|lg). */
export const icon = (name, size = 'md') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:var(--uix-icon-${size});height:var(--uix-icon-${size});flex:none">${PATHS[name] || ''}</svg>`;

export const iconNames = () => Object.keys(PATHS);
