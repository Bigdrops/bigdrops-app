import React from 'react';
import { MONO } from '../theme';
import { H, M, W } from './ui';
import { CodeBlock } from '../ui/JsonCode';

type Props = {
  jsonText?: string;
  cursor?: boolean;
  jsonScroll?: number;
  aiPressed?: number;
  openAiPressed?: number;
  previewEnabled?: number;
  previewPressed?: number;
  top?: number;
};

/** Pixel-matched to the shipped mobile import sheet (AI prompt / open in AI). */
export const ImportSheet: React.FC<Props> = ({
  jsonText = '',
  cursor = false,
  jsonScroll = 0,
  aiPressed = 0,
  openAiPressed = 0,
  previewEnabled = 0,
  previewPressed = 0,
  top = 214,
}) => {
  const height = H - top;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        height,
        background: M.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTop: `1px solid ${M.line}`,
        boxShadow: '0 -22px 44px -22px rgba(15,23,42,0.45)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 12px 0',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v10m0 0 4-4m-4 4-4-4" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
              <path d="m17 6 1.6 2.4L21 9l-2.4 1.6L17 13l-1.6-2.4L13 9l2.4-.6L17 6Z" fill="#22C55E" />
            </svg>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.025em' }}>Import JSON</span>
          </div>
          <div style={{ fontSize: 10.5, lineHeight: 1.35, color: M.label, marginTop: 3, maxWidth: 150 }}>
            Add or update invoice items using JSON.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <div
            style={{
              height: 28,
              padding: '0 8px',
              borderRadius: 9,
              background: M.greenSoft,
              color: '#14532D',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 8.5,
              fontWeight: 800,
              letterSpacing: '0.02em',
              transform: `scale(${1 - aiPressed * 0.05})`,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="#15803D" strokeWidth="1.9" />
              <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke="#15803D" strokeWidth="1.9" strokeLinecap="round" />
              <path d="m14 3 .9 1.6L16.5 5.5l-1.6.9L14 8l-.9-1.6L11.5 5.5l1.6-.9L14 3Z" fill="#15803D" />
            </svg>
            AI PROMPT
          </div>
          <div
            style={{
              width: 62,
              height: 32,
              borderRadius: 9,
              background: M.blueSoft,
              color: M.blueInk,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              transform: `scale(${1 - openAiPressed * 0.05})`,
            }}
          >
            <span style={{ fontSize: 7.5, fontWeight: 800, lineHeight: 1.1, letterSpacing: '0.02em', textAlign: 'center' }}>
              OPEN
              <br />
              IN AI
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <path d="m11 2 .8 2L14 5l-2.2.8L11 8l-.8-2.2L8 5l2.2-1L11 2Z" fill="#2563EB" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: M.line, margin: '9px -12px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: M.label, margin: '10px 0 6px' }}>
        Import strategy
      </div>

      <div style={{ display: 'flex', gap: 4, border: `1px solid ${M.line}`, borderRadius: 13, padding: 3, background: '#F8FAFC' }}>
        <div
          style={{
            flex: 1,
            height: 34,
            borderRadius: 10,
            border: `1.5px solid ${M.line}`,
            background: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11.5,
            fontWeight: 700,
            color: M.ink,
            boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
          }}
        >
          New Items
        </div>
        <div
          style={{
            flex: 1,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            fontSize: 11.5,
            fontWeight: 700,
            color: M.faint,
          }}
        >
          Update Existing
        </div>
      </div>

      <div style={{ marginTop: 7, border: `1px solid ${M.line}`, borderRadius: 12, padding: '7px 10px' }}>
        <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: M.label }}>
          Mode details
        </div>
        <div style={{ fontSize: 10.5, color: M.ink, marginTop: 2 }}>Create and append new line items from extracted JSON.</div>
      </div>

      <div
        style={{
          marginTop: 7,
          height: 28,
          borderRadius: 8,
          background: M.accentSoft,
          border: `1px solid ${M.accentLine}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px',
        }}
      >
        <div style={{ width: 14, height: 14, borderRadius: 7, background: '#3B82F6', display: 'grid', placeItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 8, fontWeight: 800, fontStyle: 'italic' }}>i</span>
        </div>
        <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: M.blueInk }}>How JSON item import works</span>
        <span style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.1em', color: '#8FB0F0' }}>HOW IT WORKS</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '9px 0 5px' }}>
        <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.09em', color: M.sub, textTransform: 'uppercase' }}>
          Step 1: Paste JSON
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', color: M.sub }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <rect x="8" y="8" width="12" height="12" rx="2.5" stroke={M.sub} strokeWidth="1.9" />
              <path d="M5 15V5a2 2 0 0 1 2-2h8" stroke={M.sub} strokeWidth="1.9" strokeLinecap="round" />
            </svg>
            PASTE
          </span>
          <span style={{ fontSize: 8.5, fontStyle: 'italic', color: M.faint }}>one object only</span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          borderRadius: 13,
          background: M.soft,
          border: `1px solid ${M.line}`,
          padding: '9px 10px',
          overflow: 'hidden',
        }}
      >
        {jsonText.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: '#A9B4C6' }}>{'{ "key": "value" }'}</div>
        ) : (
          <div style={{ transform: `translateY(${jsonScroll}px)` }}>
            <CodeBlock text={jsonText} size={9.2} lineHeight={1.5} cursor={cursor} wrap />
          </div>
        )}
      </div>

      <div
        style={{
          margin: '8px 0 0',
          height: 38,
          borderRadius: 12,
          background: previewEnabled > 0 ? M.accent : '#F1F5F9',
          color: previewEnabled > 0 ? '#fff' : M.faint,
          display: 'grid',
          placeItems: 'center',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.01em',
          transform: `scale(${1 - previewPressed * 0.02})`,
          boxShadow: previewEnabled > 0 ? '0 10px 20px -12px rgba(31,76,214,0.8)' : 'none',
          marginBottom: 14,
        }}
      >
        Preview Extraction
      </div>
    </div>
  );
};

export const SHEET_W = W;
