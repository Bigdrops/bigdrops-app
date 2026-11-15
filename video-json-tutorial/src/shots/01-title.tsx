import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { Caption, ChapterTag, FontStyles, Grid, Pill } from '../ui/primitives';
import { land, p } from '../lib/anim';

const Json: React.FC<{ text: string }> = ({ text }) => <>{text}</>;

export const TitleShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const head = p(frame, 6, 26);
  const sub = p(frame, 24, 24);
  const card = land(frame, 30, fps, 18);
  const line = p(frame, 40, 26);

  const tags = (color: string) => ({ color });

  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: FONT }}>
      <FontStyles />
      <Grid color="#8FA6C9" size={72} opacity={0.055} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1300,
          height: 1300,
          marginLeft: -650,
          marginTop: -650,
          background: 'radial-gradient(circle at 50% 50%, rgba(56,98,255,0.20), rgba(10,16,24,0) 62%)',
        }}
      />

      <div style={{ position: 'absolute', left: 150, top: 236, width: 900 }}>
        <ChapterTag n="01" label="Bourxe · invoice module" progress={0.02} dark />
        <div
          style={{
            marginTop: 32,
            fontSize: 82,
            lineHeight: 1.06,
            fontWeight: 700,
            letterSpacing: '-0.035em',
            color: '#F4F7FD',
            opacity: head,
            transform: `translateY(${(1 - head) * 22}px)`,
          }}
        >
          Populate an
          <br />
          invoice table
          <br />
          <span style={{ color: '#8FA8FF' }}>with JSON</span>
        </div>
        <div style={{ marginTop: 26, height: 4, width: 260 * line, background: '#4C74F5', borderRadius: 3 }} />
        <div
          style={{
            marginTop: 26,
            fontSize: 27,
            lineHeight: 1.45,
            color: '#A9B9D0',
            maxWidth: 780,
            opacity: sub,
          }}
        >
          One prompt, one pasted payload, and the rows, totals and custom columns write themselves.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: 130,
          top: 292,
          width: 470,
          opacity: card,
          transform: `translateY(${(1 - card) * 40}px) rotate(-2.2deg)`,
        }}
      >
        <div
          style={{
            background: 'rgba(17,26,38,0.92)',
            border: '1px solid #24344A',
            borderRadius: 16,
            padding: '20px 22px',
            boxShadow: '0 40px 90px -40px rgba(0,0,0,0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#3B5372' }} />
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#3B5372' }} />
            <span style={{ width: 9, height: 9, borderRadius: 9, background: '#3B5372' }} />
            <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 12, color: '#6E86A4' }}>invoice.json</span>
          </div>
          <pre style={{ margin: 0, fontFamily: MONO, fontSize: 13.5, lineHeight: 1.7, color: '#C7D6EA' }}>
            <span style={tags('#8FA8FF')}>"items"</span>: [
            <br />
            {'  { '}
            <span style={tags('#7FD1AC')}>"description"</span>: <span style={tags('#7FD1AC')}>"Cable tray, 3m"</span>,<br />
            {'    '}
            <span style={tags('#8FA8FF')}>"quantity"</span>: <span style={tags('#E7B071')}>24</span>
            {' },'}
            <br />
            {'  { '}
            <span style={tags('#7FD1AC')}>"description"</span>: <span style={tags('#7FD1AC')}>"PVC conduit"</span>,<br />
            {'    '}
            <span style={tags('#8FA8FF')}>"quantity"</span>: <span style={tags('#E7B071')}>60</span>
            {' },'}
            <br />
            {'  … '}
            <span style={{ color: '#6E86A4' }}>8 rows</span>
            <br />]
          </pre>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, opacity: p(frame, 50, 18) }}>
          <Pill tone="dark">Append mode · schema validated</Pill>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 150, bottom: 84 }}>
        <Caption dark>How to use JSON import in Bourxe</Caption>
      </div>
      <Json text="" />
    </AbsoluteFill>
  );
};
