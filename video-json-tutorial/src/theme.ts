// BOURXE design tokens distilled from src/index.css (light app surface).
export const C = {
  bg: '#F5F7FB',
  card: '#FFFFFF',
  ink: '#0B1220',
  ink2: '#243149',
  muted: '#5B6B85',
  soft: '#8A97AC',
  line: '#E1E8F2',
  lineSoft: '#EDF1F7',
  primary: '#1F4CD6',
  primaryInk: '#16327F',
  primarySoft: '#EDF2FF',
  ok: '#0B7A55',
  okSoft: '#E8F6F0',
  dark: '#0A1018',
  darkCard: '#111A26',
  darkLine: '#1E2A3A',
  amber: '#B4530A',
};

export const FONT = 'Inter, system-ui, -apple-system, sans-serif';
export const MONO = "'Cascadia Mono', Consolas, 'SF Mono', ui-monospace, monospace";

export const RADIUS = 16;

/** Group a number as 1,234,567 without touching the runtime locale. */
export function group(value: number): string {
  const n = Math.round(Math.abs(value));
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ',';
    out += s[i];
  }
  return `${value < 0 ? '-' : ''}${out}`;
}

export const money = (value: number) => `\u20A6${group(value)}`;
