import { describe, expect, it } from 'vitest';

import { generateTrace } from '../../../../src/core/recipes/trace';
import type { Frame, GridSize } from '../../../../src/core/types';

import { RECTANGLES, chebyshev, countLit, gridName, litCells, squaresFrom, toRows } from './checks';
import type { Cell } from './checks';

const ORRERY: GridSize = { cols: 13, rows: 13 };
const FRAME_MS = 60;
const LOOP = 120;
const HOLD_MS = 1500;
const CENTRE = 6;

function text(frame: Frame, grid: GridSize): string {
  return toRows(frame, grid.cols).join(' ');
}

function framesAsText(variant: string, grid: GridSize, extra: Record<string, number> = {}): string[] {
  return generateTrace(grid, { variant, ...extra }).frames.map((frame) => text(frame, grid));
}

function isSunLit(frame: Frame, grid: GridSize): boolean {
  return frame[CENTRE * grid.cols + CENTRE] === 1;
}

describe('trace orrery', () => {
  it('keeps the approved opening of the 13x13 thinking orrery', () => {
    expect(framesAsText('orrery', ORRERY).slice(0, 6)).toEqual([
      '............. ............. .....##.#.... ............. ............. ............. ......#...... ............. ......##..... ............. ............. ............. .............',
      '............. ............. .....##...... ........#.... ............. ............. ......#...... ............. .....##...... ............. ............. ............. .............',
      '............. ............. ......##..... .........#... ............. ............. ......#...... ............. .....##...... ............. ............. ............. .............',
      '............. ............. ......##..... ............. .........#... ............. ......#...... .....#....... .....#....... ............. ............. ............. .............',
      '............. ............. .......##.... ............. .........#... ............. ......#...... ....##....... ............. ............. ............. ............. .............',
      '............. ............. ........#.... ........#.... .........#... ............. ......#...... ....##....... ............. ............. ............. ............. .............',
    ]);
  });

  it('loops 120 frames at 60 ms with the sun always lit', () => {
    const { frames, durations } = generateTrace(ORRERY, { variant: 'orrery' });

    expect(frames).toHaveLength(LOOP);
    expect(durations).toEqual(frames.map(() => FRAME_MS));
    expect(frames.every((frame) => isSunLit(frame, ORRERY))).toBe(true);
  });

  it('stretches the same motion over more frames for a slower idle', () => {
    const normal = generateTrace(ORRERY, { variant: 'orrery', length: 2 }).frames;
    const slow = generateTrace(ORRERY, { variant: 'orrery', length: 2, frames: 2 * LOOP }).frames;

    expect(slow).toHaveLength(2 * LOOP);
    expect(slow.filter((_, index) => index % 2 === 0)).toEqual(normal);
  });

  it('drops the moon for two bodies and the inner planet for one', () => {
    const lit = (length: number): number =>
      countLit(generateTrace(ORRERY, { variant: 'orrery', length }).frames[0]);

    expect(lit(3) - lit(2)).toBe(1);
    expect(lit(2) - lit(1)).toBe(2);
  });

  it('shows one planet and its moon on 7x7', () => {
    expect(framesAsText('orrery', { cols: 7, rows: 7 })[0]).toBe(
      '....... ...##.. ....... ...#... ....... ....... .......',
    );
  });

  it.each([...squaresFrom(7), ...RECTANGLES].map((grid) => [gridName(grid), grid] as const))(
    'moves the outer planet and the moon at most one cell a frame, seam included, on %s',
    (_name, grid) => {
      const cells = (length: number): Cell[][] =>
        generateTrace(grid, { variant: 'orrery', length, trail: 0 }).frames.map((frame) =>
          litCells(frame, grid.cols),
        );
      const withoutMoon = cells(2);
      const sun = new Set(cells(0)[0].map(([x, y]) => `${x},${y}`));
      const planets = cells(1).map((lit) => lit.filter(([x, y]) => !sun.has(`${x},${y}`)));
      const moons = cells(3).map((lit, index) =>
        lit.filter(([x, y]) => !withoutMoon[index].some(([px, py]) => px === x && py === y)),
      );
      [planets, moons].forEach((track) => {
        const steps = track.flatMap((now, index) => {
          const next = track[(index + 1) % track.length];
          return now.length === 1 && next.length === 1 ? [chebyshev(now[0], next[0])] : [];
        });

        expect(Math.max(...steps)).toBeLessThanOrEqual(1);
      });
    },
  );
});

describe('trace orrery custom and result states', () => {
  it('keeps the approved 13x13 eclipse: the sun goes dark as the moon crosses it', () => {
    expect(framesAsText('orrery-eclipse', ORRERY).slice(8, 12)).toEqual([
      '............. ............. ............. ............. ............. ............. ....#.#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ............. .....##...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ............. ............. ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ............. ......##..... ............. ............. ............. ............. ............. .............',
    ]);
  });

  it('darkens the sun for exactly one frame per pass', () => {
    const { frames } = generateTrace(ORRERY, { variant: 'orrery-eclipse' });
    const dark = frames.flatMap((frame, index) => (isSunLit(frame, ORRERY) ? [] : [index]));

    expect(dark).toEqual([10, 30]);
    expect(frames.map(countLit).filter((count) => count === 0)).toHaveLength(2);
  });

  it('keeps the approved 13x13 alignment, flare and hold', () => {
    const { durations } = generateTrace(ORRERY, { variant: 'orrery-align' });

    expect(framesAsText('orrery-align', ORRERY)).toEqual([
      '............. ............. ......#.#.... ............. ............. ............. ......#...... ............. ......#...... ............. ............. ............. .............',
      '............. ............. .......#.#... ............. ............. ............. ......#...... ............. .....#....... ............. ............. ............. .............',
      '............. ............. ........#.#.. ............. ............. ............. ....#.#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. .........#.#. ............. .....#....... ......#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ......#...#.# ............. ......#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ........#.#.# ......#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ............. ......#.#.#.# ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. .....#.#..... ......#.#.#.# .....#.#..... ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ............. ......#.#.#.# ............. ............. ............. ............. ............. .............',
    ]);
    expect(durations).toEqual([120, 60, 60, 60, 60, 60, 560, 120, HOLD_MS]);
  });

  it.each(squaresFrom(7).map((grid) => [gridName(grid), grid] as const))(
    'ends the alignment with every body in one row on %s',
    (_name, grid) => {
      const { frames } = generateTrace(grid, { variant: 'orrery-align' });
      const cells = litCells(frames[frames.length - 1], grid.cols);
      const sunRows = grid.rows % 2 === 1 ? 1 : 2;

      expect(new Set(cells.map(([, y]) => y)).size).toBe(sunRows);
    },
  );

  it('keeps the approved 13x13 escape: the outer planet leaves on its tangent', () => {
    const { durations } = generateTrace(ORRERY, { variant: 'orrery-escape' });

    expect(framesAsText('orrery-escape', ORRERY)).toEqual([
      '............. ............. .....##.#.... ............. ............. ............. ......#...... ............. ......##..... ............. ............. ............. .............',
      '............. ............. .....##...... ........#.... ............. ............. ......#...... ............. .....##...... ............. ............. ............. .............',
      '............. ............. ......##..... .........#... ............. ............. ......#...... ............. .....##...... ............. ............. ............. .............',
      '............. ............. .......##.... .........#... ............. ............. ......#...... .....#....... .....#....... ............. ............. ............. .............',
      '............. ............. ........##... ............. ..........#.. ............. ......#...... ....##....... ............. ............. ............. ............. .............',
      '............. ............. .........##.. ............. ..........#.. ............. ......#...... ....##....... ............. ............. ............. ............. .............',
      '............. ............. ..........##. ............. ...........#. ............. ....#.#...... ....#........ ............. ............. ............. ............. .............',
      '............. ............. ............# ............. ............. ....#........ ....#.#...... ............. ............. ............. ............. ............. .............',
      '............. ............. ............. ............. ............. ....#........ ....#.#...... ............. ............. ............. ............. ............. .............',
    ]);
    expect(durations).toEqual([60, 60, 60, 60, 60, 60, 60, 60, HOLD_MS]);
  });

  it.each(squaresFrom(7).map((grid) => [gridName(grid), grid] as const))(
    'ends the escape with the outer planet and moon gone on %s',
    (_name, grid) => {
      const { frames } = generateTrace(grid, { variant: 'orrery-escape' });
      const first = countLit(frames[0]);
      const last = countLit(frames[frames.length - 1]);

      expect(frames.length).toBeLessThan(48);
      expect(last).toBeLessThan(first);
    },
  );
});
