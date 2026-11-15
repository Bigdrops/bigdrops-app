import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { FontStyles, Grid } from '../ui/primitives';
import { fadeUp, land, p } from '../lib/anim';

export const RecapShot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { n: '1', title: 'Open Import JSON', body: 'Invoice → Actions → Import JSON, in Add mode.' },
    { n: '2', title: 'Copy the prompt', body: 'Paste it into your AI with the source document.' },
    { n: '3', title: 'Paste and apply', body: 'Rows, totals and custom columns land together.' },
  ];

  const lock = land(frame, 118, fps, 20);

  return (
    <AbsoluteFill style={{ background: C.dark, fontFamily: FONT }}>
      <FontStyles />
      <Grid color="#8FA6C9" size={72} opacity={0.05} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: -200,
          width: 1200,
          height: 900,
          marginLeft: -600,
          background: 'radial-gradient(circle at 50% 40%, rgba(56,98,255,0.22), rgba(10,16,24,0) 65%)',
        }}
      />

      <div style={{ position: 'absolute', left: 150, top: 200 }}>
        <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.02em', color: '#8FA8FF', opacity: p(frame, 2, 16) }}>
          Three steps, every invoice.
        </div>
        <div style={{ display: 'flex', gap: 40, marginTop: 44 }}>
          {steps.map((s, i) => {
            const at = p(frame, 14 + i * 20, 22);
            const lift = p(frame, 14 + i * 20, 26);
            return (
              <div
                key={s.n}
                style={{
                  width: 470,
                  opacity: at,
                  transform: `translateY(${(1 - lift) * 26}px)`,
                  background: 'rgba(17,26,38,0.86)',
                  border: '1px solid #223146',
                  borderRadius: 18,
                  padding: '28px 26px 30px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#0A1018',
                      background: '#8FA8FF',
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#EEF3FB', letterSpacing: '-0.02em' }}>{s.title}</span>
                </div>
                <div style={{ marginTop: 16, fontSize: 16.5, lineHeight: 1.5, color: '#9FB1CB' }}>{s.body}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 150,
          bottom: 90,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: lock,
          transform: `translateY(${(1 - lock) * 14}px)`,
        }}
      >
        <Img src={staticFile('brand/favicon.svg')} style={{ width: 44, height: 44, borderRadius: 10 }} />
        <span style={{ fontSize: 26, fontWeight: 700, color: '#F2F6FD', letterSpacing: '0.02em' }}>BOURXE</span>
        <span style={{ width: 1, height: 26, background: '#2A3A50', margin: '0 6px' }} />
        <span style={{ fontSize: 16, color: '#8DA0BA' }}>Business management for Nigerian SMEs</span>
      </div>

      <div style={{ position: 'absolute', right: 150, bottom: 96, fontFamily: MONO, fontSize: 13, color: '#5C7089', opacity: lock }}>
        json import · invoice module
      </div>
    </AbsoluteFill>
  );
};
