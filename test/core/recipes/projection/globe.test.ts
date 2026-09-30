import { describe, expect, it } from 'vitest';

import { generateProjection } from '../../../../src/core/recipes/projection';

import { changedCells, toRows } from './clip-checks';

const GRID = { cols: 11, rows: 11 };
const PERIOD_FRAMES = 7;
const RIDER_PERIODS = 4;
const HOLD_MS = 1500;

describe('projection globe', () => {
  it('slides four meridians and the equator over 7 frames per meridian spacing at 110 ms on 11x11', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'globe' });

    expect(frames).toHaveLength(PERIOD_FRAMES * RIDER_PERIODS);
    expect(new Set(durations)).toEqual(new Set([110]));
    expect(toRows(frames[0], GRID.cols)).toEqual([
      '...#####...',
      '..#..#..#..',
      '.#.#.#.#.#.',
      '#.#..#..#.#',
      '#.#..#..#.#',
      '#.#..#..#.#',
      '#.#..#..#.#',
      '#.#######.#',
      '.#...#...#.',
      '..#..#..#..',
      '...#####...',
    ]);
  });

  it('shows the equator rider as a lit dot between two gaps on every other frame', () => {
    const { frames } = generateProjection(GRID, { variant: 'globe' });

    expect(toRows(frames[10], GRID.cols)).toEqual([
      '...#####...',
      '..#.....#..',
      '.#..#.#..#.',
      '#...#.##..#',
      '#...#..#..#',
      '##.#...#..#',
      '#.##...##.#',
      '#..###.#..#',
      '.#.##..#.#.',
      '..#.....#..',
      '...#####...',
    ]);
    expect(changedCells(frames[10], frames[10 + PERIOD_FRAMES])).toBeGreaterThan(0);
    expect(frames[PERIOD_FRAMES]).toEqual(frames[0]);
  });

  it('holds a still globe when frames is 1', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'globe', frames: 1 });

    expect(durations).toEqual([1000]);
    expect(frames).toEqual([generateProjection(GRID, { variant: 'globe' }).frames[0]]);
  });

  it('steps the bare rim between its radius and one dot in at 300 ms while listening', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'globe-listen' });

    expect(durations).toEqual([300, 300]);
    expect(frames.map((frame) => toRows(frame, GRID.cols))).toEqual([
      [
        '...#####...',
        '..#.....#..',
        '.#.......#.',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '#.........#',
        '.#.......#.',
        '..#.....#..',
        '...#####...',
      ],
      [
        '...........',
        '....###....',
        '...#...#...',
        '..#.....#..',
        '.#.......#.',
        '.#.......#.',
        '.#.......#.',
        '..#.....#..',
        '...#...#...',
        '....###....',
        '...........',
      ],
    ]);
  });

  it('removes the meridians one per 120 ms and draws a check inside the rim', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'globe-settle' });

    expect(durations).toEqual([120, 120, 120, 120, 120, 45, 45, 45, 45, HOLD_MS]);
    expect(toRows(frames[9], GRID.cols)).toEqual([
      '...#####...',
      '..#.....#..',
      '.#.......#.',
      '#.........#',
      '#......#..#',
      '#.....#...#',
      '#..#.#....#',
      '#...#.....#',
      '.#.......#.',
      '..#.....#..',
      '...#####...',
    ]);
  });

  it('tears a wide gap, lets the lines fall and draws a cross inside the torn rim', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'globe-break' });
    const idle = generateProjection(GRID, { variant: 'globe', frames: 1 }).frames[0];
    const rim = generateProjection(GRID, { variant: 'globe-listen' }).frames[0];
    const last = frames[frames.length - 1];
    const torn = rim.filter((bit, index) => bit === 1 && last[index] === 0).length;

    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(torn).toBeGreaterThanOrEqual(5);
    expect(toRows(last, GRID.cols).slice(3, 8)).toEqual([
      '#..#...#...',
      '#...#.#....',
      '#....#....#',
      '#...#.#...#',
      '#..#...#..#',
    ]);
    expect(changedCells(last, idle)).toBeGreaterThan(20);
    frames
      .slice(1)
      .forEach((frame, index) => expect(changedCells(frames[index], frame)).toBeLessThan(0.2 * 121));
  });

  it('draws three meridians and no equator below 11 dots', () => {
    const small = generateProjection({ cols: 9, rows: 9 }, { variant: 'globe', frames: 1 }).frames[0];

    expect(toRows(small, 9)).toEqual([
      '...###...',
      '..#.#.#..',
      '.##.#.##.',
      '#...#...#',
      '##..#..##',
      '#...#...#',
      '.#..#..#.',
      '..#.#.#..',
      '...###...',
    ]);
  });
});
