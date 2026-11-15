import React from 'react';
import { C, FONT, MONO } from '../theme';

/** Design canvas: 360 x 640 CSS px, scaled x3 into a 1080x1920 frame. */
export const W = 360;
export const H = 640;
export const SCALE = 1080 / W;

export const M = {
  bg: '#F5F8FC',
  card: '#FFFFFF',
  ink: '#0F172A',
  sub: '#475569',
  label: '#64748B',
  faint: '#94A3B8',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  accent: C.primary,
  accentSoft: '#EDF4FE',
  accentLine: '#DBEAFE',
  green: '#16A34A',
  greenSoft: '#DCF7E3',
  blueSoft: '#DBEAFE',
  blueInk: '#1D4ED8',
  soft: '#F1F5F9',
  dark: '#0F172A',
};

export const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: W,
      height: H,
      transform: `scale(${SCALE})`,
      transformOrigin: 'top left',
      background: M.bg,
      fontFamily: FONT,
      position: 'relative',
      overflow: 'hidden',
      color: M.ink,
    }}
  >
    {children}
  </div>
);

/** Android status bar, as it appears in the app on device. */
export const StatusBar: React.FC<{ dark?: boolean; time?: string }> = ({ dark, time = '06.02' }) => {
  const fg = dark ? '#F8FAFF' : '#0F172A';
  return (
    <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, color: fg }}>
        <span>{time}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="13" r="7" stroke={fg} strokeWidth="2" />
          <path d="M12 13V9M12 13l3 2M5 4l3 3" stroke={fg} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: fg }}>
        <span style={{ fontSize: 8, fontWeight: 700, lineHeight: 1.05, textAlign: 'right', opacity: 0.85 }}>
          83.4
          <br />
          Kb/s
        </span>
        <svg width="12" height="10" viewBox="0 0 24 20" fill="none">
          <path d="M2 16a13 13 0 0 1 20 0M6 18a9 9 0 0 1 12 0" stroke="none" />
          <path d="M12 18.5 14 16a3 3 0 0 0-4 0l2 2.5Z" fill={fg} />
          <path d="M5 12a10 10 0 0 1 14 0" stroke={fg} strokeWidth="2" strokeLinecap="round" />
        </svg>
        <svg width="12" height="10" viewBox="0 0 24 20" fill="none">
          <path d="M4 17h3V9H4v8Zm6 0h3V5h-3v12Zm6 0h3V2h-3v15Z" fill={fg} />
        </svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <div style={{ width: 19, height: 10, borderRadius: 3, border: `1.3px solid ${fg}`, padding: 1.2 }}>
            <div style={{ width: '72%', height: '100%', background: fg, borderRadius: 1.2 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700 }}>72</span>
        </div>
      </div>
    </div>
  );
};

export const Chevron: React.FC<{ dir?: 'left' | 'right'; color?: string; size?: number }> = ({
  dir = 'right',
  color = M.label,
  size = 12,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}
  >
    <path d="m9 6 6 6-6 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const TopBar: React.FC<{ title?: string; pressed?: number }> = ({ title = 'Invoice', pressed = 0 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px 9px', background: M.bg }}>
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        border: `1px solid ${M.line}`,
        background: '#F3F6FA',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Chevron dir="left" color="#475569" size={14} />
    </div>
    <div style={{ flex: 1, fontSize: 26, fontWeight: 800, letterSpacing: '-0.035em', paddingLeft: 2 }}>{title}</div>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        border: `1px solid ${M.line}`,
        background: '#F3F6FA',
        display: 'grid',
        placeItems: 'center',
        transform: `scale(${1 - pressed * 0.08})`,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <circle cx="5" cy="12" r="1.9" fill="#475569" />
        <circle cx="12" cy="12" r="1.9" fill="#475569" />
        <circle cx="19" cy="12" r="1.9" fill="#475569" />
      </svg>
    </div>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        border: `1px solid ${M.line}`,
        background: '#F3F6FA',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M20 14.5A8 8 0 0 1 9.5 4 8.4 8.4 0 1 0 20 14.5Z" stroke="#475569" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </div>
  </div>
);

export const SectionHead: React.FC<{ n: string; title: string; meta?: string }> = ({ n, title, meta }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '12px 0 9px' }}>
    <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: M.accent }}>{n}</span>
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {title}
    </span>
    <span style={{ flex: 1, height: 1, background: M.line, minWidth: 8 }} />
    {meta ? <span style={{ fontFamily: MONO, fontSize: 8, color: M.faint, whiteSpace: 'nowrap' }}>{meta}</span> : null}
  </div>
);

export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: M.label, marginBottom: 5 }}>
    {children}
  </div>
);

export const Caption: React.FC<{ children: React.ReactNode; at: number; bottom?: number }> = ({ children, at, bottom = 18 }) => (
  <div
    style={{
      position: 'absolute',
      left: 12,
      right: 12,
      bottom,
      opacity: at,
      transform: `translateY(${(1 - at) * 7}px)`,
      background: 'rgba(15,23,42,0.94)',
      color: '#F8FAFF',
      borderRadius: 11,
      padding: '9px 12px',
      fontSize: 11.5,
      fontWeight: 600,
      lineHeight: 1.42,
      letterSpacing: '-0.01em',
      boxShadow: '0 16px 28px -16px rgba(15,23,42,0.7)',
    }}
  >
    {children}
  </div>
);

export const HomeBar: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 6, display: 'flex', justifyContent: 'center' }}>
    <div style={{ width: 108, height: 3.5, borderRadius: 3, background: dark ? 'rgba(255,255,255,0.55)' : '#0F172A' }} />
  </div>
);
