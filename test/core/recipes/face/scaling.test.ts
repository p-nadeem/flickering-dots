import { describe, expect, it } from 'vitest';

import { finalMarkFrame } from '../../../../src/core/one-shot';
import { FACE_VARIANTS, generateFace } from '../../../../src/core/recipes/face';
import type { Frame, GridSize } from '../../../../src/core/types';

import { changedCells, gridsBetween, mirrorFrame, mostBigChangesPerSecond, unroll } from './frame-tools';

const SMALLEST: GridSize = { cols: 10, rows: 6 };
const LARGEST: GridSize = { cols: 16, rows: 16 };
const READABLE = gridsBetween(SMALLEST, LARGEST);
const ALL = gridsBetween({ cols: 3, rows: 3 }, LARGEST);
const LOOPING = ['glance', 'sleepy', 'wide', 'read'];
const ONE_SHOT = ['happy', 'angry'];
const LAPS = 3;
const MAX_BIG_CHANGES_PER_SECOND = 6;
const MIN_HOLD_MS = 1200;
const EYES = 2;

function label({ cols, rows }: GridSize): string {
  return `${cols}x${rows}`;
}

function cases(variants: readonly string[], grids: readonly GridSize[]): [string, string, GridSize][] {
  return variants.flatMap((variant) =>
    grids.map((grid): [string, string, GridSize] => [variant, label(grid), grid]),
  );
}

function componentSizes(frame: Frame, { cols, rows }: GridSize): number[] {
  const seen = new Set<number>();
  const grow = (start: number): number => {
    const stack = [start];
    seen.add(start);
    let size = 0;
    while (stack.length > 0) {
      const index = stack.pop() ?? 0;
      size += 1;
      const x = index % cols;
      const neighbours = [x > 0 ? index - 1 : -1, x < cols - 1 ? index + 1 : -1, index - cols, index + cols];
      neighbours
        .filter((next) => next >= 0 && next < cols * rows && frame[next] === 1 && !seen.has(next))
        .forEach((next) => {
          seen.add(next);
          stack.push(next);
        });
    }
    return size;
  };
  return frame.flatMap((bit, index) => (bit === 1 && !seen.has(index) ? [grow(index)] : []));
}

describe('generateFace on every readable grid', () => {
  it.each(cases(FACE_VARIANTS, ALL))(
    '%s builds full-size frames without throwing on %s',
    (variant, _, grid) => {
      const { frames, durations } = generateFace(grid, { variant });
      expect(frames.length).toBeGreaterThan(0);
      expect(durations).toHaveLength(frames.length);
      frames.forEach((frame) => expect(frame).toHaveLength(grid.cols * grid.rows));
      durations.forEach((ms) => expect(Number.isInteger(ms) && ms > 0).toBe(true));
    },
  );

  it.each(cases(FACE_VARIANTS, READABLE))(
    '%s is deterministic and draws two equal whole eyes on %s',
    (variant, _, grid) => {
      const output = generateFace(grid, { variant, seed: 5 });
      expect(generateFace(grid, { variant, seed: 5 })).toEqual(output);
      output.frames.forEach((frame) => {
        const sizes = componentSizes(frame, grid);
        expect(sizes).toHaveLength(EYES);
        expect(sizes[0]).toBe(sizes[1]);
      });
    },
  );

  it.each(cases(LOOPING, READABLE))(
    '%s loops with a seam no bigger than its own steps on %s',
    (variant, _, grid) => {
      const { frames } = generateFace(grid, { variant });
      const steps = frames.slice(1).map((frame, index) => changedCells(frames[index], frame));
      const seam = changedCells(frames[frames.length - 1], frames[0]);
      expect(seam).toBeLessThanOrEqual(Math.max(...steps));
    },
  );

  it.each(cases(LOOPING, READABLE))(
    '%s changes 20 percent of the grid at most 6 times a second on %s',
    (variant, _, grid) => {
      expect(mostBigChangesPerSecond(unroll(generateFace(grid, { variant }), LAPS))).toBeLessThanOrEqual(
        MAX_BIG_CHANGES_PER_SECOND,
      );
    },
  );

  it.each(cases(ONE_SHOT, READABLE))(
    '%s stays within the flash limit when cut in from open eyes on %s',
    (variant, _, grid) => {
      const open = generateFace(grid, { variant: 'glance' }).frames[0];
      expect(mostBigChangesPerSecond(generateFace(grid, { variant }), open)).toBeLessThanOrEqual(
        MAX_BIG_CHANGES_PER_SECOND,
      );
    },
  );

  it.each(cases(ONE_SHOT, READABLE))(
    '%s ends on a held, mirror-symmetric mood that is its finished mark on %s',
    (variant, _, grid) => {
      const output = generateFace(grid, { variant });
      const last = output.frames.length - 1;
      expect(output.durations[last]).toBeGreaterThanOrEqual(MIN_HOLD_MS);
      expect(output.still).toBe(last);
      expect(mirrorFrame(output.frames[last], grid.cols)).toEqual(output.frames[last]);
      expect(finalMarkFrame({ ...grid, ...output })).toBe(last);
    },
  );

  it.each(READABLE.map((grid) => [label(grid), grid] as const))(
    'keeps the resting and sleepy eyes mirror-symmetric on %s',
    (_, grid) => {
      const glance = generateFace(grid, { variant: 'glance' }).frames;
      const sleepy = generateFace(grid, { variant: 'sleepy' }).frames;
      [glance[0], ...sleepy].forEach((frame) => expect(mirrorFrame(frame, grid.cols)).toEqual(frame));
      expect(glance[glance.length - 1]).toEqual(glance[0]);
    },
  );
});
