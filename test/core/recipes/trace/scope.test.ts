import { describe, expect, it } from 'vitest';

import { glyphMask } from '../../../../src/core/glyphs';
import { generateTrace } from '../../../../src/core/recipes/trace';
import type { GridSize } from '../../../../src/core/types';

import { RECTANGLES, chebyshev, countLit, gridName, litCells, squaresFrom, toRows } from './checks';

const SCOPE: GridSize = { cols: 7, rows: 7 };
const IDLE_MS = 120;
const THINKING_MS = 50;
const HOLD_MS = 1500;
const KNOT_LAPS = 4;

function framesAsText(variant: string, grid: GridSize, extra: Record<string, number> = {}): string[] {
  return generateTrace(grid, { variant, ...extra }).frames.map((frame) => toRows(frame, grid.cols).join(' '));
}

function headPath(variant: string, grid: GridSize): ReturnType<typeof litCells>[number][] {
  return generateTrace(grid, { variant, trail: 0 }).frames.map((frame) => litCells(frame, grid.cols)[0]);
}

describe('trace scope figures', () => {
  it('keeps the approved 7x7 idle circle with a trail of 4 at 120 ms', () => {
    const output = generateTrace(SCOPE, { variant: 'lissajous-1-1', trail: 4 });

    expect(framesAsText('lissajous-1-1', SCOPE, { trail: 4 })).toEqual([
      '...##.. .....#. ......# ......# ....... ....... .......',
      '....#.. .....#. ......# ......# ......# ....... .......',
      '....... .....#. ......# ......# ......# .....#. .......',
      '....... ....... ......# ......# ......# .....#. ....#..',
      '....... ....... ....... ......# ......# .....#. ...##..',
      '....... ....... ....... ....... ......# .....#. ..###..',
      '....... ....... ....... ....... ....... .#...#. ..###..',
      '....... ....... ....... ....... #...... .#..... ..###..',
      '....... ....... ....... #...... #...... .#..... ..##...',
      '....... ....... #...... #...... #...... .#..... ..#....',
      '....... .#..... #...... #...... #...... .#..... .......',
      '..#.... .#..... #...... #...... #...... ....... .......',
      '..##... .#..... #...... #...... ....... ....... .......',
      '..###.. .#..... #...... ....... ....... ....... .......',
      '..###.. .#...#. ....... ....... ....... ....... .......',
      '..###.. .....#. ......# ....... ....... ....... .......',
    ]);
    expect(output.durations).toEqual(output.frames.map(() => IDLE_MS));
  });

  it('keeps the approved opening of the 7x7 thinking knot at 50 ms per dot', () => {
    const output = generateTrace(SCOPE, { variant: 'lissajous-3-2' });

    expect(framesAsText('lissajous-3-2', SCOPE).slice(0, 12)).toEqual([
      '.##.... ##.##.. ..#..#. ......# ....... ....... .......',
      '.##.... ##.##.. .....#. ......# .....#. ....... .......',
      '.##.... #..##.. .....#. ......# .....#. ....#.. .......',
      '.##.... ...##.. .....#. ......# .....#. ...##.. .......',
      '..#.... ...##.. .....#. ......# .....#. ...##.. ..#....',
      '....... ...##.. .....#. ......# .....#. ...##.. .##....',
      '....... ....#.. .....#. ......# .....#. #..##.. .##....',
      '....... ....... .....#. ......# .....#. ##.##.. .##....',
      '....... ....... ....... ......# ..#..#. ##.##.. .##....',
      '....... ....... ....... ...#... ..#..#. ##.##.. .##....',
      '....... ....... ....... ...##.. ..#.... ##.##.. .##....',
      '....... ....... .....#. ...##.. ..#.... ##.#... .##....',
    ]);
    expect(output.frames).toHaveLength(156);
    expect(output.durations).toEqual(output.frames.map(() => THINKING_MS));
  });

  it('keeps the approved opening of the 7x7 listening circle', () => {
    expect(framesAsText('lissajous-1-1-level', SCOPE).slice(0, 12)).toEqual([
      '....... ...##.. ..#..#. ......# ....... ....... .......',
      '....... ...##.. .....#. ......# .....#. ....... .......',
      '....... ....#.. .....#. ......# .....#. ....#.. .......',
      '....... ....... .....#. ......# .....#. ....#.. ...#...',
      '....... ....... ....... ......# .....#. ..#.#.. ...#...',
      '....... ....... ....... ....... .#...#. ..#.#.. ...#...',
      '....... ....... ....... .#..... .#..... ..#.#.. ...#...',
      '....... ....... .#..... .#..... .#..... ..#.... ...#...',
      '....... ..#.... .#..... .#..... .#..... ..#.... .......',
      '....... ..##... .#..... .#..... .#..... ....... .......',
      '....... ..###.. .#..... .#..... ....... ....... .......',
      '....... ..###.. .#...#. ....... ....... ....... .......',
    ]);
    expect(generateTrace(SCOPE, { variant: 'lissajous-1-1-level' }).frames).toHaveLength(43);
  });

  it.each([...squaresFrom(5), ...RECTANGLES].map((grid) => [gridName(grid), grid] as const))(
    'moves the scope dot one cell per frame, seam included, on %s',
    (_name, grid) => {
      ['lissajous-1-1', 'lissajous-3-2', 'lissajous-1-1-level'].forEach((variant) => {
        const heads = headPath(variant, grid);
        const steps = heads.map((head, index) => chebyshev(head, heads[(index + 1) % heads.length]));

        expect(Math.max(...steps), variant).toBe(1);
      });
    },
  );

  it.each(squaresFrom(5).map((grid) => [gridName(grid), grid] as const))(
    'draws the idle circle mirror-symmetric on %s',
    (_name, grid) => {
      const heads = headPath('lissajous-1-1', grid);
      const rows = toRows(
        Array.from({ length: grid.cols * grid.rows }, (_, index) =>
          heads.some(([x, y]) => y * grid.cols + x === index) ? 1 : 0,
        ),
        grid.cols,
      );

      expect(rows.join('|')).toBe([...rows].reverse().join('|'));
      expect(rows.every((row) => row === [...row].reverse().join(''))).toBe(true);
    },
  );

  it('lights the head plus the trail and no more', () => {
    const counts = generateTrace(SCOPE, { variant: 'lissajous-1-1', trail: 4 }).frames.map(countLit);

    expect(new Set(counts)).toEqual(new Set([5]));
    expect(
      new Set(generateTrace(SCOPE, { variant: 'lissajous-3-2', trail: 0 }).frames.map(countLit)),
    ).toEqual(new Set([1]));
  });

  it('drifts the knot so each lap traces a different figure before the loop closes', () => {
    const heads = headPath('lissajous-3-2', { cols: 9, rows: 9 });
    const lap = Math.floor(heads.length / KNOT_LAPS);
    const figure = (index: number): string =>
      [...new Set(heads.slice(index * lap, (index + 1) * lap).map(([x, y]) => `${x},${y}`))].sort().join(' ');

    expect(heads[0]).toEqual([8, 4]);
    expect(figure(0)).not.toBe(figure(1));
  });

  it('follows the seed for the listening levels', () => {
    const seeded = generateTrace(SCOPE, { variant: 'lissajous-1-1-level', seed: 11 });

    expect(seeded).not.toEqual(generateTrace(SCOPE, { variant: 'lissajous-1-1-level' }));
    expect(seeded).toEqual(generateTrace(SCOPE, { variant: 'lissajous-1-1-level', seed: 11 }));
  });
});

describe('trace scope results', () => {
  it('keeps the approved 7x7 collapse into the check', () => {
    const output = generateTrace(SCOPE, { variant: 'lissajous-collapse' });

    expect(framesAsText('lissajous-collapse', SCOPE)).toEqual([
      '.##.... ##.##.. ..#..#. ......# ....... ....... .......',
      '....... .####.. ..#..#. .....#. ....... ....... .......',
      '....... ..#.... .####.. .....#. ....... ....... .......',
      '....... ....... ..##... ...##.. ....... ....... .......',
      '....... ....... ....... ...#... ....... ....... .......',
      '....... ....... ....... ....... .#..... ....... .......',
      '....... ....... ....... ....... .#..... ..#.... .......',
      '....... ....... ....... ....... .#.#... ..#.... .......',
      '....... ....... ....... ....#.. .#.#... ..#.... .......',
      '....... ....... .....#. ....#.. .#.#... ..#.... .......',
    ]);
    expect(output.durations).toEqual([60, 60, 60, 60, 200, 40, 40, 40, 40, HOLD_MS]);
  });

  it.each(squaresFrom(7).map((grid) => [gridName(grid), grid] as const))(
    'shrinks into the centre and ends on the shared check on %s',
    (_name, grid) => {
      const { frames } = generateTrace(grid, { variant: 'lissajous-collapse' });
      const centre = litCells(frames[4], grid.cols);
      const expectedCentre = grid.cols % 2 === 1 ? 1 : 4;

      expect(frames[frames.length - 1]).toEqual(glyphMask('check', grid));
      expect(centre).toHaveLength(expectedCentre);
    },
  );

  it('keeps the approved 7x7 flatline sweep and hold', () => {
    const output = generateTrace(SCOPE, { variant: 'flatline' });

    expect(framesAsText('flatline', SCOPE)).toEqual([
      '....... ....... ....... #...... ....... ....... .......',
      '....... ....... ....... ##..... ....... ....... .......',
      '....... ....... ....... ###.... ....... ....... .......',
      '....... ...#... ...#... ####... ....... ....... .......',
      '....... ...#... ...#... #####.. ....... ....... .......',
      '....... ...#... ...#... ######. ....... ....... .......',
      '....... ...#... ...#... ####### ....... ....... .......',
    ]);
    expect(output.durations).toEqual([40, 40, 40, 40, 40, 40, HOLD_MS]);
  });

  it('centres a two-column blip on an even width', () => {
    const { frames } = generateTrace({ cols: 8, rows: 6 }, { variant: 'flatline' });

    expect(toRows(frames[frames.length - 1], 8).join(' ')).toBe(
      '........ ...##... ...##... ######## ........ ........',
    );
  });
});
