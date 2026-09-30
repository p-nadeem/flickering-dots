import { describe, expect, it } from 'vitest';

import {
  angryEye,
  happyArc,
  lidEye,
  mirrorMask,
  openEye,
  squashEye,
} from '../../../../src/core/recipes/face/masks';

describe('face masks', () => {
  it('rounds the corners of an eye 4 or more wide', () => {
    expect(openEye(4, 6)).toEqual(['.##.', '####', '####', '####', '####', '.##.']);
    expect(openEye(5, 3)).toEqual(['.###.', '#####', '.###.']);
  });

  it('keeps narrow or short eyes square', () => {
    expect(openEye(3, 4)).toEqual(['###', '###', '###', '###']);
    expect(openEye(4, 2)).toEqual(['####', '####']);
  });

  it('squashes a blink to a centred rounded eye of the given height', () => {
    expect(squashEye(4, 6, 3)).toEqual({ rows: ['.##.', '####', '.##.'], offset: 1 });
    expect(squashEye(4, 6, 1)).toEqual({ rows: ['####'], offset: 2 });
  });

  it('lowers a flat lid over the eye, keeping its rounded bottom', () => {
    expect(lidEye(4, 6, 2)).toEqual(['####', '.##.']);
    expect(lidEye(4, 6, 6)).toEqual(openEye(4, 6));
  });

  it('draws happy eyes as upside-down U arcs', () => {
    expect(happyArc(4, 6)).toEqual(['.##.', '####', '#..#', '#..#']);
    expect(happyArc(5, 8)).toEqual(['.###.', '##.##', '#...#', '#...#']);
    expect(happyArc(3, 4)).toEqual(['###', '#.#', '#.#']);
  });

  it('cuts the inner top triangle of an angry eye as a 45 degree slant', () => {
    expect(angryEye(4, 6)).toEqual(['#...', '##..', '###.', '####', '####', '.##.']);
    expect(angryEye(3, 4)).toEqual(['#..', '##.', '###', '###']);
    expect(angryEye(5, 8)).toEqual(['#....', '##...', '###..', '####.', '#####', '#####', '#####', '.###.']);
  });

  it('mirrors a mask left to right', () => {
    expect(mirrorMask(['#..', '##.'])).toEqual(['..#', '.##']);
  });

  it('never returns an empty mask on the smallest eyes', () => {
    [openEye(1, 1), happyArc(1, 1), angryEye(1, 1), angryEye(2, 2), lidEye(1, 1, 1)].forEach((mask) => {
      expect(mask.length).toBeGreaterThan(0);
      expect(mask.join('')).toContain('#');
    });
  });
});
