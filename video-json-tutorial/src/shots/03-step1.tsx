import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles, Pill } from '../ui/primitives';
import { InvoiceTable } from '../ui/InvoiceTable';
import { ImportSheet } from '../ui/ImportSheet';
import { clamp, p } from '../lib/anim';
import { ROWS } from '../timeline';

export const Step1Shot: React.FC = () => {
  const frame = useCurrentFrame();

  const pulse = interpolate(frame, [26, 38, 52], [0, 1, 0.25], clamp);
  const sheetIn = interpolate(frame, [58, 92], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const dim = p(frame, 58, 30);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <div style={{ position: 'absolute', left: 120, top: 76 }}>
        <ChapterTag n="1" label="Open the import" progress={0.28} />
      </div>

      {/* document context strip */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 138,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: p(frame, 6, 20),
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.soft }}>Invoices /</span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: C.ink2, fontWeight: 600 }}>INV-2026-0148</span>
        <Pill tone="primary">Draft</Pill>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 196,
          opacity: p(frame, 8, 24),
          transform: `translateY(${(1 - p(frame, 8, 24)) * 20}px)`,
        }}
      >
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 40, fontWeight: 700, color: C.ink, letterSpacing: '-0.03em' }}>Invoice</span>
          <span style={{ fontSize: 19, color: C.soft }}>Electrical Installation, Phase 2</span>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <Field label="Client" value="Kestrel Industrial Ltd" />
          <Field label="Date" value="12 Nov 2026" />
          <Field label="Currency" value="NGN" />
        </div>
        <InvoiceTable
          rows={ROWS.slice(0, 4)}
          width={1060}
          rowProgress={[1, 1, 1, 1]}
          totalsProgress={1}
          dim={dim}
          importPulse={pulse}
          compact
        />
        <div style={{ marginTop: 16, opacity: p(frame, 40, 16) }}>
          <Pill tone="primary">Actions → Import JSON</Pill>
        </div>
      </div>

      {/* cursor hint */}
      <div
        style={{
          position: 'absolute',
          left: 1052 - (1 - p(frame, 14, 26)) * 90,
          top: 292 + (1 - p(frame, 14, 26)) * 60,
          width: 26,
          height: 26,
          borderRadius: 13,
          border: `2px solid ${C.primary}`,
          background: 'rgba(31,76,214,0.12)',
          opacity: interpolate(frame, [12, 20, 52, 62], [0, 1, 1, 0], clamp),
          transform: `scale(${1 + Math.sin(frame / 6) * 0.06})`,
        }}
      />

      {/* import sheet */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          transform: `translateX(${sheetIn * 720}px)`,
          boxShadow: sheetIn < 0.05 ? 'none' : '-60px 0 90px -50px rgba(11,18,32,0.4)',
        }}
      >
        <ImportSheet parsed={0} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 76,
          opacity: interpolate(frame, [60, 76], [1, 0], clamp),
        }}
      >
        <Caption>Invoice → Actions → Import JSON.</Caption>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 76,
          opacity: p(frame, 96, 18),
        }}
      >
        <Caption>Pick Add mode. The sheet stays inside the invoice.</Caption>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    style={{
      border: `1px solid ${C.line}`,
      background: '#fff',
      borderRadius: 10,
      padding: '8px 14px',
      minWidth: 150,
    }}
  >
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: C.soft }}>{label.toUpperCase()}</div>
    <div style={{ fontSize: 14, color: C.ink2, marginTop: 3, fontWeight: 500 }}>{value}</div>
  </div>
);
