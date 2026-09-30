import { describe, expect, it } from 'vitest';

import { generateFace } from '../../../../src/core/recipes/face';
import type { GridSize } from '../../../../src/core/types';

import { CENTRE } from './art-12x8';
import { toArt } from './frame-tools';

const GRID: GridSize = { cols: 12, rows: 8 };
const BLANK = '............';
const BODY = '.####..####.';
const CAP = '..##....##..';

function arts(variant: string): string[][] {
  return generateFace(GRID, { variant }).frames.map((frame) => toArt(frame, GRID.cols));
}

function lidded(height: number): string[] {
  const rows = [...Array.from({ length: height - 1 }, () => BODY), CAP];
  return [...Array.from({ length: 7 - height }, () => BLANK), ...rows, BLANK];
}

function sideEyes(top: number, cap: string, body: string, bodyRows: number): string[] {
  const rows = [cap, ...Array.from({ length: bodyRows }, () => body), cap];
  return [
    ...Array.from({ length: top }, () => BLANK),
    ...rows,
    ...Array.from({ length: 8 - top - rows.length }, () => BLANK),
  ];
}

describe('generateFace sleepy', () => {
  it('holds 2-row slits, then slowly opens to full and closes again every 4 s on 12x8', () => {
    const output = generateFace(GRID, { variant: 'sleepy' });
    expect(arts('sleepy')).toEqual([
      lidded(2),
      lidded(3),
      lidded(4),
      lidded(5),
      CENTRE,
      lidded(5),
      lidded(4),
      lidded(3),
    ]);
    expect(output.durations).toEqual([2240, 160, 160, 160, 800, 160, 160, 160]);
    expect(output.durations.reduce((sum, ms) => sum + ms, 0)).toBe(4000);
    expect(output.still).toBe(0);
  });
});

describe('generateFace wide', () => {
  it('opens the eyes 2 rows taller, looks right and blinks once on 12x8', () => {
    const wide = sideEyes(0, '....##...##.', '...####.####', 6);
    const squashed = sideEyes(2, '....##...##.', '...####.####', 2);
    const slit = [BLANK, BLANK, BLANK, '...####.####', BLANK, BLANK, BLANK, BLANK];
    const glanceBack = sideEyes(0, '...##....##.', '..####..####', 6);
    const output = generateFace(GRID, { variant: 'wide' });
    expect(arts('wide')).toEqual([wide, squashed, slit, squashed, wide, glanceBack]);
    expect(output.durations).toEqual([2000, 60, 80, 60, 1200, 500]);
    expect(output.still).toBe(0);
  });
});

describe('generateFace read', () => {
  it('scans a lidded look left to right, then drops 1 row and scans again on 12x8', () => {
    const line = (top: number, body: string, cap: string) =>
      sideEyes(top, body, body, 3).map((row, y) => (y === top + 4 ? cap : row));
    const firstLine = [
      line(2, '####.####...', '.##...##....'),
      line(2, '####..####..', '.##....##...'),
      line(2, '.####..####.', '..##....##..'),
      line(2, '..####..####', '...##....##.'),
      line(2, '...####.####', '....##...##.'),
    ];
    const secondLine = firstLine.map((art) => [BLANK, ...art.slice(0, 7)]);
    const output = generateFace(GRID, { variant: 'read' });
    expect(arts('read')).toEqual([...firstLine, ...secondLine]);
    expect(output.durations).toEqual([250, 250, 250, 250, 400, 250, 250, 250, 250, 400]);
    expect(output.still).toBe(2);
  });
});
