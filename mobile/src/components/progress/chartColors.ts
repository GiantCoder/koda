/**
 * Brand-derived categorical palette for charts. Assigned by category name
 * (stable) and never recycled via `i % n` — extras get distinct tints of
 * the same four brand hues rather than wrapping the list.
 */
const BRAND_PALETTE = [
  "#E63946", // primary
  "#2D6A4F", // cricket-green
  "#1A1A2E", // navy (text-primary)
  "#C1121F", // primary-hover
] as const;

const BRAND_TINTS = [
  "#52796F", // sage
  "#9B2226", // wine
  "#D4A373", // warm sand
  "#40916C", // mid green
  "#6B7280", // text-secondary
  "#774936", // earth
  "#BC4749", // muted red
  "#95D5B2", // mint
] as const;

const UNIQUE_PALETTE = [...BRAND_PALETTE, ...BRAND_TINTS];

function hashCategory(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Stable per-category color. Within a single chart, collisions are resolved
 * by linear-probing the unique palette so two slices never share a swatch.
 * Beyond the palette length, extras use unique HSL tints of primary/green.
 */
export function assignCategoryColors(categories: string[]): Map<string, string> {
  const unique: string[] = [];
  for (const category of categories) {
    if (!unique.includes(category)) unique.push(category);
  }

  const used = new Set<number>();
  const map = new Map<string, string>();

  for (const category of unique) {
    let idx = hashCategory(category) % UNIQUE_PALETTE.length;
    let probes = 0;
    while (used.has(idx) && probes < UNIQUE_PALETTE.length) {
      idx = (idx + 1) % UNIQUE_PALETTE.length;
      probes += 1;
    }

    if (probes < UNIQUE_PALETTE.length) {
      used.add(idx);
      map.set(category, UNIQUE_PALETTE[idx]);
    } else {
      const seed = BRAND_PALETTE[hashCategory(category) % BRAND_PALETTE.length];
      map.set(category, tintHex(seed, unique.indexOf(category)));
    }
  }

  return map;
}

export const TREND_LINE_COLOR = BRAND_PALETTE[0];

function tintHex(hex: string, offset: number): string {
  const raw = hex.replace("#", "");
  const n = parseInt(raw, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lift = 12 + (offset % 5) * 8;
  const mix = (channel: number) => Math.max(0, Math.min(255, channel + (offset % 2 === 0 ? lift : -lift)));
  const toHex = (channel: number) => mix(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
