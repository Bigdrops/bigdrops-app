import React from 'react';
import { C, FONT, MONO, money } from '../theme';
import { ROWS, totals, type InvoiceRow } from '../timeline';

type Props = {
  rows?: InvoiceRow[];
  /** 0..1 per row: opacity + vertical settle. */
  rowProgress?: number[];
  /** Optional 0..1 per row: character reveal of the description (typing). */
  descReveal?: number[];
  /** 0..1: the custom "Warranty" column widening in after import. */
  warranty?: number;
  /** 0..1: totals count-up. */
  totalsProgress?: number;
  width?: number;
  /** 0..1 dimming (used while the import sheet is open). */
  dim?: number;
  importPulse?: number;
  importPulse2?: number;
  chip?: React.ReactNode;
  compact?: boolean;
};

const money100 = (value: number) => money(value);

export const InvoiceTable: React.FC<Props> = ({
  rows = ROWS,
  rowProgress,
  descReveal,
  warranty = 0,
  totalsProgress = 1,
  width = 1180,
  dim = 0,
  importPulse = 0,
  chip,
  compact = false,
}) => {
  const sum = totals(rows);
  const shownSubtotal = sum.subtotal * totalsProgress;
  const shownVat = sum.vat * totalsProgress;
  const shownTotal = sum.total * totalsProgress;
  const warrantyW = 168 * warranty;
  const rowH = compact ? 50 : 56;

  return (
    <div
      style={{
        width,
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        boxShadow: '0 24px 60px -30px rgba(11,18,32,0.35), 0 2px 4px rgba(11,18,32,0.04)',
        fontFamily: FONT,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 13, color: C.soft }}>2.</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>Line items</span>
          <span style={{ fontSize: 14, color: C.soft, marginLeft: 6 }}>{rows.length} rows</span>
          {chip}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 36,
              padding: '0 14px',
              borderRadius: 10,
              border: `1px solid ${importPulse > 0 ? C.primary : C.line}`,
              background: importPulse > 0 ? C.primarySoft : '#fff',
              color: importPulse > 0 ? C.primary : C.ink2,
              fontSize: 14,
              fontWeight: 600,
              transform: `scale(${1 + importPulse * 0.05})`,
              boxShadow: importPulse > 0 ? `0 0 0 ${4 + importPulse * 6}px rgba(31,76,214,${0.14 * importPulse})` : 'none',
            }}
          >
            <span style={{ width: 14, height: 14, border: `1.6px solid currentColor`, borderRadius: 3, display: 'inline-block' }} />
            Import JSON
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 36,
              padding: '0 14px',
              borderRadius: 10,
              border: `1px solid ${C.line}`,
              color: C.muted,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Table settings
          </div>
        </div>
      </div>

      {/* header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 26px',
          height: 40,
          background: '#F8FAFD',
          borderTop: `1px solid ${C.line}`,
          borderBottom: `1px solid ${C.line}`,
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.13em',
          color: C.soft,
        }}
      >
        <div style={{ flex: 1 }}>DESCRIPTION</div>
        <div style={{ width: 78, textAlign: 'right' }}>QTY</div>
        <div style={{ width: 148, textAlign: 'right' }}>RATE</div>
        <div style={{ width: 166, textAlign: 'right' }}>AMOUNT</div>
        <div
          style={{
            width: warrantyW,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            paddingLeft: warrantyW > 30 ? 24 : 0,
            color: C.primary,
            opacity: warranty,
          }}
        >
          WARRANTY <span style={{ opacity: 0.65 }}>· NEW</span>
        </div>
      </div>

      {/* rows */}
      <div style={{ opacity: 1 - dim * 0.45 }}>
        {rows.map((row, i) => {
          const rp = rowProgress ? rowProgress[i] ?? 0 : 1;
          const reveal = descReveal ? descReveal[i] ?? 0 : 1;
          const chars = Math.round(row.desc.length * reveal);
          const text = row.desc.slice(0, chars);
          const typing = reveal > 0 && reveal < 1;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 26px',
                height: rowH,
                borderBottom: `1px solid ${C.lineSoft}`,
                opacity: rp,
                transform: `translateY(${(1 - rp) * 16}px)`,
                background: `rgba(237,242,255,${Math.max(0, 1 - rp) * 0.9})`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                  {text}
                  {typing ? <span style={{ borderLeft: `2px solid ${C.primary}`, marginLeft: 1 }}>&nbsp;</span> : null}
                </div>
                <div style={{ fontSize: 12.5, color: C.soft, marginTop: 2 }}>{row.sub}</div>
              </div>
              <div style={{ width: 78, textAlign: 'right', fontFamily: MONO, fontSize: 14.5, color: C.ink2 }}>{row.qty}</div>
              <div style={{ width: 148, textAlign: 'right', fontFamily: MONO, fontSize: 14.5, color: C.ink2 }}>{money(row.rate)}</div>
              <div style={{ width: 166, textAlign: 'right', fontFamily: MONO, fontSize: 14.5, color: C.ink, fontWeight: 600 }}>
                {money(row.qty * row.rate)}
              </div>
              <div
                style={{
                  width: warrantyW,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  paddingLeft: warrantyW > 30 ? 24 : 0,
                  fontFamily: MONO,
                  fontSize: 13,
                  color: C.primary,
                  opacity: warranty,
                }}
              >
                {row.warranty}
              </div>
            </div>
          );
        })}
      </div>

      {/* totals — hidden until the count-up starts; a row of zeros is never shown */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '18px 26px 22px',
          opacity: totalsProgress > 0 ? 1 : 0,
        }}
      >
        <div style={{ width: 320, fontFamily: FONT }}>
          <Line label="Subtotal" value={money(shownSubtotal)} />
          <Line label="VAT 7.5%" value={money(shownVat)} />
          <div style={{ height: 1, background: C.line, margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: C.muted }}>TOTAL PAYABLE</span>
            <span style={{ fontFamily: MONO, fontSize: 23, fontWeight: 700, color: C.primaryInk, letterSpacing: '-0.02em' }}>
              {money(shownTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Line: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
    <span style={{ fontSize: 14, color: C.muted }}>{label}</span>
    <span style={{ fontFamily: MONO, fontSize: 14, color: C.ink2 }}>{value}</span>
  </div>
);
