export interface RgbColor { r: number; g: number; b: number }
export interface HsvColor { h: number; s: number; v: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeHex(value: string): string | undefined {
  const raw = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(raw)) return `#${raw.split('').map((char) => char + char).join('').toUpperCase()}`;
  if (/^[\da-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  return undefined;
}

export function hexToRgb(value: string): RgbColor | undefined {
  const hex = normalizeHex(value);
  if (!hex) return undefined;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${[r, g, b].map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const values = [r, g, b].map((value) => clamp(value, 0, 255) / 255);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === values[0]) h = 60 * (((values[1]! - values[2]!) / delta) % 6);
    else if (max === values[1]) h = 60 * (((values[2]! - values[0]!) / delta) + 2);
    else h = 60 * (((values[0]! - values[1]!) / delta) + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 1);
  const value = clamp(v, 0, 1);
  const chroma = value * sat;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = value - chroma;
  const sector = Math.floor(hue / 60);
  const rgb = sector === 0 ? [chroma, x, 0]
    : sector === 1 ? [x, chroma, 0]
    : sector === 2 ? [0, chroma, x]
    : sector === 3 ? [0, x, chroma]
    : sector === 4 ? [x, 0, chroma]
    : [chroma, 0, x];
  return { r: (rgb[0]! + m) * 255, g: (rgb[1]! + m) * 255, b: (rgb[2]! + m) * 255 };
}

export function hsvToHex(value: HsvColor): string {
  return rgbToHex(hsvToRgb(value));
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  const linear = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

export function contrastRatio(background: string, foreground: string): number | undefined {
  const bg = hexToRgb(background);
  const fg = hexToRgb(foreground);
  if (!bg || !fg) return undefined;
  const [light, dark] = [relativeLuminance(bg), relativeLuminance(fg)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

export function meetsContrast(background: string, foreground: string, minimum = 4.5): boolean {
  return (contrastRatio(background, foreground) ?? 0) >= minimum;
}
