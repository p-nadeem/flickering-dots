import { createRng } from '../../rng';
import type { GridSize } from '../../types';

const SKY_ROWS = 2;
const LUMP_SPREAD = 3;
const LUMP_OFFSET = 1;

/** The tallest drift the progress and settle variants draw: all but the top two rows. */
export function getDriftCeiling({ rows }: GridSize): number {
  return Math.max(1, rows - SKY_ROWS);
}

function getLumps(cols: number, seed: number): number[] {
  const random = createRng(seed);
  return Array.from({ length: cols }, () => Math.floor(random() * LUMP_SPREAD) - LUMP_OFFSET);
}

/** Column heights of a lumpy drift at `progress` (0 to 1): flat and empty at 0, flat at the ceiling at 1, seeded lumps between. */
export function getDriftProfile(grid: GridSize, seed: number, progress: number): number[] {
  const ceiling = getDriftCeiling(grid);
  const lumpScale = Math.sin(Math.PI * progress);
  return getLumps(grid.cols, seed).map((lump) =>
    Math.min(ceiling, Math.max(0, Math.round(progress * ceiling + lump * lumpScale))),
  );
}

/** Moves each column one step toward its target, only on columns whose parity matches the tick. */
export function stepToward(heights: readonly number[], targets: readonly number[], tick: number): number[] {
  return heights.map((height, x) => {
    if ((x + tick) % 2 !== 0) return height;
    return height + Math.sign(targets[x] - height);
  });
}
