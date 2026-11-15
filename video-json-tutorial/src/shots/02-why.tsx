import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles } from '../ui/primitives';
import { InvoiceTable } from '../ui/InvoiceTable';
import { p } from '../lib/anim';
import { ROWS } from '../timeline';

export const WhyShot: React.FC = () => {
  const frame = useCurrentFrame();

  const head = p(frame, 4, 20);
  const bullet1 = p(frame, 26, 18);
  const bullet2 = p(frame, 62, 18);
  const bullet3 = p(frame, 96, 18);

  // each row types itself, one after another — the tedium this video removes
  const descReveal = ROWS.slice(0, 6).map((_, i) => p(frame, 16 + i * 22, 26));
  const rowProgress = ROWS.slice(0, 6).map((_, i) => p(frame, 12 + i * 22, 14));
  const clock = Math.floor(p(frame, 16, 150) * 272);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <div style={{ position: 'absolute', left: 120, top: 96 }}>
        <ChapterTag n="!" label="The slow part" progress={0.1} />
      </div>

      <div style={{ position: 'absolute', left: 120, top: 240, width: 620 }}>
        <div
          style={{
            fontSize: 62,
            lineHeight: 1.08,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: C.ink,
            opacity: head,
            transform: `translateY(${(1 - head) * 18}px)`,
          }}
        >
          Manual entry is
          <br />
          the slow part.
        </div>

        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Bullet at={bullet1} k="48" label="fields typed by hand on a 12-row invoice" />
          <Bullet at={bullet2} k="≈ 9 min" label="per invoice, before it can be sent" />
          <Bullet at={bullet3} k="1 typo" label="moves the subtotal, the VAT and the total" />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 830,
          top: 208,
          transform: `translateX(${(1 - p(frame, 6, 24)) * 40}px)`,
          opacity: p(frame, 6, 24),
        }}
      >
        <InvoiceTable
          rows={ROWS.slice(0, 6)}
          width={1040}
          rowProgress={rowProgress}
          descReveal={descReveal}
          totalsProgress={p(frame, 156, 28)}
        />
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 6px',
            opacity: p(frame, 30, 18),
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 14, color: C.soft }}>
            typing row {Math.min(6, 1 + Math.floor(p(frame, 16, 132) * 6))} of 6 …
          </span>
          <span style={{ fontFamily: MONO, fontSize: 14, color: C.amber }}>
            elapsed {String(Math.floor(clock / 60)).padStart(2, '0')}:{String(clock % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 120, bottom: 84 }}>
        <Caption>Every field is a chance to be wrong.</Caption>
      </div>
    </AbsoluteFill>
  );
};

const Bullet: React.FC<{ at: number; k: string; label: string }> = ({ at, k, label }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, opacity: at, transform: `translateY(${(1 - at) * 12}px)` }}>
    <span
      style={{
        fontFamily: MONO,
        fontSize: 26,
        fontWeight: 700,
        color: C.primary,
        minWidth: 116,
        letterSpacing: '-0.02em',
      }}
    >
      {k}
    </span>
    <span style={{ fontSize: 21, color: C.muted, lineHeight: 1.35, maxWidth: 430 }}>{label}</span>
  </div>
);
