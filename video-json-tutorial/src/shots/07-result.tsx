import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles } from '../ui/primitives';
import { clamp, p } from '../lib/anim';

export const ResultShot: React.FC = () => {
  const frame = useCurrentFrame();

  const push = interpolate(frame, [0, 240], [0, 1], clamp);
  const enter = interpolate(frame, [0, 26], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <div style={{ position: 'absolute', left: 120, top: 76 }}>
        <ChapterTag n="✓" label="Ready to send" progress={1} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 150,
          width: 880,
          height: 860,
          overflow: 'hidden',
          borderRadius: 6,
          boxShadow: '0 60px 120px -50px rgba(11,18,32,0.5), 0 6px 18px rgba(11,18,32,0.12)',
          background: '#fff',
          transform: `translateY(${(1 - enter) * 40}px) rotate(-1.2deg)`,
          opacity: enter,
        }}
      >
        <Img
          src={staticFile('textures/invoice-page.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            transform: `scale(${1.04 + push * 0.06})`,
            transformOrigin: 'top center',
          }}
        />
      </div>

      <div style={{ position: 'absolute', left: 1090, top: 236, width: 700 }}>
        <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink, lineHeight: 1.12 }}>
          The invoice is
          <br />
          already filled in.
        </div>

        <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Row at={p(frame, 24, 16)} k="Header" v="Title, PO number, notes, terms" />
          <Row at={p(frame, 52, 16)} k="Rows" v="Line items with quantities and rates" />
          <Row at={p(frame, 80, 16)} k="Money" v="Subtotal, VAT 7.5%, total payable" />
          <Row at={p(frame, 108, 16)} k="Columns" v="Custom columns kept from custom_fields" />
        </div>

        <div
          style={{
            marginTop: 38,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: C.ink,
            color: '#EAF0FA',
            borderRadius: 12,
            padding: '14px 20px',
            fontSize: 16,
            fontWeight: 600,
            opacity: p(frame, 140, 18),
          }}
        >
          <span style={{ color: '#8FA8FF' }}>&#9679;</span>
          Review, then send as usual
        </div>

        <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 13, color: C.soft, opacity: p(frame, 160, 18) }}>
          update mode patches single rows by row_number
        </div>
      </div>

      <div style={{ position: 'absolute', left: 120, bottom: 76 }}>
        <Caption>Same invoice, no retyping.</Caption>
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ at: number; k: string; v: string }> = ({ at, k, v }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 20,
      opacity: at,
      transform: `translateX(${(1 - at) * -12}px)`,
      borderBottom: `1px solid ${C.line}`,
      paddingBottom: 12,
    }}
  >
    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.primary, width: 92 }}>
      {k.toUpperCase()}
    </span>
    <span style={{ fontSize: 16.5, color: C.ink2 }}>{v}</span>
  </div>
);
