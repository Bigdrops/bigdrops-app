import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { SHOTS } from './timeline';
import { C } from './theme';
import { TitleShot } from './shots/01-title';
import { WhyShot } from './shots/02-why';
import { Step1Shot } from './shots/03-step1';
import { Step2Shot } from './shots/04-step2';
import { Step3Shot } from './shots/05-step3';
import { RowsShot } from './shots/06-rows';
import { ResultShot } from './shots/07-result';
import { RecapShot } from './shots/08-recap';

type Cue = { from: number; src: string; volume: number; dur?: number; note: string };

const SFX: Cue[] = [
  { from: 8, src: 'impact/impact-cine-big.mp3', volume: 0.45, note: 'title plate lands' },
  { from: 30, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.16, dur: 60, note: 'title sparkle under the payload card' },
  { from: SHOTS.why.from + 2, src: 'transition/air-woosh-quick.mp3', volume: 0.26, note: 'cut into the manual-entry problem' },
  { from: SHOTS.why.from + 20, src: 'text/typewriter-digital.mp3', volume: 0.16, dur: 110, note: 'rows typing themselves' },
  { from: SHOTS.step1.from + 26, src: 'ui/switch-tap.mp3', volume: 0.42, note: 'click on Import JSON' },
  { from: SHOTS.step1.from + 58, src: 'transition/air-woosh-quick.mp3', volume: 0.32, note: 'import sheet slides in' },
  { from: SHOTS.step2.from + 116, src: 'ui/switch-tap.mp3', volume: 0.36, note: 'Open in AI dropdown' },
  { from: SHOTS.step2.from + 150, src: 'ui/pop.mp3', volume: 0.34, note: 'prompt copied' },
  { from: SHOTS.step3.from + 12, src: 'text/typewriter-digital.mp3', volume: 0.15, dur: 150, note: 'JSON pasted / typed' },
  { from: SHOTS.step3.from + 176, src: 'data/data-scan.mp3', volume: 0.3, note: 'schema validation passes' },
  ...Array.from({ length: 8 }, (_, i) => ({
    from: SHOTS.rows.from + 22 + i * 13,
    src: 'ui/pop.mp3',
    volume: Math.max(0.2, 0.4 - i * 0.025),
    note: `row ${i + 1} lands`,
  })),
  { from: SHOTS.rows.from + 120, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.18, dur: 60, note: 'totals settle' },
  { from: SHOTS.result.from + 2, src: 'transition/air-woosh-quick.mp3', volume: 0.26, note: 'cut to the finished invoice' },
  { from: SHOTS.recap.from + 6, src: 'impact/impact-cine-big.mp3', volume: 0.4, note: 'recap plate' },
  { from: SHOTS.recap.from + 120, src: 'light/shimmer-sparkle-sweep.mp3', volume: 0.2, dur: 70, note: 'brand lockup' },
];

const Sfx: React.FC = () => (
  <>
    {SFX.map((cue, i) => (
      <Sequence key={i} from={cue.from} durationInFrames={cue.dur ?? 60} name={`sfx ${cue.note}`}>
        <Audio src={staticFile(`audio/${cue.src}`)} volume={cue.volume} />
      </Sequence>
    ))}
  </>
);

export const Video: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sfx />
    <Sequence from={SHOTS.title.from} durationInFrames={SHOTS.title.dur} name="01 title">
      <TitleShot />
    </Sequence>
    <Sequence from={SHOTS.why.from} durationInFrames={SHOTS.why.dur} name="02 why">
      <WhyShot />
    </Sequence>
    <Sequence from={SHOTS.step1.from} durationInFrames={SHOTS.step1.dur} name="03 step 1">
      <Step1Shot />
    </Sequence>
    <Sequence from={SHOTS.step2.from} durationInFrames={SHOTS.step2.dur} name="04 step 2">
      <Step2Shot />
    </Sequence>
    <Sequence from={SHOTS.step3.from} durationInFrames={SHOTS.step3.dur} name="05 step 3">
      <Step3Shot />
    </Sequence>
    <Sequence from={SHOTS.rows.from} durationInFrames={SHOTS.rows.dur} name="06 rows land">
      <RowsShot />
    </Sequence>
    <Sequence from={SHOTS.result.from} durationInFrames={SHOTS.result.dur} name="07 result">
      <ResultShot />
    </Sequence>
    <Sequence from={SHOTS.recap.from} durationInFrames={SHOTS.recap.dur} name="08 recap">
      <RecapShot />
    </Sequence>
  </AbsoluteFill>
);
