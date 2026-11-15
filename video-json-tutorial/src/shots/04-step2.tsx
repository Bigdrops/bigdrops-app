import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles } from '../ui/primitives';
import { ImportSheet } from '../ui/ImportSheet';
import { p } from '../lib/anim';

export const Step2Shot: React.FC = () => {
  const frame = useCurrentFrame();

  const reveal = p(frame, 20, 70);
  const copied = p(frame, 150, 8);
  const dropdown = p(frame, 118, 12);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FontStyles />
      <div style={{ position: 'absolute', left: 100, top: 76 }}>
        <ChapterTag n="2" label="Copy the prompt" progress={0.5} />
      </div>

      <div style={{ position: 'absolute', left: 100, top: 210, width: 430 }}>
        <div
          style={{
            fontSize: 46,
            lineHeight: 1.12,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: C.ink,
            opacity: p(frame, 6, 20),
          }}
        >
          The app hands
          <br />
          you the prompt.
        </div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Note at={p(frame, 30, 16)} title="Schema locked" body="Item keys are generated from the columns this invoice actually shows." />
          <Note at={p(frame, 62, 16)} title="No invention" body="Missing values must come back as null. Groups only when the source has them." />
          <Note at={p(frame, 94, 16)} title="One click" body="Open in AI, or copy and paste it into the model you already use." />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 600,
          top: 0,
          transform: `scale(${1 + 0.02 * p(frame, 0, 240)})`,
          transformOrigin: 'left top',
          filter: 'drop-shadow(0 40px 80px rgba(11,18,32,0.14))',
        }}
      >
        <ImportSheet
          width={740}
          promptReveal={reveal}
          dropdown={dropdown}
          copied={copied}
          parsed={0}
        />
      </div>

      {/* copy click cursor */}
      <div
        style={{
          position: 'absolute',
          left: 1150 + (1 - p(frame, 130, 22)) * 40,
          top: 306 + (1 - p(frame, 130, 22)) * 30,
          opacity: p(frame, 128, 10) * (1 - p(frame, 168, 14)),
          width: 24,
          height: 24,
          borderRadius: 12,
          border: `2px solid ${C.primary}`,
          background: 'rgba(31,76,214,0.12)',
        }}
      />

      <div style={{ position: 'absolute', left: 100, bottom: 76 }}>
        <Caption>Copy it, or open your AI directly from the sheet.</Caption>
      </div>
      <div style={{ position: 'absolute', right: 90, bottom: 76, fontFamily: MONO, fontSize: 13, color: C.soft }}>
        prompt = columns + rules
      </div>
    </AbsoluteFill>
  );
};

const Note: React.FC<{ at: number; title: string; body: string }> = ({ at, title, body }) => (
  <div
    style={{
      opacity: at,
      transform: `translateX(${(1 - at) * -14}px)`,
      borderLeft: `3px solid ${C.primary}`,
      paddingLeft: 16,
    }}
  >
    <div style={{ fontSize: 16.5, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>{title}</div>
    <div style={{ fontSize: 15, color: C.muted, marginTop: 5, lineHeight: 1.45, maxWidth: 380 }}>{body}</div>
  </div>
);
