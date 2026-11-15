import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles, Pill } from '../ui/primitives';
import { InvoiceTable } from '../ui/InvoiceTable';
import { InvoiceRowsExit } from '../ui/SheetExit';
import { land, p } from '../lib/anim';
import { ROWS, totals } from '../timeline';
import { money } from '../theme';

export const RowsShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rowProgress = ROWS.map((_, i) => land(frame, 22 + i * 13, fps, 15));
  const totalsProgress = p(frame, 118, 34);
  const warranty = p(frame, 156, 26);
  const chip = p(frame, 12, 16);
  const counter = Math.min(ROWS.length, Math.max(0, Math.ceil((frame - 18) / 13)));
  const sum = totals();

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <InvoiceRowsExit />

      <div style={{ position: 'absolute', left: 110, top: 62 }}>
        <ChapterTag n="4" label="Apply" progress={1} />
      </div>

      <div style={{ position: 'absolute', right: 110, top: 62, display: 'flex', gap: 12, opacity: chip }}>
        <Pill tone="ok">Applied · 8 rows</Pill>
        <Pill tone="primary">1 group · 1 new column</Pill>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 138,
          transform: `translateY(${(1 - p(frame, 4, 20)) * 18}px)`,
          opacity: p(frame, 4, 20),
        }}
      >
        <InvoiceTable
          rows={ROWS}
          width={1700}
          rowProgress={rowProgress}
          totalsProgress={totalsProgress}
          warranty={warranty}
          compact
        />
      </div>

      {/* live counters, the thing the user actually checks */}
      <div style={{ position: 'absolute', left: 110, top: 862, display: 'flex', gap: 16 }}>
        <Stat
          label="Rows imported"
          value={`${counter} / 8`}
          tone={counter >= 8 ? 'ok' : 'neutral'}
          at={p(frame, 6, 14)}
        />
        <Stat
          label="Total payable"
          value={money(sum.total * totalsProgress)}
          tone={totalsProgress >= 1 ? 'ok' : 'neutral'}
          at={p(frame, 6, 14)}
        />
        <Stat label="Column added" value={warranty > 0.5 ? 'Warranty' : '—'} tone={warranty > 0.5 ? 'primary' : 'neutral'} at={p(frame, 6, 14)} />
      </div>

      <div style={{ position: 'absolute', left: 110, bottom: 62 }}>
        <Caption>Rows, totals and the new column are written in one pass.</Caption>
      </div>
      <div style={{ position: 'absolute', right: 110, bottom: 62, fontFamily: MONO, fontSize: 13, color: C.soft }}>
        no manual entry · schema frozen after import
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string; tone: 'ok' | 'primary' | 'neutral'; at: number }> = ({
  label,
  value,
  tone,
  at,
}) => {
  const accent = tone === 'ok' ? C.ok : tone === 'primary' ? C.primary : C.soft;
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '10px 16px',
        minWidth: 190,
        opacity: at,
        transform: `translateY(${(1 - at) * 10}px)`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: C.soft }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: accent, marginTop: 4 }}>{value}</div>
    </div>
  );
};
