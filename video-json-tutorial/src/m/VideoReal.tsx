import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { FONT, MONO } from '../theme';
import { p } from '../lib/anim';

const DARK = '#0A1018';
const BLUE = '#8FA8FF';

/** 1080 x 2400 canvas: the phone recording, full bleed, with captions. */
export const RW = 1080;
export const RH = 2400;

type Clip = { src: string; dur: number; step: string; caption: string };

export const CLIPS: Clip[] = [
  { src: 'clips/c1.mp4', dur: 83, step: '1 — AI PROMPT', caption: 'Open Import JSON on the invoice. Tap AI PROMPT: the sheet builds the prompt for you.' },
  { src: 'clips/c2.mp4', dur: 18, step: '2 — OPEN IN AI', caption: 'OPEN IN AI hands over to your assistant.' },
  { src: 'clips/c4.mp4', dur: 159, step: '3 — EXTRACT', caption: 'Paste the source document with the rules. Gemini answers in the exact JSON shape.' },
  { src: 'clips/c5.mp4', dur: 123, step: '4 — PASTE BACK', caption: 'Back in the app, PASTE drops the JSON in. Preview Extraction is live.' },
  { src: 'clips/c6.mp4', dur: 78, step: '5 — PREVIEW', caption: 'Preview writes the line items into the invoice.' },
  { src: 'clips/c7.mp4', dur: 105, step: '5 — PREVIEW', caption: 'Descriptions, unit prices and the totals are already there.' },
];

export const INTRO_DUR = 82;
export const OUTRO_DUR = 88;
export const RTOTAL = INTRO_DUR + CLIPS.reduce((s, c) => s + c.dur, 0) + OUTRO_DUR;

/** Absolute start frame of each clip in the composition. */
export const STARTS = CLIPS.reduce<number[]>((acc, c, i) => {
  acc.push(i === 0 ? INTRO_DUR : acc[i - 1] + CLIPS[i - 1].dur);
  return acc;
}, []);

const Grid: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
      backgroundSize: '80px 80px',
    }}
  />
);

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const a = p(frame, 4, 20);
  const b = p(frame, 18, 20);
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      <Grid />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 620,
          width: 1100,
          height: 1100,
          marginLeft: -550,
          background: 'radial-gradient(circle, rgba(56,98,255,0.24), rgba(10,16,24,0) 64%)',
        }}
      />
      <div style={{ position: 'absolute', left: 96, top: 760, right: 96 }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: BLUE, letterSpacing: '0.16em', opacity: a }}>
          BOURXE · INVOICE
        </div>
        <div style={{ marginTop: 30, fontSize: 124, lineHeight: 1.03, fontWeight: 800, letterSpacing: '-0.045em', color: '#F4F7FD', opacity: a }}>
          JSON in.
          <br />
          <span style={{ color: BLUE }}>Rows out.</span>
        </div>
        <div style={{ marginTop: 30, height: 6, width: 220 * b, background: '#4C74F5', borderRadius: 3 }} />
        <div style={{ marginTop: 30, fontSize: 38, lineHeight: 1.42, color: '#A9B9D0', opacity: b, maxWidth: 820 }}>
          Importing invoice line items on the phone — prompt, extract, paste, preview.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClipShot: React.FC<{ clip: Clip; index: number }> = ({ clip, index }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 6, clip.dur - 6, clip.dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cap = p(frame, 4, 14);
  return (
    <AbsoluteFill style={{ background: DARK, opacity: fade }}>
      <OffthreadVideo src={staticFile(clip.src)} style={{ width: RW, height: RH }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 520, background: 'linear-gradient(180deg, rgba(10,16,24,0) 0%, rgba(10,16,24,0.55) 55%, rgba(10,16,24,0.86) 100%)' }} />
      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 200,
          opacity: cap,
          transform: `translateY(${(1 - cap) * 14}px)`,
          fontFamily: FONT,
          background: 'rgba(10,16,24,0.87)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 28,
          padding: '26px 32px 30px',
          boxShadow: '0 28px 60px -30px rgba(0,0,0,0.9)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: MONO, fontSize: 25, letterSpacing: '0.14em', color: BLUE }}>{clip.step}</span>
          <span style={{ fontFamily: MONO, fontSize: 23, letterSpacing: '0.1em', color: 'rgba(246,249,255,0.45)' }}>
            {String(index + 1).padStart(2, '0')}/{String(CLIPS.length).padStart(2, '0')}
          </span>
        </div>
        <div style={{ fontSize: 46, lineHeight: 1.32, fontWeight: 600, color: '#F6F9FF', letterSpacing: '-0.012em' }}>
          {clip.caption}
        </div>
      </div>

    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const lock = p(frame, 30, 20);
  const steps = [
    { n: '1', t: 'AI PROMPT', d: 'The sheet builds and copies it.' },
    { n: '2', t: 'OPEN IN AI', d: 'Hand the source to Gemini.' },
    { n: '3', t: 'PASTE + PREVIEW', d: 'Rows, prices and totals land.' },
  ];
  return (
    <AbsoluteFill style={{ background: DARK, fontFamily: FONT }}>
      <Grid />
      <div style={{ position: 'absolute', left: 96, top: 620, right: 96 }}>
        <div style={{ fontFamily: MONO, fontSize: 26, color: BLUE, letterSpacing: '0.16em', opacity: p(frame, 2, 14) }}>THE LOOP</div>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 30 }}>
          {steps.map((s, i) => {
            const at = p(frame, 8 + i * 14, 18);
            return (
              <div
                key={s.n}
                style={{
                  opacity: at,
                  transform: `translateY(${(1 - at) * 18}px)`,
                  display: 'flex',
                  gap: 24,
                  alignItems: 'center',
                  borderBottom: '1px solid #1E2A3A',
                  paddingBottom: 26,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700, color: '#0A1018', background: BLUE, width: 104, height: 104, borderRadius: 24, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {s.n}
                </span>
                <div>
                  <div style={{ fontSize: 66, fontWeight: 800, color: '#F2F6FD', letterSpacing: '-0.02em' }}>{s.t}</div>
                  <div style={{ fontSize: 40, color: '#9FB1CB', marginTop: 8, lineHeight: 1.3 }}>{s.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 96, bottom: 150, display: 'flex', alignItems: 'center', gap: 18, opacity: lock, transform: `translateY(${(1 - lock) * 14}px)` }}>
        <span style={{ fontSize: 68, fontWeight: 800, letterSpacing: '0.02em', color: '#F2F6FD' }}>BOURXE</span>
        <span style={{ width: 1, height: 52, background: '#2A3A50' }} />
        <span style={{ fontSize: 34, color: '#8DA0BA' }}>JSON import, on mobile</span>
      </div>
    </AbsoluteFill>
  );
};

const Cues: React.FC = () => {
  const cues: { at: number; src: string; v: number; dur?: number }[] = [
    { at: 6, src: 'impact/impact-cine-big.mp3', v: 0.36 },
    { at: 30, src: 'light/shimmer-sparkle-sweep.mp3', v: 0.13, dur: 50 },
    { at: STARTS[0], src: 'transition/air-woosh-quick.mp3', v: 0.24 },
    { at: STARTS[0] + 26, src: 'ui/switch-tap.mp3', v: 0.34 },
    { at: STARTS[1], src: 'ui/switch-tap.mp3', v: 0.3 },
    { at: STARTS[2], src: 'transition/air-woosh-quick.mp3', v: 0.2 },
    { at: STARTS[2] + 30, src: 'text/typewriter-digital.mp3', v: 0.12, dur: 110 },
    { at: STARTS[2] + 132, src: 'ui/switch-tap.mp3', v: 0.28 },
    { at: STARTS[3], src: 'transition/air-woosh-quick.mp3', v: 0.22 },
    { at: STARTS[4], src: 'ui/switch-tap.mp3', v: 0.34 },
    { at: STARTS[4] + 12, src: 'ui/pop.mp3', v: 0.28 },
    { at: STARTS[5], src: 'light/shimmer-sparkle-sweep.mp3', v: 0.16, dur: 50 },
    { at: STARTS[5] + 30, src: 'impact/impact-cine-big.mp3', v: 0.26 },
  ];
  return (
    <>
      {cues.map((c, i) => (
        <Sequence key={i} from={c.at} durationInFrames={c.dur ?? 50}>
          <Audio src={staticFile(`audio/${c.src}`)} volume={c.v} />
        </Sequence>
      ))}
    </>
  );
};

export const VideoReal: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: DARK }}>
      <Sequence from={0} durationInFrames={INTRO_DUR} name="intro">
        <Intro />
      </Sequence>
      {CLIPS.map((c, i) => (
        <Sequence key={c.src} from={STARTS[i]} durationInFrames={c.dur} name={`clip ${i + 1}`}>
          <ClipShot clip={c} index={i} />
        </Sequence>
      ))}
      <Sequence from={RTOTAL - OUTRO_DUR} durationInFrames={OUTRO_DUR} name="outro">
        <Outro />
      </Sequence>
      <Cues />
      <div style={{ position: 'absolute', left: 0, top: 0, height: 7, width: `${(frame / RTOTAL) * 100}%`, background: '#4C74F5' }} />
    </AbsoluteFill>
  );
};
