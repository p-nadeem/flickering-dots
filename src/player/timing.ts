import { DEFAULT_FRAME_MS } from '../core/constants';
import type { Clip } from '../core/types';

export const MIN_FRAME_MS = 16;

const ERROR_PREFIX = 'flickering-dots player';

function isUsableDuration(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getFrameMs(durations: readonly number[], index: number, speed: number): number {
  const stored = durations[index];
  const duration = isUsableDuration(stored) ? stored : DEFAULT_FRAME_MS;
  return Math.max(MIN_FRAME_MS, duration / speed);
}

export function assertSpeed(speed: number): number {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(`${ERROR_PREFIX}: speed must be a positive number, got ${String(speed)}`);
  }
  return speed;
}

export function toFrameIndex(index: number, frameCount: number): number {
  if (!Number.isFinite(index)) {
    throw new Error(`${ERROR_PREFIX}: frame index must be a finite number, got ${String(index)}`);
  }
  return Math.min(frameCount - 1, Math.max(0, Math.trunc(index)));
}

export function assertClip(clip: Clip): Clip {
  if (clip.frames.length === 0) {
    throw new Error(`${ERROR_PREFIX}: clip has no frames`);
  }
  return clip;
}
