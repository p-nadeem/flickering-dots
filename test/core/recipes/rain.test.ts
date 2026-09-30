import { describe, expect, it } from 'vitest';

import { RAIN_DEFAULTS, generateRain } from '../../../src/core/recipes/rain';
import type { Frame, GridSize, RecipeParams } from '../../../src/core/types';

import { countLit, toOutputText } from './frame-text';

const FRAME_MS = 75;
const MAX_FLASHES_PER_SECOND = 3;
const MS_PER_SECOND = 1000;
const PRESET_GRID: GridSize = { cols: 8, rows: 8 };
const SHAPE_GRIDS: readonly GridSize[] = [
  { cols: 3, rows: 3 },
  { cols: 5, rows: 5 },
  { cols: 8, rows: 8 },
  { cols: 12, rows: 5 },
  { cols: 4, rows: 12 },
  { cols: 16, rows: 16 },
];
const SEEDS: readonly number[] = [1, 2, 7, 23, 99];

function getCycle(grid: GridSize, length: number = RAIN_DEFAULTS.length): number {
  return grid.rows + length + 1;
}

function getColumn(frame: Frame, grid: GridSize, x: number): string {
  return Array.from({ length: grid.rows }, (_, y) => String(frame[y * grid.cols + x])).join('');
}

function getColumnTrack(frames: readonly Frame[], grid: GridSize, x: number): string[] {
  return frames.map((frame) => getColumn(frame, grid, x));
}

function getRunLengths(track: readonly string[]): number[] {
  const starts = track.flatMap((column, index) =>
    index === 0 || column !== track[index - 1] ? [index] : [],
  );
  return starts
    .slice(1, -1)
    .flatMap((start, index) => (track[start].includes('1') ? [starts[index + 2] - start] : []));
}

function getLitRows(column: string): number[] {
  return [...column].flatMap((bit, y) => (bit === '1' ? [y] : []));
}

function isContiguous(rows: readonly number[]): boolean {
  return rows.every((row, index) => index === 0 || row === rows[index - 1] + 1);
}

function getRunLengthSets(grid: GridSize, params: RecipeParams): number[][] {
  const { frames } = generateRain(grid, { ...params, frames: 4 * getCycle(grid) });
  return Array.from({ length: grid.cols }, (_, x) => [
    ...new Set(getRunLengths(getColumnTrack(frames, grid, x))),
  ]);
}

function getSpeeds(grid: GridSize, params: RecipeParams): number[] {
  return getRunLengthSets(grid, params).map(([speed]) => speed);
}

function isLitAt(frame: Frame, grid: GridSize, x: number, y: number): boolean {
  return frame[y * grid.cols + x] === 1;
}

function countBlocks(frame: Frame, grid: GridSize): number {
  const corners = Array.from({ length: (grid.cols - 1) * (grid.rows - 1) }, (_, index) => ({
    x: index % (grid.cols - 1),
    y: Math.floor(index / (grid.cols - 1)),
  }));
  return corners.filter(({ x, y }) =>
    [0, 1].every((dx) => [0, 1].every((dy) => isLitAt(frame, grid, x + dx, y + dy))),
  ).length;
}

function countRowsOfThree(frame: Frame, grid: GridSize): number {
  const starts = Array.from({ length: Math.max(0, grid.cols - 2) * grid.rows }, (_, index) => ({
    x: index % (grid.cols - 2),
    y: Math.floor(index / (grid.cols - 2)),
  }));
  return starts.filter(({ x, y }) => [0, 1, 2].every((dx) => isLitAt(frame, grid, x + dx, y))).length;
}

function forEachCase(check: (grid: GridSize, seed: number) => void): void {
  SHAPE_GRIDS.forEach((grid) => SEEDS.forEach((seed) => check(grid, seed)));
}

describe('generateRain', () => {
  it('draws the approved 5x5 frames with default params', () => {
    expect(toOutputText(generateRain({ cols: 5, rows: 5 }, {}), 5)).toEqual({
      frames: [
        '10010 00010 00000 00001 01001',
        '10000 10010 00010 00000 00001',
        '00000 10010 10010 00000 00000',
        '01000 00000 10010 10010 00000',
        '01101 01000 00010 10010 10000',
        '00101 01001 01000 00010 10010',
        '00100 00101 01001 01010 00010',
        '00100 00100 00001 01001 01010',
        '10000 00100 00100 00001 01011',
        '10000 10100 00100 00000 00001',
        '00000 10000 10100 00100 00000',
        '01000 00000 10100 10100 00000',
        '01001 01000 00000 10100 10100',
        '00011 01001 01000 00100 10100',
        '00010 00001 01001 01000 00100',
        '00010 00010 00001 01001 01100',
      ],
      durations: [75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75],
    });
  });

  it('draws the approved 8x8 preset frames with default params', () => {
    expect(toOutputText(generateRain(PRESET_GRID, {}), PRESET_GRID.cols).frames).toEqual([
      '00010000 00001000 01001000 01000000 00000010 00100010 00100101 00000101',
      '10010000 00010000 00001000 01001000 01000000 00000010 00100010 00100101',
      '10010000 10010000 00000000 00001000 01001000 01000000 00100010 00100011',
      '00000000 10010000 10010000 00000000 00001000 01001000 01000000 00100010',
      '00000100 00010000 10010000 10000000 00000000 00001000 01001000 01100000',
      '00000100 00000100 00010000 10010000 10000000 00000000 00001000 01001000',
      '00000010 00000100 00010100 00010000 10000000 10000000 00000000 00001000',
      '00000011 00000010 00000100 00010100 00010000 10000000 10000000 00000000',
      '01000001 00000010 00000010 00010100 00010100 00000000 10000000 10000000',
      '01101001 01000001 00000010 00000010 00010100 00010100 00000000 10000000',
      '00101001 01001001 01000000 00000010 00010010 00010100 00000100 00000000',
      '00100000 00101001 01001001 01000000 00000010 00010010 00010100 00000100',
      '10100000 00100001 00001001 01001000 01000000 00010010 00010010 00000100',
      '10000000 10100000 00100001 00001001 01001000 01000000 00010010 00010010',
      '00000000 10100000 10100001 00000001 00001000 01001000 01010000 00010010',
      '00000100 00000000 10100000 10100001 00000001 00001000 01001000 01010000',
      '00000100 00000100 00100000 10100001 10000001 00000000 00001000 01011000',
      '00000010 00000100 00000100 00100000 10100001 10000001 00000000 00001000',
      '00000010 00000010 00000100 00100100 00100001 10000001 10000000 00000000',
      '01000000 00000010 00000010 00000100 00100100 00100001 10000001 10000000',
      '01001000 01000000 00000010 00000010 00100100 00100101 00000001 10000000',
      '00011000 01001000 01000000 00000010 00000010 00100100 00100101 00000001',
    ]);
  });

  it('uses twice the column cycle as the default loop and the documented defaults', () => {
    expect(RAIN_DEFAULTS).toEqual({ seed: 7, length: 2, density: 1 });
    const output = generateRain({ cols: 5, rows: 9 }, {});
    expect(output.frames).toHaveLength(2 * getCycle({ cols: 5, rows: 9 }));
    expect(output.durations.every((duration) => duration === FRAME_MS)).toBe(true);
    expect(generateRain({ cols: 5, rows: 9 }, { frames: 0, length: 0 })).toEqual(
      generateRain({ cols: 5, rows: 9 }, RAIN_DEFAULTS),
    );
  });

  it('honours an explicit frame count', () => {
    expect(generateRain(PRESET_GRID, { frames: 5 }).frames).toHaveLength(5);
  });

  it('loops seamlessly: the frame after the loop is the first frame again', () => {
    forEachCase((grid, seed) => {
      const loop = 2 * getCycle(grid);
      const { frames } = generateRain(grid, { seed, frames: 2 * loop });
      expect(frames.slice(loop)).toEqual(frames.slice(0, loop));
    });
  });

  it('rains in every column by default', () => {
    forEachCase((grid, seed) => {
      const { frames } = generateRain(grid, { seed });
      Array.from({ length: grid.cols }, (_, x) =>
        expect(getColumnTrack(frames, grid, x).some((column) => column.includes('1'))).toBe(true),
      );
    });
  });

  it('draws one straight streak per column, never longer than length', () => {
    forEachCase((grid, seed) => {
      const { frames } = generateRain(grid, { seed });
      frames.forEach((frame) =>
        Array.from({ length: grid.cols }, (_, x) => {
          const rows = getLitRows(getColumn(frame, grid, x));
          expect(rows.length).toBeLessThanOrEqual(RAIN_DEFAULTS.length);
          expect(isContiguous(rows)).toBe(true);
        }),
      );
    });
  });

  it('moves each column at one row per frame or one row per two frames', () => {
    forEachCase((grid, seed) =>
      getRunLengthSets(grid, { seed }).forEach((runs) => expect([[1], [2]]).toContainEqual(runs)),
    );
  });

  it('mixes both speeds on every grid with two or more columns', () => {
    forEachCase((grid, seed) => expect(new Set(getSpeeds(grid, { seed })).size).toBe(2));
  });

  it('never moves neighbouring columns of the same speed side by side', () => {
    forEachCase((grid, seed) => {
      const { frames } = generateRain(grid, { seed });
      const speeds = getSpeeds(grid, { seed });
      speeds.slice(1).forEach((speed, index) => {
        if (speed !== speeds[index]) return;
        frames.forEach((frame) => {
          const left = getLitRows(getColumn(frame, grid, index));
          const right = getLitRows(getColumn(frame, grid, index + 1));
          expect(left.filter((row) => right.includes(row))).toEqual([]);
        });
      });
    });
  });

  it('never draws a doubled drop as a 2x2 block or a row of three', () => {
    forEachCase((grid, seed) =>
      generateRain(grid, { seed }).frames.forEach((frame) => {
        expect(countBlocks(frame, grid)).toBe(0);
        expect(countRowsOfThree(frame, grid)).toBe(0);
      }),
    );
  });

  it.each(SEEDS)(
    'never lights exactly the same rows in two neighbouring columns on 8x8 with seed %i',
    (seed) => {
      const grid = PRESET_GRID;
      generateRain(grid, { seed }).frames.forEach((frame) => {
        Array.from({ length: grid.cols - 1 }, (_, x) => x).forEach((x) => {
          const left = getColumn(frame, grid, x);
          if (left.includes('1')) expect(getColumn(frame, grid, x + 1)).not.toBe(left);
        });
      });
    },
  );

  it('lets neighbouring columns share a lit row in at most two frames per loop on the 8x8 preset', () => {
    const { frames } = generateRain(PRESET_GRID, {});
    Array.from({ length: PRESET_GRID.cols - 1 }, (_, x) => x).forEach((x) => {
      const shared = frames.filter((frame) =>
        Array.from({ length: PRESET_GRID.rows }, (_, y) => y).some(
          (y) => isLitAt(frame, PRESET_GRID, x, y) && isLitAt(frame, PRESET_GRID, x + 1, y),
        ),
      );
      expect(shared.length).toBeLessThanOrEqual(2);
    });
  });

  it('never moves two columns in lockstep', () => {
    forEachCase((grid, seed) => {
      const { frames } = generateRain(grid, { seed });
      const tracks = Array.from({ length: grid.cols }, (_, x) => getColumnTrack(frames, grid, x).join(' '));
      expect(new Set(tracks).size).toBe(grid.cols);
    });
  });

  it('draws a single column and a single row without failing', () => {
    expect(generateRain({ cols: 1, rows: 6 }, {}).frames).toHaveLength(2 * getCycle({ cols: 1, rows: 6 }));
    expect(generateRain({ cols: 6, rows: 1 }, { length: 3 }).frames).toHaveLength(
      2 * getCycle({ cols: 6, rows: 1 }, 3),
    );
  });

  it('keeps every cell under three flashes per second', () => {
    forEachCase((grid, seed) => {
      const { frames, durations } = generateRain(grid, { seed });
      const loopMs = durations.reduce((total, duration) => total + duration, 0);
      Array.from({ length: grid.cols * grid.rows }, (_, cell) => {
        const onsets = frames.filter(
          (frame, index) =>
            frame[cell] === 1 && frames[(index + frames.length - 1) % frames.length][cell] === 0,
        ).length;
        expect((onsets * MS_PER_SECOND) / loopMs).toBeLessThanOrEqual(MAX_FLASHES_PER_SECOND);
      });
    });
  });

  it('keeps the same frames for the same seed and changes them for another seed', () => {
    expect(generateRain(PRESET_GRID, { seed: 4 })).toEqual(generateRain(PRESET_GRID, { seed: 4 }));
    expect(generateRain(PRESET_GRID, { seed: 4 })).not.toEqual(generateRain(PRESET_GRID, { seed: 5 }));
  });

  it('stays dark at zero density', () => {
    expect(
      generateRain({ cols: 6, rows: 6 }, { density: 0 }).frames.every((frame) => countLit(frame) === 0),
    ).toBe(true);
  });
});
