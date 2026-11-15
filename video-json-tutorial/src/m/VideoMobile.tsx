import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { M } from './ui';
import { MHook, MAppEmpty, MQuickActions, MImportSheet, MGemini, MPaste, MRows, MEnd } from './shots';

export const MSHOTS = {
  hook: { from: 0, dur: 70 },
  app: { from: 70, dur: 150 },
  actions: { from: 220, dur: 150 },
  sheet: { from: 370, dur: 190 },
  gemini: { from: 560, dur: 300 },
  paste: { from: 860, dur: 210 },
  rows: { from: 1070, dur: 240 },
  end: { from: 1310, dur: 120 },
} as const;

export const MTOTAL = 1430;

type Cue = { from: number; src: string; volume: number; dur?: number; note: string };

const CUES: Cue[] = [
  { from: 4, src: 'impact/impact-cine-big.mp3', volume: 0.4, note: 'hook plate' },
  { from: 30, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.14, dur: 55, note: 'hook underline' },
  { from: 70, src: 'transition/air-woosh-quick.mp3', volume: 0.24, note: 'into the app' },
  { from: 226, src: 'transition/air-woosh-quick.mp3', volume: 0.28, note: 'quick actions sheet' },
  { from: 316, src: 'ui/switch-tap.mp3', volume: 0.4, note: 'tap Import JSON' },
  { from: 373, src: 'transition/air-woosh-quick.mp3', volume: 0.3, note: 'import sheet' },
  { from: 520, src: 'ui/switch-tap.mp3', volume: 0.36, note: 'tap Open in AI' },
  { from: 560, src: 'transition/air-woosh-quick.mp3', volume: 0.26, note: 'Gemini opens' },
  { from: 608, src: 'text/typewriter-digital.mp3', volume: 0.14, dur: 200, note: 'JSON streams in' },
  { from: 826, src: 'ui/switch-tap.mp3', volume: 0.34, note: 'copy JSON' },
  { from: 860, src: 'transition/air-woosh-quick.mp3', volume: 0.26, note: 'back to the app' },
  { from: 872, src: 'text/typewriter-digital.mp3', volume: 0.13, dur: 120, note: 'paste' },
  { from: 998, src: 'ui/pop.mp3', volume: 0.3, note: 'preview unlocks' },
  { from: 1026, src: 'ui/switch-tap.mp3', volume: 0.38, note: 'tap Preview Extraction' },
  { from: 1088, src: 'ui/pop.mp3', volume: 0.36, note: 'row 1 lands' },
  { from: 1102, src: 'ui/pop.mp3', volume: 0.32, note: 'row 2 lands' },
  { from: 1116, src: 'ui/pop.mp3', volume: 0.28, note: 'row 3 lands' },
  { from: 1158, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.16, dur: 50, note: 'totals settle' },
  { from: 1316, src: 'impact/impact-cine-big.mp3', volume: 0.38, note: 'end plate' },
  { from: 1378, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.18, dur: 50, note: 'brand lockup' },
];

const MSfx: React.FC = () => (
  <>
    {CUES.map((c, i) => (
      <Sequence key={i} from={c.from} durationInFrames={c.dur ?? 50} name={`sfx ${c.note}`}>
        <Audio src={staticFile(`audio/${c.src}`)} volume={c.volume} />
      </Sequence>
    ))}
  </>
);

export const VideoMobile: React.FC = () => (
  <AbsoluteFill style={{ background: M.bg }}>
    <MSfx />
    <Sequence from={MSHOTS.hook.from} durationInFrames={MSHOTS.hook.dur} name="m1 hook">
      <MHook />
    </Sequence>
    <Sequence from={MSHOTS.app.from} durationInFrames={MSHOTS.app.dur} name="m2 app">
      <MAppEmpty />
    </Sequence>
    <Sequence from={MSHOTS.actions.from} durationInFrames={MSHOTS.actions.dur} name="m3 actions">
      <MQuickActions />
    </Sequence>
    <Sequence from={MSHOTS.sheet.from} durationInFrames={MSHOTS.sheet.dur} name="m4 sheet">
      <MImportSheet />
    </Sequence>
    <Sequence from={MSHOTS.gemini.from} durationInFrames={MSHOTS.gemini.dur} name="m5 gemini">
      <MGemini />
    </Sequence>
    <Sequence from={MSHOTS.paste.from} durationInFrames={MSHOTS.paste.dur} name="m6 paste">
      <MPaste />
    </Sequence>
    <Sequence from={MSHOTS.rows.from} durationInFrames={MSHOTS.rows.dur} name="m7 rows">
      <MRows />
    </Sequence>
    <Sequence from={MSHOTS.end.from} durationInFrames={MSHOTS.end.dur} name="m8 end">
      <MEnd />
    </Sequence>
  </AbsoluteFill>
);
