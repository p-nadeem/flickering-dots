import { describe, expect, it } from 'vitest';

import type { RecipeOutput } from '../../../../src/core/recipes';
import { generateParticles } from '../../../../src/core/recipes/particles';
import type { Frame, GridSize, RecipeParams } from '../../../../src/core/types';

import { digest, sampleGrids } from './clip-checks';

const GRID: GridSize = { cols: 10, rows: 10 };
const FLIES = 16;
const TICK_MS = 50;
const SYNC_EARLIEST = 110;
const SYNC_LATEST = 150;
const UNISON_FLASHES = 4;
const MIN_SIDE = 6;
const FLASH_MS = 150;
const FIRST_SYNC_MS = 200;
const HOLD_MS = 1500;

const PINS: readonly (readonly [string, RecipeParams, string])[] = [
  ['fireflies', { variant: 'fireflies' }, '78:501e4df2'],
  ['free fireflies', { variant: 'fireflies', density: 0 }, '10:f2597a6a'],
  ['fireflies-beat', { variant: 'fireflies-beat' }, '2:9299be79'],
  ['fireflies-sync', { variant: 'fireflies-sync' }, '8:565d14d5'],
  ['fireflies-scatter', { variant: 'fireflies-scatter' }, '17:1e58f92d'],
];

function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}

function flyCount({ cols, rows }: GridSize): number {
  return Math.max(6, Math.round(0.16 * cols * rows));
}

function unisonTicks({ frames, durations }: RecipeOutput, flies: number): number[] {
  const starts = durations.reduce<number[]>((all, ms) => [...all, all[all.length - 1] + ms], [0]);
  return frames.flatMap((frame, index) => (countLit(frame) === flies ? [starts[index] / TICK_MS] : []));
}

function litCells(output: RecipeOutput): Set<number> {
  return new Set(output.frames.flatMap((frame) => frame.flatMap((bit, index) => (bit === 1 ? [index] : []))));
}

describe('particles fireflies variants', () => {
  it.each(PINS)('keeps the exact %s frames on the 10x10 grid', (_, params, pin) => {
    expect(digest(generateParticles(GRID, params))).toBe(pin);
  });

  it.each(sampleGrids(MIN_SIDE).map((grid) => [`${grid.cols}x${grid.rows}`, grid] as const))(
    'first syncs between tick 110 and 150, then flashes in unison 3 more times on %s',
    (_, grid) => {
      const ticks = unisonTicks(generateParticles(grid, { variant: 'fireflies' }), flyCount(grid));
      expect(ticks[0]).toBeGreaterThanOrEqual(SYNC_EARLIEST);
      expect(ticks[0]).toBeLessThanOrEqual(SYNC_LATEST);
      expect(ticks).toHaveLength(UNISON_FLASHES);
    },
  );

  it('blinks half the swarm freely once a second without ever syncing at density 0', () => {
    const output = generateParticles(GRID, { variant: 'fireflies', density: 0 });
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(1000);
    expect(litCells(output).size).toBe(FLIES / 2);
    expect(Math.max(...output.frames.map(countLit))).toBeLessThan(FLIES / 2);
  });

  it('beats the whole swarm together every 1.5 s', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'fireflies-beat' });
    expect(frames.map(countLit)).toEqual([FLIES, 0]);
    expect(durations).toEqual([150, 1350]);
  });

  it('syncs at once, flashes 3 times and holds every firefly lit', () => {
    const { frames, durations } = generateParticles(GRID, { variant: 'fireflies-sync' });
    expect(frames.slice(1).map(countLit)).toEqual([FLIES, 0, FLIES, 0, FLIES, 0, FLIES]);
    expect(durations[0]).toBeLessThanOrEqual(FIRST_SYNC_MS);
    expect(durations[durations.length - 1]).toBe(400);
  });

  it('flashes all together, then loses fireflies flash by flash and holds the last one', () => {
    const output = generateParticles(GRID, { variant: 'fireflies-scatter' });
    const lit = output.frames.map(countLit);
    const flashes = lit.filter((count) => count > 0);
    expect(lit[0]).toBe(FLIES);
    flashes.slice(1).forEach((count, index) => expect(count).toBeLessThan(flashes[index]));
    expect(lit[lit.length - 1]).toBe(1);
    expect(output.durations[output.durations.length - 1]).toBe(HOLD_MS);
    expect(lit[output.still ?? 0]).toBe(FLIES / 2);
  });

  it('spaces the fireflies so no two touch, even diagonally', () => {
    const cells = [...litCells(generateParticles(GRID, { variant: 'fireflies' }))].map(
      (index): [number, number] => [index % GRID.cols, Math.floor(index / GRID.cols)],
    );
    cells.forEach(([x, y], index) =>
      cells
        .slice(index + 1)
        .forEach(([ox, oy]) => expect(Math.max(Math.abs(x - ox), Math.abs(y - oy))).toBeGreaterThan(1)),
    );
  });

  it('keeps each free blink lit for at least 150 ms', () => {
    const output = generateParticles(GRID, { variant: 'fireflies', density: 0 });
    const frames = [...output.frames, ...output.frames];
    const durations = [...output.durations, ...output.durations];
    [...litCells(output)].forEach((cell) => {
      const runs = frames.reduce<{ ms: number; open: boolean; from: number }[]>((all, frame, index) => {
        const last = all[all.length - 1];
        if (frame[cell] !== 1) return last?.open ? [...all.slice(0, -1), { ...last, open: false }] : all;
        if (last?.open) return [...all.slice(0, -1), { ...last, ms: last.ms + durations[index] }];
        return [...all, { ms: durations[index], open: true, from: index }];
      }, []);
      runs
        .filter((run) => run.from > 0 && !run.open)
        .forEach((run) => expect(run.ms).toBeGreaterThanOrEqual(FLASH_MS));
    });
  });

  it('keeps the same fireflies in every variant', () => {
    const swarm = litCells(generateParticles(GRID, { variant: 'fireflies' }));
    const variants = ['fireflies-beat', 'fireflies-sync', 'fireflies-scatter'];
    expect(swarm.size).toBe(FLIES);
    variants.forEach((variant) => {
      expect(litCells(generateParticles(GRID, { variant }))).toEqual(swarm);
    });
  });
});
