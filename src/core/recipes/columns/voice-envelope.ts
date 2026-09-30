import { createRng } from '../../rng';
import { TAU } from './shared';

const HARMONIC_WEIGHTS = [0.3, 0.2, 0.15] as const;
const ENVELOPE_CENTRE = 0.55;
const ENVELOPE_FLOOR = 0.15;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A seeded voice-like loudness per frame in [0.15, 1] that loops seamlessly over `frameCount` frames. */
export function voiceEnvelope(frameCount: number, seed: number): number[] {
  const random = createRng(seed);
  const phases = HARMONIC_WEIGHTS.map(() => random() * TAU);
  return Array.from({ length: frameCount }, (_, frame) => {
    const wave = HARMONIC_WEIGHTS.reduce(
      (total, weight, index) =>
        total + weight * Math.sin((TAU * (index + 1) * frame) / frameCount + phases[index]),
      0,
    );
    return clamp(ENVELOPE_CENTRE + wave, ENVELOPE_FLOOR, 1);
  });
}
