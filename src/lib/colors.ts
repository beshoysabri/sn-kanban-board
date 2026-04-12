export const LABEL_COLORS = [
  // Yellows
  { name: 'Lemon', hex: '#FFF689' },
  { name: 'Mustard', hex: '#F4D35E' },
  // Oranges
  { name: 'Peach', hex: '#FFB88A' },
  { name: 'Tangerine', hex: '#FF9C5B' },
  { name: 'Flame', hex: '#F67B45' },
  // Pinks/Reds
  { name: 'Blush', hex: '#FBC2C2' },
  { name: 'Rose', hex: '#E39B99' },
  { name: 'Berry', hex: '#CB7876' },
  // Greens
  { name: 'Sage', hex: '#B4CFA4' },
  { name: 'Fern', hex: '#8BA47C' },
  { name: 'Forest', hex: '#62866C' },
  // Blues
  { name: 'Sky', hex: '#A0C5E3' },
  { name: 'Steel', hex: '#81B2D9' },
  { name: 'Ocean', hex: '#32769B' },
  // Purples
  { name: 'Lavender', hex: '#BBA6DD' },
  { name: 'Mauve', hex: '#8C7DA8' },
  { name: 'Plum', hex: '#64557B' },
  // Dark
  { name: 'Midnight', hex: '#1E2136' },
] as const;

export const DEFAULT_LABEL_COLOR = '#32769B';

// Legacy Tailwind colors for backward compatibility with existing boards
const LEGACY_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
};

export function getColorHex(name: string): string {
  if (!name) return '';
  if (name.startsWith('#')) return name;
  const lower = name.toLowerCase();
  // Check new palette first
  const found = LABEL_COLORS.find((c) => c.name.toLowerCase() === lower);
  if (found) return found.hex;
  // Fall back to legacy colors
  return LEGACY_COLORS[lower] || '';
}

/** Find the palette color name for a given hex, or return the hex itself */
export function getColorName(hexOrName: string): string {
  if (!hexOrName) return '';
  if (!hexOrName.startsWith('#')) return hexOrName; // already a name
  const lower = hexOrName.toLowerCase();
  const found = LABEL_COLORS.find(c => c.hex.toLowerCase() === lower);
  return found ? found.name : hexOrName;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
