import React from 'react';
import { Composition } from 'remotion';
import { Video } from './Video';
import { FPS, SHOTS, TOTAL } from './timeline';
import { TitleShot } from './shots/01-title';
import { WhyShot } from './shots/02-why';
import { Step1Shot } from './shots/03-step1';
import { Step2Shot } from './shots/04-step2';
import { Step3Shot } from './shots/05-step3';
import { RowsShot } from './shots/06-rows';
import { ResultShot } from './shots/07-result';
import { RecapShot } from './shots/08-recap';
import { VideoMobile, MSHOTS, MTOTAL } from './m/VideoMobile';
import { MHook, MAppEmpty, MQuickActions, MImportSheet, MGemini, MPaste, MRows, MEnd } from './m/shots';
import { VideoReal, RTOTAL, RW, RH } from './m/VideoReal';

const MOBILE = { width: 1080, height: 1920, fps: FPS };

export const Root: React.FC = () => (
  <>
    <Composition id="InvoiceJsonTutorial" component={Video} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="s1-title" component={TitleShot} durationInFrames={SHOTS.title.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s2-why" component={WhyShot} durationInFrames={SHOTS.why.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s3-step1" component={Step1Shot} durationInFrames={SHOTS.step1.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s4-step2" component={Step2Shot} durationInFrames={SHOTS.step2.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s5-step3" component={Step3Shot} durationInFrames={SHOTS.step3.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s6-rows" component={RowsShot} durationInFrames={SHOTS.rows.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s7-result" component={ResultShot} durationInFrames={SHOTS.result.dur} fps={FPS} width={1920} height={1080} />
    <Composition id="s8-recap" component={RecapShot} durationInFrames={SHOTS.recap.dur} fps={FPS} width={1920} height={1080} />

    {/* Mobile: 1080x1920, the flow as it happens on a phone */}
    <Composition id="InvoiceJsonMobile" component={VideoMobile} durationInFrames={MTOTAL} {...MOBILE} />
    <Composition id="m1-hook" component={MHook} durationInFrames={MSHOTS.hook.dur} {...MOBILE} />
    <Composition id="m2-app" component={MAppEmpty} durationInFrames={MSHOTS.app.dur} {...MOBILE} />
    <Composition id="m3-actions" component={MQuickActions} durationInFrames={MSHOTS.actions.dur} {...MOBILE} />
    <Composition id="m4-sheet" component={MImportSheet} durationInFrames={MSHOTS.sheet.dur} {...MOBILE} />
    <Composition id="m5-gemini" component={MGemini} durationInFrames={MSHOTS.gemini.dur} {...MOBILE} />
    <Composition id="m6-paste" component={MPaste} durationInFrames={MSHOTS.paste.dur} {...MOBILE} />
    <Composition id="m7-rows" component={MRows} durationInFrames={MSHOTS.rows.dur} {...MOBILE} />
    <Composition id="m8-end" component={MEnd} durationInFrames={MSHOTS.end.dur} {...MOBILE} />

    {/* Mobile, cut from the real screen recording: 1080x2400 */}
    <Composition id="InvoiceJsonMobileReal" component={VideoReal} durationInFrames={RTOTAL} fps={FPS} width={RW} height={RH} />
  </>
);
