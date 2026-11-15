import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, MONO } from '../theme';
import { AppScreen } from './AppScreen';
import { ImportSheet } from './ImportSheet';
import { GeminiScreen, GEMINI_JSON } from './Gemini';
import { Caption, Chevron, HomeBar, H, M, Phone } from './ui';
import { INVOICE_JSON } from '../ui/JsonCode';
import { p, land } from '../lib/anim';

const DARK = '#0A1018';

/* ---------------------------------------------------------------- hook */
export const MHook: React.FC = () => {
  const frame = useCurrentFrame();
  const a = p(frame, 4, 18);
  const b = p(frame, 16, 18);
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 300,
          width: 900,
          height: 900,
          marginLeft: -450,
          background: 'radial-gradient(circle, rgba(56,98,255,0.22), rgba(10,16,24,0) 64%)',
        }}
      />
      <div style={{ position: 'absolute', left: 84, top: 470, right: 84 }}>
        <div style={{ fontFamily: MONO, fontSize: 24, color: '#8FA8FF', letterSpacing: '0.16em', opacity: a }}>
          BOURXE · INVOICE
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 104,
            lineHeight: 1.04,
            fontWeight: 800,
            letterSpacing: '-0.045em',
            color: '#F4F7FD',
            opacity: a,
          }}
        >
          JSON in.
          <br />
          <span style={{ color: '#8FA8FF' }}>Rows out.</span>
        </div>
        <div style={{ marginTop: 28, height: 5, width: 200 * b, background: '#4C74F5', borderRadius: 3 }} />
        <div style={{ marginTop: 26, fontSize: 32, lineHeight: 1.4, color: '#A9B9D0', opacity: b, maxWidth: 760 }}>
          Importing invoice line items on your phone, from prompt to preview.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------- app: empty */
export const MAppEmpty: React.FC = () => {
  const frame = useCurrentFrame();
  const press = interpolate(frame, [92, 102, 118], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <Phone>
        <AppScreen mode="empty" morePressed={press} />
        <Caption at={p(frame, 8, 16)} bottom={64}>
          Open the invoice you are building. No rows typed yet.
        </Caption>
      </Phone>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------ quick actions */
export const MQuickActions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = land(frame, 6, fps, 18);
  const tap = interpolate(frame, [96, 106, 122], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const h = 292;
  const top = H - h;

  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <Phone>
        <AppScreen mode="empty" />
        <div style={{ position: 'absolute', inset: 0, background: `rgba(15,23,42,${0.5 * Math.min(1, up)})` }} />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top,
            height: h + 8,
            background: M.card,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderTop: `1px solid ${M.line}`,
            transform: `translateY(${(1 - up) * 320}px)`,
            boxShadow: '0 -22px 44px -22px rgba(15,23,42,0.45)',
            padding: '8px 12px 0',
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 4, background: M.lineStrong, margin: '0 auto 8px' }} />
          <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>Quick Actions</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Save draft', tone: '#0EA5E9', highlight: false },
              { label: 'Import JSON', tone: '#22C55E', highlight: true },
              { label: 'Table settings', tone: '#64748B', highlight: false },
              { label: 'Add group', tone: '#8B5CF6', highlight: false },
              { label: 'Notes & terms', tone: '#F59E0B', highlight: false },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  height: 34,
                  borderRadius: 11,
                  border: `1px solid ${row.highlight ? 'rgba(34,197,94,0.45)' : M.line}`,
                  background: row.highlight ? 'rgba(220,247,227,0.55)' : '#F8FAFC',
                  display: 'grid',
                  gridTemplateColumns: '26px minmax(0,1fr) auto',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 9px',
                  transform: row.highlight ? `scale(${1 - tap * 0.02})` : undefined,
                  boxShadow: row.highlight && tap > 0 ? `0 0 0 ${tap * 4}px rgba(34,197,94,0.16)` : 'none',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: `${row.tone}1A`,
                    display: 'grid',
                    placeItems: 'center',
                    color: row.tone,
                  }}
                >
                  {row.label === 'Import JSON' ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3v11m0 0 4-4m-4 4-4-4" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 800 }}>·</span>
                  )}
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: row.highlight ? '#14532D' : M.ink }}>{row.label}</span>
                <Chevron color={M.faint} size={11} />
              </div>
            ))}
          </div>
        </div>
        <Caption at={p(frame, 14, 16)} bottom={330}>
          Actions, then Import JSON.
        </Caption>
        <HomeBar />
      </Phone>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------- import sheet */
export const MImportSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const up = land(frame, 4, fps, 18);
  const openAi = interpolate(frame, [150, 158, 174], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <Phone>
        <AppScreen mode="empty" />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H, transform: `translateY(${(1 - up) * (H - 160)}px)` }}>
          <ImportSheet openAiPressed={openAi} top={160} />
        </div>
        <Caption at={p(frame, 24, 16)} bottom={488}>
          Copy the built-in prompt, or open your AI from here.
        </Caption>
      </Phone>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------ gemini */
export const MGemini: React.FC = () => {
  const frame = useCurrentFrame();
  const reveal = p(frame, 48, 210);
  const copy = interpolate(frame, [268, 276, 292], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: '#fff' }}>
      <Phone>
        <GeminiScreen reveal={reveal} copyPressed={copy} think={p(frame, 20, 20)} />
        <Caption at={p(frame, 8, 14)} bottom={82}>
          Paste the prompt, attach the document, let it extract.
        </Caption>
      </Phone>
    </AbsoluteFill>
  );
};

/* --------------------------------------------------- back and paste */
export const MPaste: React.FC = () => {
  const frame = useCurrentFrame();
  const chars = Math.round(INVOICE_JSON.length * p(frame, 14, 120));
  const typing = chars < INVOICE_JSON.length;
  const enabled = p(frame, 140, 12);
  const tap = interpolate(frame, [168, 176, 192], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const scroll = Math.min(1, Math.max(0, (frame - 136) / 60));

  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <Phone>
        <AppScreen mode="empty" />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)' }} />
        <ImportSheet
          jsonText={INVOICE_JSON.slice(0, chars)}
          cursor={typing}
          jsonScroll={-scroll * 168}
          previewEnabled={enabled}
          previewPressed={tap}
          top={160}
        />
        <Caption at={p(frame, 4, 14)} bottom={488}>
          Back in the app: paste it into the sheet.
        </Caption>
        <HomeBar />
      </Phone>
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------- rows fill */
export const MRows: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = p(frame, 0, 14);
  const progress = [0, 1, 2].map((i) => land(frame, 18 + i * 14, fps, 15));
  const totals = p(frame, 88, 30);
  const chip = p(frame, 152, 18);
  // once the rows are in, scroll the form so the totals card is on screen
  const scrollY = -p(frame, 164, 50) * 262;
  const captionAt = p(frame, 26, 16) * (1 - p(frame, 128, 14));

  return (
    <AbsoluteFill style={{ background: M.bg }}>
      <Phone>
        <AppScreen mode="filled" itemProgress={progress} totalsProgress={totals} scrollY={scrollY} />
        {out < 1 ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: H, transform: `translateY(${out * H}px)` }}>
            <ImportSheet jsonText={INVOICE_JSON} previewEnabled={1} top={160} />
          </div>
        ) : null}
        <Caption at={captionAt} bottom={64}>
          8 rows, the VAT and the total are written at once.
        </Caption>
      </Phone>
    </AbsoluteFill>
  );
};

/* --------------------------------------------------------------- end */
export const MEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lock = land(frame, 68, fps, 20);
  const steps = [
    { n: '1', t: 'AI PROMPT', d: 'Copy the prompt the sheet builds.' },
    { n: '2', t: 'GEMINI', d: 'Give it the source document.' },
    { n: '3', t: 'PASTE + PREVIEW', d: 'Rows and totals land in the invoice.' },
  ];
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />
      <div style={{ position: 'absolute', left: 90, top: 450, right: 90 }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: '#8FA8FF', letterSpacing: '0.16em', opacity: p(frame, 2, 14) }}>
          THE LOOP
        </div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 26 }}>
          {steps.map((s, i) => {
            const at = p(frame, 10 + i * 16, 20);
            return (
              <div
                key={s.n}
                style={{
                  opacity: at,
                  transform: `translateY(${(1 - at) * 18}px)`,
                  display: 'flex',
                  gap: 18,
                  alignItems: 'center',
                  borderBottom: '1px solid #1E2A3A',
                  paddingBottom: 22,
                }}
              >
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 48,
                    fontWeight: 700,
                    color: '#0A1018',
                    background: '#8FA8FF',
                    width: 96,
                    height: 96,
                    borderRadius: 22,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {s.n}
                </span>
                <div>
                  <div style={{ fontSize: 62, fontWeight: 800, color: '#F2F6FD', letterSpacing: '-0.02em' }}>{s.t}</div>
                  <div style={{ fontSize: 38, color: '#9FB1CB', marginTop: 8, lineHeight: 1.32 }}>{s.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 84,
          bottom: 120,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: lock,
          transform: `translateY(${(1 - lock) * 14}px)`,
        }}
      >
        <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: '0.02em', color: '#F2F6FD' }}>BOURXE</span>
        <span style={{ width: 1, height: 50, background: '#2A3A50' }} />
        <span style={{ fontSize: 32, color: '#8DA0BA' }}>JSON import, on mobile</span>
      </div>
    </AbsoluteFill>
  );
};

export { GEMINI_JSON };
