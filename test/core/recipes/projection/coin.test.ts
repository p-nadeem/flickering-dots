import { describe, expect, it } from 'vitest';

import { generateProjection } from '../../../../src/core/recipes/projection';

import { fromRows, litCount, toRows } from './clip-checks';

const GRID = { cols: 7, rows: 7 };
const HOLD_MS = 1500;
const EDGE_ON = ['...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...'];

const REST_7 = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
const MAX_TURN_MS = 1400;
const MAX_LAND_MS = 3200;

function contains(frame: readonly number[], part: readonly number[]): boolean {
  return part.every((bit, index) => bit === 0 || frame[index] === 1);
}

describe('projection coin', () => {
  it('draws the rim as a round circle with flat caps', () => {
    const { frames } = generateProjection(GRID, { variant: 'coin-rest' });

    expect(toRows(frames[0], GRID.cols)).toEqual(REST_7);
  });

  it('keeps the rim on the face frames and draws the glyph inside it on 7x7', () => {
    const { frames, still } = generateProjection(GRID, { variant: 'coin' });
    const rim = fromRows(REST_7);

    expect(still).toBe(0);
    [frames[0], frames[4]].forEach((face) => {
      expect(contains(face, rim)).toBe(true);
      expect(litCount(face)).toBeGreaterThan(litCount(rim));
    });
  });

  it('spins a turn in at most 1.4 s, the fastest the flash rule allows on 7x7', () => {
    const { durations } = generateProjection(GRID, { variant: 'coin' });

    expect(durations).toHaveLength(8);
    expect(durations.reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(MAX_TURN_MS);
  });

  it('lands on the check face inside the rim after two slowing turns in about 3 s and holds', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'coin', glyph: 'check' });
    const rest = generateProjection(GRID, { variant: 'coin-rest', glyph: 'check' }).frames[0];

    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(durations.slice(0, -1).reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(MAX_LAND_MS);
    expect(frames.at(-1)).toEqual(rest);
    expect(contains(rest, fromRows(REST_7))).toBe(true);
  });

  it('lands on the cross face, squeezes and settles', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'coin', glyph: 'cross' });
    const rest = generateProjection(GRID, { variant: 'coin-rest', glyph: 'cross' }).frames[0];

    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(durations.slice(0, -1).reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(MAX_LAND_MS + 400);
    expect(frames.at(-3)).toEqual(rest);
    expect(frames.at(-2)).not.toEqual(rest);
    expect(frames.at(-1)).toEqual(rest);
  });

  it('rests face-on and turns a quarter and back once every 4 s', () => {
    const { frames, durations, still } = generateProjection(GRID, { variant: 'coin-rest' });

    expect(durations.reduce((sum, ms) => sum + ms, 0)).toBe(4000);
    expect(still).toBe(0);
    expect(toRows(frames[2], GRID.cols)).toEqual(EDGE_ON);
  });

  it('puts a chosen glyph on the resting face', () => {
    const { frames } = generateProjection(GRID, { variant: 'coin-rest', glyph: 'plus' });

    expect(contains(frames[0], fromRows(REST_7))).toBe(true);
    expect(litCount(frames[0])).toBeGreaterThan(litCount(fromRows(REST_7)));
  });

  it('speeds up over three turns and freezes edge-on while deciding', () => {
    const { frames, durations } = generateProjection(GRID, { variant: 'coin-decide' });
    const turns = [0, 1, 2].map((turn) =>
      durations.slice(turn * 8, turn * 8 + 8).reduce((sum, ms) => sum + ms, 0),
    );

    expect(frames).toHaveLength(24);
    expect(turns[0]).toBeGreaterThan(turns[1]);
    expect(durations.at(-1)).toBe(HOLD_MS);
    expect(toRows(frames[23], GRID.cols)).toEqual(EDGE_ON);
  });

  it('draws the edge-on coin two dots wide on an even grid', () => {
    const { frames } = generateProjection({ cols: 8, rows: 8 }, { variant: 'coin' });

    expect(toRows(frames[2], 8).slice(1, 7)).toEqual(Array.from({ length: 6 }, () => '...##...'));
  });
});
