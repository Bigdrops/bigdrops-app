import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles, Pill } from '../ui/primitives';
import { ImportSheet } from '../ui/ImportSheet';
import { INVOICE_JSON } from '../ui/JsonCode';
import { p } from '../lib/anim';

export const Step3Shot: React.FC = () => {
  const frame = useCurrentFrame();

  const chars = Math.round(INVOICE_JSON.length * p(frame, 12, 150));
  const parsed = p(frame, 176, 14);
  const applyPulse = p(frame, 205, 26);
  // linear, clamped: the payload is ~775px tall inside a 266px window, so the
  // scroll may never exceed that overflow or the code scrolls out of sight.
  const scrollT = Math.min(1, Math.max(0, (frame - 186) / 110));
  const typing = chars < INVOICE_JSON.length;

  const checks = [
    { at: 30, label: 'Valid JSON', detail: 'parses before anything is written' },
    { at: 96, label: 'Fields match columns', detail: 'description · qty · unit price' },
    { at: 132, label: 'Nulls stay null', detail: 'po_number is not guessed' },
    { at: 172, label: 'Custom fields extracted', detail: 'Warranty → new column' },
  ];

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <div style={{ position: 'absolute', left: 92, top: 76 }}>
        <ChapterTag n="3" label="Paste the JSON back" progress={0.72} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 92,
          top: 0,
          filter: 'drop-shadow(0 30px 60px rgba(11,18,32,0.12))',
        }}
      >
        <ImportSheet
          width={760}
          jsonText={INVOICE_JSON.slice(0, chars)}
          cursor={typing}
          parsed={parsed}
          applyPulse={applyPulse}
          jsonScroll={-scrollT * 491}
        />
      </div>

      <div style={{ position: 'absolute', left: 900, top: 208, width: 900 }}>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em', color: C.ink, lineHeight: 1.14 }}>
          Every row is checked
          <br />
          before it lands.
        </div>

        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {checks.map((check) => {
            const at = p(frame, check.at, 14);
            return (
              <div
                key={check.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 18px',
                  background: '#fff',
                  border: `1px solid ${at > 0.6 ? '#C9EBDF' : C.line}`,
                  borderRadius: 12,
                  opacity: 0.35 + at * 0.65,
                  transform: `translateY(${(1 - at) * 10}px)`,
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 22,
                    background: at > 0.6 ? C.okSoft : '#F1F5FA',
                    color: at > 0.6 ? C.ok : C.soft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {at > 0.6 ? '✓' : '·'}
                </span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: C.ink }}>{check.label}</div>
                  <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>{check.detail}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 26, opacity: p(frame, 200, 16) }}>
          <Pill tone="ok">8 rows ready · 2 groups · totals recalculated on apply</Pill>
        </div>

        <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 13, color: C.soft, opacity: p(frame, 216, 16) }}>
          {`custom_fields: { "Warranty": "12 months" }`}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 900, bottom: 66 }}>
        <Caption>Paste the JSON into the sheet. Apply becomes active when it parses.</Caption>
      </div>
    </AbsoluteFill>
  );
};
