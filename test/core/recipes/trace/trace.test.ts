import { describe, expect, it } from 'vitest';

import { TRACE_DEFAULTS, TRACE_VARIANTS, generateTrace } from '../../../../src/core/recipes/trace';
import type { TraceVariant } from '../../../../src/core/recipes/trace';
import type { GridSize } from '../../../../src/core/types';

import {
  MAX_BIG_CHANGES_PER_SECOND,
  RECTANGLES,
  countChanges,
  gridName,
  isValidOutput,
  peakBigChangesPerSecond,
  squaresFrom,
} from './checks';

const SMALLEST_READABLE: Readonly<Record<TraceVariant, number>> = {
  'lissajous-1-1': 5,
  'lissajous-3-2': 7,
  'lissajous-1-1-level': 5,
  'lissajous-collapse': 7,
  flatline: 5,
  spiro: 7,
  'spiro-rest': 7,
  'spiro-progress': 7,
  'spiro-complete': 7,
  'spiro-crumble': 7,
  orrery: 7,
  'orrery-eclipse': 7,
  'orrery-align': 7,
  'orrery-escape': 7,
};

const ONE_SHOT: readonly TraceVariant[] = [
  'lissajous-collapse',
  'flatline',
  'spiro-complete',
  'spiro-crumble',
  'orrery-align',
  'orrery-escape',
];

const EVERY_GRID: readonly GridSize[] = [...squaresFrom(3), ...RECTANGLES];

function readableGrids(variant: TraceVariant): GridSize[] {
  return [...squaresFrom(SMALLEST_READABLE[variant]), ...RECTANGLES];
}

function cases(): (readonly [TraceVariant, string, GridSize])[] {
  return TRACE_VARIANTS.flatMap((variant) =>
    readableGrids(variant).map((grid) => [variant, gridName(grid), grid] as const),
  );
}

describe('generateTrace', () => {
  it('lists the variants the scope, spirograph and orrery sets use', () => {
    expect(TRACE_VARIANTS).toEqual(Object.keys(SMALLEST_READABLE));
  });

  it('draws the thinking scope figure when no variant is given', () => {
    const grid = { cols: 7, rows: 7 };

    expect(TRACE_DEFAULTS.variant).toBe('lissajous-3-2');
    expect(generateTrace(grid)).toEqual(generateTrace(grid, { variant: 'lissajous-3-2' }));
  });

  it('throws a readable error for an unknown variant', () => {
    expect(() => generateTrace({ cols: 7, rows: 7 }, { variant: 'plasma' })).toThrow(
      'flickering-dots trace: unknown variant "plasma"; use one of',
    );
  });

  it.each(TRACE_VARIANTS)('renders %s on every grid from 3x3 to 16x16 without failing', (variant) => {
    EVERY_GRID.forEach((grid) => {
      expect(isValidOutput(generateTrace(grid, { variant }), grid), gridName(grid)).toBe(true);
    });
  });

  it.each(cases())('is deterministic for %s on %s', (variant, _name, grid) => {
    expect(generateTrace(grid, { variant })).toEqual(generateTrace(grid, { variant }));
  });

  it.each(cases())('keeps %s on %s within six big changes a second', (variant, _name, grid) => {
    const output = generateTrace(grid, { variant });
    const isLoop = !ONE_SHOT.includes(variant);

    expect(peakBigChangesPerSecond(output, grid, isLoop)).toBeLessThanOrEqual(MAX_BIG_CHANGES_PER_SECOND);
  });

  it.each(cases().filter(([variant]) => !ONE_SHOT.includes(variant)))(
    'closes the %s loop on %s without a jump at the seam',
    (variant, _name, grid) => {
      const { frames } = generateTrace(grid, { variant });
      const steps = frames.map((frame, index) =>
        countChanges(frames[index === 0 ? frames.length - 1 : index - 1], frame),
      );
      const seam = steps[0];

      expect(seam).toBeLessThanOrEqual(Math.max(...steps.slice(1)));
    },
  );

  it.each(ONE_SHOT)('holds the last frame of %s for the result hold', (variant) => {
    const { durations } = generateTrace({ cols: 9, rows: 9 }, { variant });

    expect(durations[durations.length - 1]).toBeGreaterThanOrEqual(1000);
  });
});
