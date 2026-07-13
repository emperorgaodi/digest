// Preset accent themes (Chrome-customisation style). settings.accent stores the
// chosen hex; the whole UI + backdrop tint derive from it via the --accent-rgb
// CSS variable, so switching is instant and persists in data.json.
export interface Theme { name: string; hex: string }

export const THEMES: Theme[] = [
  { name: 'Blue', hex: '#0A84FF' },
  { name: 'Indigo', hex: '#5E5CE6' },
  { name: 'Purple', hex: '#BF5AF2' },
  { name: 'Pink', hex: '#FF375F' },
  { name: 'Red', hex: '#FF453A' },
  { name: 'Orange', hex: '#FF9F0A' },
  { name: 'Green', hex: '#30D158' },
  { name: 'Teal', hex: '#40C8E0' },
  { name: 'Graphite', hex: '#8E8E93' },
]

// "#0A84FF" -> "10 132 255" (space-separated channels for rgb(... / <alpha>)).
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}
