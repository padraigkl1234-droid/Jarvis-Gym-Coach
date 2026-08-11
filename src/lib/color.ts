/**
 * Small hex-color helpers used to derive shade variants (a highlight, a
 * shadow) from a single base color someone picks — e.g. a customized shirt
 * color still needs a slightly darker hem-shadow tone. Keeps the avatar/room
 * customization UI down to "pick one color per feature" while the sprites
 * stay visually coherent underneath.
 */

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  const n = parseInt(full, 16);
  if (full.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Blends a color toward white by `amt` (0-1). */
export function lighten(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
}

/** Blends a color toward black by `amt` (0-1). */
export function darken(hex: string, amt: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex([r * (1 - amt), g * (1 - amt), b * (1 - amt)]);
}

/** Rough perceived-lightness check (0-1, >0.6 reads as "light"). */
export function relativeLightness(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
