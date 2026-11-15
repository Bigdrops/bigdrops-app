import { Easing, interpolate, spring } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Normalised 0..1 progress across a local window. */
export function p(frame: number, start: number, dur: number, easing = Easing.out(Easing.cubic)) {
  return interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing });
}

export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOutBack = Easing.out(Easing.back(1.4));

/** Spring settle with a light overshoot for landing motion. */
export function land(frame: number, at: number, fps: number, damping = 16) {
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7, stiffness: 130 } });
}

export function fadeUp(frame: number, at: number, dur = 18, distance = 18) {
  const q = p(frame, at, dur);
  return { opacity: q, transform: `translateY(${(1 - q) * distance}px)` };
}

/** Deterministic pseudo-random, seeded — no Math.random anywhere. */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
