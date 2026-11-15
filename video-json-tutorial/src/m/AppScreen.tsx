import React from 'react';
import { C, MONO } from '../theme';
import { money } from '../theme';
import { Chevron, H, Label, M, SectionHead, StatusBar, TopBar } from './ui';
import { ROWS } from '../timeline';

const VAT = 0.075;

type Props = {
  mode?: 'empty' | 'filled';
  itemProgress?: number[];
  totalsProgress?: number;
  morePressed?: number;
  importPressed?: number;
  chip?: number;
  showDetails?: boolean;
  scrollY?: number;
};

export const AppScreen: React.FC<Props> = ({
  mode = 'empty',
  itemProgress = [],
  totalsProgress = 1,
  morePressed = 0,
  importPressed = 0,
  chip = 0,
  showDetails = true,
  scrollY = 0,
}) => {
  const items = ROWS.slice(0, 3);
  const subtotal = mode === 'filled' ? ROWS.reduce((s, r) => s + r.qty * r.rate, 0) : 0;
  const vat = Math.round(subtotal * VAT);
  const total = (subtotal + vat) * totalsProgress;

  return (
    <>
      <StatusBar />
      <TopBar pressed={morePressed} />

      <div style={{ padding: '0 12px', height: H - 73 - 26, overflow: 'hidden' }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>
        {showDetails ? (
          <>
            <SectionHead n="1." title="Document details" meta="SASINV-000133" />
            <Label>Client *</Label>
            <div
              style={{
                height: 46,
                borderRadius: 14,
                border: `1.2px dashed ${M.lineStrong}`,
                background: M.card,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '0 10px',
                marginBottom: 9,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: `1px solid ${M.line}`,
                  background: M.soft,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.6" stroke="#64748B" strokeWidth="1.7" />
                  <path d="M5 20a7 7 0 0 1 14 0" stroke="#64748B" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: mode === 'filled' ? M.ink : M.ink }}>
                  {mode === 'filled' ? 'Kestrel Industrial Ltd' : 'Select a client'}
                </div>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', color: M.faint, textTransform: 'uppercase', marginTop: 1 }}>
                  {mode === 'filled' ? 'Bill to · Client' : 'Bill to · Client'}
                </div>
              </div>
              <Chevron dir="right" color={M.faint} size={13} />
            </div>

            <Label>Invoice title</Label>
            <div
              style={{
                height: 42,
                borderRadius: 12,
                border: `1px solid ${M.line}`,
                background: M.card,
                display: 'flex',
                alignItems: 'center',
                padding: '0 11px',
                fontSize: 13,
                fontWeight: 600,
                color: mode === 'filled' ? M.ink : M.faint,
              }}
            >
              {mode === 'filled' ? 'Electrical Installation, Phase 2' : 'e.g. Monthly Maintenance'}
            </div>
          </>
        ) : null}

        <SectionHead n="2." title="Line items" meta={mode === 'filled' ? '8 rows' : '0 rows'} />

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Tool label="Import JSON" active={importPressed > 0} pulse={importPressed} icon="import" />
          <Tool label="Table settings" icon="columns" />
        </div>

        {mode === 'empty' ? (
          <div
            style={{
              marginTop: 6,
              padding: '18px 12px',
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1.6,
              color: M.faint,
              border: `1px dashed ${M.line}`,
              borderRadius: 12,
            }}
          >
            No line items yet.
            <br />
            Add a row, or import them from JSON.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {items.map((row, i) => {
              const p = itemProgress[i] ?? 0;
              return (
                <div
                  key={i}
                  style={{
                    opacity: p,
                    transform: `translateY(${(1 - p) * 12}px)`,
                    paddingTop: 11,
                    borderTop: i === 0 ? 'none' : `1px solid ${M.line}`,
                    marginTop: i === 0 ? 0 : 4,
                    background: `rgba(237,244,254,${Math.max(0, 1 - p) * 0.9})`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        border: `1px solid ${M.line}`,
                        background: M.card,
                        display: 'grid',
                        placeItems: 'center',
                        fontFamily: MONO,
                        fontSize: 10,
                        color: M.ink,
                        flexShrink: 0,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.desc}
                      </div>
                      <div style={{ fontSize: 10, color: M.faint, marginTop: 1 }}>{row.sub}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                        <MiniField label="Qty" value={String(row.qty)} />
                        <MiniField label="Rate" value={money(row.rate)} accent />
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          height: 30,
                          borderRadius: 9,
                          background: M.dark,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0 9px',
                        }}
                      >
                        <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' }}>
                          Amount
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
                          {money(row.qty * row.rate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* totals close-out */}
        {mode === 'filled' ? (
          <div
            style={{
              marginTop: 10,
              border: `1px solid ${M.lineStrong}`,
              borderRadius: 14,
              background: `linear-gradient(180deg, rgba(31,76,214,0.08), rgba(255,255,255,0) 45%), #fff`,
              overflow: 'hidden',
              opacity: totalsProgress > 0 ? 1 : 0,
            }}
          >
            <div style={{ height: 3, background: M.accent }} />
            <div style={{ padding: '6px 11px 10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: M.accent, textTransform: 'uppercase', marginBottom: 4 }}>
                <span>Totals</span>
                <span>NGN</span>
              </div>
              <SumLine label="Subtotal" value={money(subtotal * totalsProgress)} />
              <SumLine label="VAT 7.5%" value={money(vat * totalsProgress)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `2px solid ${M.lineStrong}`, marginTop: 6, paddingTop: 6 }}>
                <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', color: M.faint, textTransform: 'uppercase' }}>
                  Total payable
                </span>
                <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: M.accent, letterSpacing: '-0.02em' }}>
                  {money(total)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {chip > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 66,
              opacity: chip,
              transform: `translateY(${(1 - chip) * 8}px)`,
              background: 'rgba(21,128,61,0.10)',
              border: '1px solid rgba(21,128,61,0.24)',
              borderRadius: 11,
              padding: '8px 11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 10.5, fontWeight: 800, color: M.green }}>8 rows imported · 1 new column</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: M.green, opacity: 0.8 }}>WARRANTY</span>
          </div>
        ) : null}
        </div>
      </div>

      {/* save FAB */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          bottom: 18,
          height: 40,
          padding: '0 16px',
          borderRadius: 20,
          background: M.accent,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          boxShadow: '0 14px 26px -12px rgba(31,76,214,0.8)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 4h11l3 3v13H5z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 12h8M8 16h5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Save
      </div>
    </>
  );
};

const Tool: React.FC<{ label: string; icon: 'import' | 'columns'; active?: boolean; pulse?: number }> = ({
  label,
  icon,
  active,
  pulse = 0,
}) => (
  <div
    style={{
      height: 32,
      padding: '0 10px',
      borderRadius: 10,
      border: `1px solid ${active ? M.accent : M.line}`,
      background: active ? M.accent : M.card,
      color: active ? '#fff' : M.sub,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 8,
      fontWeight: 800,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      boxShadow: pulse > 0 ? `0 0 0 ${3 + pulse * 4}px rgba(31,76,214,${0.16 * pulse})` : 'none',
      transform: `scale(${1 + pulse * 0.03})`,
    }}
  >
    {icon === 'import' ? (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ) : (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 4v16M15 4v16" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )}
    {label}
  </div>
);

const MiniField: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.08em', color: M.faint, textTransform: 'uppercase', marginBottom: 2 }}>
      {label}
    </div>
    <div
      style={{
        height: 28,
        borderRadius: 8,
        border: `1px solid ${M.line}`,
        borderLeft: accent ? `3px solid ${M.accent}` : `1px solid ${M.line}`,
        background: M.card,
        display: 'flex',
        alignItems: 'center',
        padding: '0 7px',
        fontFamily: MONO,
        fontSize: 11,
        color: M.ink,
      }}
    >
      {value}
    </div>
  </div>
);

const SumLine: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${M.line}`, fontSize: 10.5, color: M.sub }}>
    <span>{label}</span>
    <span style={{ fontFamily: MONO, fontSize: 10.5, color: M.ink }}>{value}</span>
  </div>
);

export const APP_BG = C.bg;
