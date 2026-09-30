import { describe, expect, it } from 'vitest';

import { getFaceLayout, lookPositions } from '../../../../src/core/recipes/face/layout';

import { gridsBetween } from './frame-tools';

const LOOKS = [-2, -1, 0, 1, 2];

describe('getFaceLayout', () => {
  it('places two 4x6 eyes one column in from each side on 12x8', () => {
    expect(getFaceLayout({ cols: 12, rows: 8 })).toEqual({
      cols: 12,
      rows: 8,
      eyeWidth: 4,
      eyeHeight: 6,
      leftX: 1,
      rightX: 7,
      top: 1,
    });
  });

  it('uses 3x4 eyes on the smallest 10x6 grid', () => {
    expect(getFaceLayout({ cols: 10, rows: 6 })).toMatchObject({
      eyeWidth: 3,
      eyeHeight: 4,
      leftX: 1,
      rightX: 6,
      top: 1,
    });
  });

  it('caps the eyes at 5 wide and 8 tall on 16x16', () => {
    expect(getFaceLayout({ cols: 16, rows: 16 })).toMatchObject({
      eyeWidth: 5,
      eyeHeight: 8,
      leftX: 2,
      rightX: 9,
      top: 4,
    });
  });

  it('keeps an odd grid centred with a three-column gap and a 7-row cap', () => {
    expect(getFaceLayout({ cols: 11, rows: 11 })).toMatchObject({
      eyeWidth: 3,
      eyeHeight: 7,
      leftX: 1,
      rightX: 7,
      top: 2,
    });
  });

  it.each(
    gridsBetween({ cols: 3, rows: 3 }, { cols: 16, rows: 16 }).map(
      (grid) => [`${grid.cols}x${grid.rows}`, grid] as const,
    ),
  )('centres both eyes exactly and keeps a row free above and below on %s', (_, grid) => {
    const layout = getFaceLayout(grid);
    const right = grid.cols - (layout.rightX + layout.eyeWidth);
    expect(layout.eyeWidth).toBeGreaterThanOrEqual(1);
    expect(layout.eyeHeight).toBeGreaterThanOrEqual(1);
    expect(layout.leftX).toBe(right);
    expect(layout.rightX - layout.leftX - layout.eyeWidth).toBeGreaterThanOrEqual(1);
    expect(layout.top).toBe(grid.rows - layout.top - layout.eyeHeight);
    expect(layout.top).toBeGreaterThanOrEqual(1);
  });
});

describe('lookPositions', () => {
  it('moves the leading eye as far as the margin allows and the trailing eye up to the full look', () => {
    const layout = getFaceLayout({ cols: 12, rows: 8 });
    expect(lookPositions(layout, -2)).toEqual({ leftX: 0, rightX: 5 });
    expect(lookPositions(layout, -1)).toEqual({ leftX: 0, rightX: 6 });
    expect(lookPositions(layout, 0)).toEqual({ leftX: 1, rightX: 7 });
    expect(lookPositions(layout, 1)).toEqual({ leftX: 2, rightX: 8 });
    expect(lookPositions(layout, 2)).toEqual({ leftX: 3, rightX: 8 });
  });

  it('moves both eyes the full look when the margin allows it on 16x16', () => {
    const layout = getFaceLayout({ cols: 16, rows: 16 });
    expect(lookPositions(layout, -2)).toEqual({ leftX: 0, rightX: 7 });
    expect(lookPositions(layout, 2)).toEqual({ leftX: 4, rightX: 11 });
  });

  it.each(
    gridsBetween({ cols: 3, rows: 3 }, { cols: 16, rows: 16 }).map(
      (grid) => [`${grid.cols}x${grid.rows}`, grid] as const,
    ),
  )('keeps both eyes whole, apart and in order for every look on %s', (_, grid) => {
    const layout = getFaceLayout(grid);
    LOOKS.forEach((dx) => {
      const { leftX, rightX } = lookPositions(layout, dx);
      expect(leftX).toBeGreaterThanOrEqual(0);
      expect(rightX + layout.eyeWidth).toBeLessThanOrEqual(grid.cols);
      expect(rightX - leftX - layout.eyeWidth).toBeGreaterThanOrEqual(1);
    });
  });
});
