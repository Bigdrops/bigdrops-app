import React from 'react';
import { C, FONT, MONO } from '../theme';
import { CodeBlock, INVOICE_JSON, PROMPT_LINES } from './JsonCode';

type Props = {
  jsonText?: string;
  cursor?: boolean;
  dropdown?: number;
  copied?: number;
  parsed?: number;
  applyPulse?: number;
  promptReveal?: number;
  jsonScroll?: number;
  width?: number;
  height?: number;
};

const Divider = () => <div style={{ height: 1, background: C.lineSoft }} />;

const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.16em', color: C.soft, fontFamily: FONT }}>
      {children}
    </span>
    {right}
  </div>
);

export const ImportSheet: React.FC<Props> = ({
  jsonText = '',
  cursor = false,
  dropdown = 0,
  copied = 0,
  parsed = 0,
  applyPulse = 0,
  promptReveal = 1,
  jsonScroll = 0,
  width = 720,
  height = 1080,
}) => {
  const promptChars = Math.round(PROMPT_LINES.length * promptReveal);
  const promptText = PROMPT_LINES.slice(0, promptChars);

  return (
    <div
      style={{
        width,
        height,
        background: '#FFFFFF',
        borderLeft: `1px solid ${C.line}`,
        boxShadow: '-40px 0 80px -40px rgba(11,18,32,0.35)',
        fontFamily: FONT,
        display: 'flex',
        flexDirection: 'column',
        padding: '26px 30px 26px',
        gap: 14,
        position: 'relative',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 25, fontWeight: 700, color: C.ink, letterSpacing: '-0.02em' }}>Import JSON</div>
          <div style={{ fontSize: 13, color: C.soft, marginTop: 4, fontFamily: MONO }}>
            Invoice INV-2026-0148
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.soft,
            fontSize: 16,
          }}
        >
          ✕
        </div>
      </div>

      {/* mode segmented */}
      <div style={{ display: 'flex', gap: 6, background: '#F4F7FB', borderRadius: 10, padding: 4, width: 220 }}>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '8px 0',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 1px 3px rgba(11,18,32,0.12)',
            fontSize: 13.5,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          Add
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 13.5, fontWeight: 600, color: C.soft }}>
          Update
        </div>
      </div>

      <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.5 }}>
        Create and append new line items from extracted JSON.
      </div>

      <Divider />

      {/* prompt */}
      <div>
        <SectionLabel
          right={
            <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 30,
                  padding: '0 11px',
                  borderRadius: 8,
                  border: `1px solid ${copied > 0 ? '#C9EBDF' : C.line}`,
                  background: copied > 0 ? C.okSoft : '#fff',
                  color: copied > 0 ? C.ok : C.ink2,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 13 }}>{copied > 0 ? '✓' : '⧉'}</span>
                {copied > 0 ? 'Copied' : 'Copy'}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  height: 30,
                  padding: '0 11px',
                  borderRadius: 8,
                  background: C.primarySoft,
                  border: '1px solid #D6E0FB',
                  color: C.primary,
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Open in AI
                <span style={{ fontSize: 9, transform: `rotate(${dropdown > 0 ? 180 : 0}deg)` }}>▼</span>
              </div>

              {dropdown > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 38,
                    right: 0,
                    width: 196,
                    background: '#fff',
                    border: `1px solid ${C.line}`,
                    borderRadius: 12,
                    boxShadow: '0 18px 40px -16px rgba(11,18,32,0.3)',
                    padding: 6,
                    opacity: dropdown,
                    transform: `translateY(${(1 - dropdown) * -6}px)`,
                    zIndex: 5,
                  }}
                >
                  {[
                    { name: 'ChatGPT', sub: 'chat.openai.com' },
                    { name: 'Claude', sub: 'claude.ai' },
                    { name: 'Gemini', sub: 'gemini.google.com' },
                  ].map((item, i) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: i === 0 ? C.primarySoft : 'transparent',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? C.primary : C.ink2 }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: C.soft, fontFamily: MONO }}>{item.sub}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          }
        >
          AI PROMPT
        </SectionLabel>

        <div
          style={{
            position: 'relative',
            height: 214,
            overflow: 'hidden',
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            background: '#FAFBFE',
            padding: '13px 14px',
          }}
        >
          <CodeBlock text={promptText} size={11.6} lineHeight={1.62} color="#41506B" cursor={promptReveal < 1} wrap />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 54,
              background: 'linear-gradient(to bottom, rgba(250,251,254,0), #FAFBFE)',
            }}
          />
        </div>
      </div>

      {/* json */}
      <div>
        <SectionLabel
          right={
            <span style={{ fontSize: 11, color: C.soft, fontFamily: MONO }}>
              {jsonText.length > 0 ? `${jsonText.split('\n').length} lines` : 'empty'}
            </span>
          }
        >
          PASTE JSON
        </SectionLabel>
        <div
          style={{
            position: 'relative',
            height: 292,
            overflow: 'hidden',
            border: `1.5px solid ${parsed > 0 ? '#BFD0FA' : C.line}`,
            borderRadius: 12,
            background: parsed > 0 ? '#FCFDFF' : '#FFFFFF',
            padding: '13px 14px',
          }}
        >
          {jsonText.length === 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 12.4, lineHeight: 1.6, color: '#A9B4C6', whiteSpace: 'pre' }}>
              {'{\n  "items": [{ "description": "...", "quantity": 1, "unit_price": 0 }]\n}'}
            </div>
          ) : (
            <div style={{ transform: `translateY(${jsonScroll}px)` }}>
              <CodeBlock text={jsonText} size={12.2} lineHeight={1.55} cursor={cursor} />
            </div>
          )}
        </div>
      </div>

      {/* status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 28 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 11px',
            borderRadius: 999,
            background: parsed > 0 ? C.okSoft : '#F2F5FA',
            border: `1px solid ${parsed > 0 ? '#C9EBDF' : C.line}`,
            color: parsed > 0 ? C.ok : C.soft,
            fontSize: 12,
            fontWeight: 600,
            opacity: parsed > 0 ? parsed : 1,
          }}
        >
          <span>{parsed > 0 ? '✓' : '·'}</span>
          {parsed > 0 ? 'Parsed · 8 rows · 2 groups' : 'Waiting for JSON'}
        </div>
        {parsed > 0 ? (
          <span style={{ fontSize: 12, color: C.soft, fontFamily: MONO }}>schema validated</span>
        ) : null}
      </div>

      <div style={{ flex: 1 }} />

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 16 }}>
        <div
          style={{
            height: 42,
            padding: '0 20px',
            borderRadius: 10,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: C.muted,
          }}
        >
          Cancel
        </div>
        <div
          style={{
            height: 42,
            padding: '0 26px',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            background: parsed > 0 ? C.primary : '#C3CCDC',
            transform: `scale(${1 + applyPulse * 0.04})`,
            boxShadow: applyPulse > 0 ? `0 0 0 ${6 + applyPulse * 8}px rgba(31,76,214,${0.12 * applyPulse})` : 'none',
          }}
        >
          {parsed > 0 ? 'Apply import' : 'Apply'}
        </div>
      </div>
    </div>
  );
};

export { INVOICE_JSON };
