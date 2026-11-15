import React from 'react';
import { staticFile } from 'remotion';
import { C, FONT, MONO } from '../theme';

export const FontStyles: React.FC = () => (
  <style>{`
    @font-face { font-family: 'Inter'; font-weight: 400; font-style: normal;
      src: url('${staticFile('fonts/Inter-Regular.ttf')}') format('truetype'); }
    @font-face { font-family: 'Inter'; font-weight: 500 600; font-style: normal;
      src: url('${staticFile('fonts/Inter-Regular.ttf')}') format('truetype'); }
    @font-face { font-family: 'Inter'; font-weight: 700 900; font-style: normal;
      src: url('${staticFile('fonts/Inter-Bold.ttf')}') format('truetype'); }
    html, body { margin: 0; background: transparent; }
    * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
  `}</style>
);

/** Faint engineering grid used on the dark plates. */
export const Grid: React.FC<{ color?: string; size?: number; opacity?: number }> = ({
  color = '#ffffff',
  size = 60,
  opacity = 0.05,
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
    }}
  />
);

export const Caption: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({
  children,
  dark,
  style,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      fontFamily: FONT,
      fontSize: 27,
      fontWeight: 500,
      letterSpacing: '-0.01em',
      color: dark ? '#E8EEF8' : C.ink2,
      ...style,
    }}
  >
    <span style={{ width: 34, height: 3, background: dark ? '#6E8BFF' : C.primary, borderRadius: 2 }} />
    <span>{children}</span>
  </div>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  tone?: 'primary' | 'ok' | 'neutral' | 'dark';
  style?: React.CSSProperties;
}> = ({ children, tone = 'neutral', style }) => {
  const map = {
    primary: { bg: C.primarySoft, fg: C.primary, bd: '#D6E0FB' },
    ok: { bg: C.okSoft, fg: C.ok, bd: '#C9EBDF' },
    neutral: { bg: '#F1F5FA', fg: C.muted, bd: C.line },
    dark: { bg: 'rgba(255,255,255,0.08)', fg: '#CFDBEE', bd: 'rgba(255,255,255,0.14)' },
  }[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        background: map.bg,
        color: map.fg,
        border: `1px solid ${map.bd}`,
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.02em',
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const ChapterTag: React.FC<{ n: string; label: string; progress: number; dark?: boolean }> = ({
  n,
  label,
  progress,
  dark,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT }}>
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: dark ? 'rgba(110,139,255,0.16)' : C.primarySoft,
        border: `1px solid ${dark ? 'rgba(110,139,255,0.4)' : '#D6E0FB'}`,
        color: dark ? '#A9BEFF' : C.primary,
        fontWeight: 700,
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: MONO,
      }}
    >
      {n}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: dark ? '#9FB1CB' : C.muted }}>
      {label}
    </div>
    <div style={{ width: 120, height: 3, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.12)' : C.line, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%`, height: '100%', background: dark ? '#6E8BFF' : C.primary }} />
    </div>
  </div>
);

export const Mono: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 14,
  color = C.ink2,
  style,
}) => <span style={{ fontFamily: MONO, fontSize: size, color, ...style }}>{children}</span>;
