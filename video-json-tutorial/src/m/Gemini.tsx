import React from 'react';
import { FONT, MONO } from '../theme';
import { HomeBar, H, StatusBar } from './ui';

const G = {
  bg: '#FFFFFF',
  ink: '#1F1F1F',
  sub: '#5F6368',
  line: '#E3E3E3',
  bubble: '#F0F4F9',
  composer: '#F0F4F9',
  blue: '#1A73E8',
  code: '#1F1F1F',
  codeInk: '#E8EAED',
};

const Sparkle: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="gem" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4" />
        <stop offset="0.45" stopColor="#9B72CB" />
        <stop offset="1" stopColor="#D96570" />
      </linearGradient>
    </defs>
    <path
      d="M12 2c.5 4.4 3.1 7 7.5 7.5-4.4.5-7 3.1-7.5 7.5-.5-4.4-3.1-7-7.5-7.5C8.9 9 11.5 6.4 12 2Z"
      fill="url(#gem)"
    />
    <path d="M19 15c.25 2.2 1.55 3.5 3.75 3.75-2.2.25-3.5 1.55-3.75 3.75-.25-2.2-1.55-3.5-3.75-3.75 2.2-.25 3.5-1.55 3.75-3.75Z" fill="url(#gem)" />
  </svg>
);

const PDFIcon: React.FC = () => (
  <div
    style={{
      width: 20,
      height: 24,
      borderRadius: 3,
      background: '#E8F0FE',
      border: '1px solid #C6D4F5',
      display: 'grid',
      placeItems: 'center',
      flexShrink: 0,
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M6 3h8l4 4v14H6z" stroke={G.blue} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12h6M9 16h4" stroke={G.blue} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  </div>
);

/** Minimal tokenizer for the dark code block. */
const JsonDark: React.FC<{ text: string }> = ({ text }) => {
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b|([{}[\]:,])/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={i++}>{text.slice(last, m.index)}</span>);
    const [full, str, colon, num, lit, punct] = m;
    if (str !== undefined) {
      out.push(
        <span key={i++} style={{ color: colon ? '#8AB4F8' : '#81C995' }}>
          {str}
        </span>,
      );
      if (colon) out.push(<span key={i++} style={{ color: '#9AA0A6' }}>{colon}</span>);
    } else if (num !== undefined) {
      out.push(<span key={i++} style={{ color: '#FDD663' }}>{num}</span>);
    } else if (lit !== undefined) {
      out.push(<span key={i++} style={{ color: '#FDD663' }}>{lit}</span>);
    } else if (punct !== undefined) {
      out.push(<span key={i++} style={{ color: '#9AA0A6' }}>{punct}</span>);
    } else {
      out.push(<span key={i++}>{full}</span>);
    }
    last = (m.index ?? 0) + full.length;
  }
  if (last < text.length) out.push(<span key={i++}>{text.slice(last)}</span>);
  return <>{out}</>;
};

export const GEMINI_JSON = `{
  "title": "Electrical Installation, Phase 2",
  "po_number": null,
  "items": [
    { "temp_ref": "item_1",
      "description": "Cable tray, 3m galvanised",
      "quantity": 24, "unit_price": 18500,
      "custom_fields": { "Warranty": "12 months" } },
    { "temp_ref": "item_2",
      "description": "PVC conduit, 25mm",
      "quantity": 60, "unit_price": 4200,
      "custom_fields": { "Warranty": "12 months" } },
    … 6 more rows
  ]
}`;

type Props = {
  reveal?: number;
  copyPressed?: number;
  think?: number;
  sendPressed?: number;
};

export const GeminiScreen: React.FC<Props> = ({ reveal = 1, copyPressed = 0, think = 0, sendPressed = 0 }) => {
  const chars = Math.round(GEMINI_JSON.length * reveal);
  const done = reveal >= 1;

  return (
    <>
      <div style={{ background: '#fff', height: '100%' }}>
        <StatusBar />
        {/* app bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 12px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkle size={18} />
            <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600, color: G.ink, letterSpacing: '-0.01em' }}>Gemini</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                height: 22,
                padding: '0 9px',
                borderRadius: 11,
                border: `1px solid ${G.line}`,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 9.5,
                color: G.sub,
                fontWeight: 600,
              }}
            >
              2.5 Flash
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                <path d="m6 9 6 6 6-6" stroke={G.sub} strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: 'linear-gradient(135deg,#9B72CB,#D96570)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
              K
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: G.line }} />

        <div style={{ padding: '10px 12px 0', height: H - 26 - 44 - 54 }}>
          {/* user prompt */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: 268, background: G.bubble, borderRadius: 16, borderBottomRightRadius: 4, padding: '9px 11px' }}>
              <div style={{ fontSize: 9.4, lineHeight: 1.5, color: '#3C4043' }}>
                You are a strict JSON data extractor. Follow these rules without exception:
                <br />· Return ONLY data explicitly present in the source document.
                <br />· Missing values MUST be null.
                <br />· Output MUST be valid JSON only.
                <br />
                <span style={{ color: G.sub }}>…</span>
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  background: '#fff',
                  border: `1px solid ${G.line}`,
                  borderRadius: 9,
                  padding: '5px 7px',
                }}
              >
                <PDFIcon />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: G.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    INV-2026-0148.pdf
                  </div>
                  <div style={{ fontSize: 8, color: G.sub }}>1 page · source document</div>
                </div>
              </div>
            </div>
          </div>

          {/* response */}
          <div style={{ marginTop: 10, display: 'flex', gap: 7 }}>
            <div style={{ flexShrink: 0, paddingTop: 1 }}>
              <Sparkle size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!done ? (
                <div style={{ fontSize: 10, color: G.sub, opacity: 0.5 + think * 0.5 }}>
                  Extracting line items…
                </div>
              ) : (
                <div style={{ fontSize: 10, color: G.ink, marginBottom: 6 }}>
                  Extracted 8 line items. Nothing was inferred; missing values are null.
                </div>
              )}

              <div
                style={{
                  position: 'relative',
                  background: G.code,
                  borderRadius: 12,
                  padding: '9px 9px 30px',
                  overflow: 'hidden',
                  height: 214,
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 8.2, lineHeight: 1.6, color: G.codeInk, whiteSpace: 'pre' }}>
                  <JsonDark text={GEMINI_JSON.slice(0, chars)} />
                  {!done ? <span style={{ borderLeft: '2px solid #8AB4F8', marginLeft: 1 }}>&nbsp;</span> : null}
                </div>
                {done ? (
                  <div
                    style={{
                      position: 'absolute',
                      right: 7,
                      bottom: 7,
                      height: 22,
                      padding: '0 9px',
                      borderRadius: 11,
                      background: copyPressed > 0 ? '#81C995' : 'rgba(255,255,255,0.14)',
                      color: copyPressed > 0 ? '#0F172A' : '#E8EAED',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 8.5,
                      fontWeight: 600,
                      transform: `scale(${1 - copyPressed * 0.05})`,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                    </svg>
                    {copyPressed > 0 ? 'Copied' : 'Copy'}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
                {['Regenerate', 'Share'].map((label) => (
                  <div
                    key={label}
                    style={{
                      height: 22,
                      padding: '0 9px',
                      borderRadius: 11,
                      border: `1px solid ${G.line}`,
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: 8.5,
                      color: G.sub,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* composer */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10, padding: '0 12px' }}>
          <div
            style={{
              height: 40,
              borderRadius: 20,
              background: G.composer,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 8,
            }}
          >
            <span style={{ flex: 1, fontSize: 10.5, color: '#7A7F87' }}>Ask Gemini</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="#5F6368" strokeWidth="1.8" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="#5F6368" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: G.blue,
                display: 'grid',
                placeItems: 'center',
                transform: `scale(${1 - sendPressed * 0.08})`,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M4 20 21 12 4 4l3 8-3 8Z" fill="#fff" />
              </svg>
            </div>
          </div>
        </div>
        <HomeBar />
      </div>
    </>
  );
};
