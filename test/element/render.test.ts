import { describe, expect, it } from 'vitest';

import type { Frame } from '../../src/index';
import type { DotsLook } from '../../src/element/render';
import { createGridRenderer, getCellMetrics, getCellPaint, getShapeStyle } from '../../src/element/render';

import { createFakeCell, createFakeGrid, toBits } from './fake-dom';

const LOOK: DotsLook = { on: '#e4ff3e', off: '#26272d', mode: 'flat', shape: 'circle', size: 30, gap: 0.5 };
const GRID = { cols: 3, rows: 3 };
const PLUS: Frame = [0, 1, 0, 1, 1, 1, 0, 1, 0];
const DOT: Frame = [0, 0, 0, 0, 1, 0, 0, 0, 0];

function setUp(look: DotsLook = LOOK, canAnimate = true) {
  const grid = createFakeGrid();
  const renderer = createGridRenderer(grid, () => createFakeCell(canAnimate));
  renderer.layout(GRID, look);
  return { grid, renderer };
}

describe('getCellMetrics', () => {
  it('fits the columns and their gaps into the size', () => {
    const { cellPx, gapPx } = getCellMetrics(7, 24, 0.25);

    expect(cellPx).toBe(24 / 8.5);
    expect(gapPx).toBe((24 / 8.5) * 0.25);
    expect(7 * cellPx + 6 * gapPx).toBeCloseTo(24, 10);
  });

  it('uses the whole size for cells when there is no gap', () => {
    expect(getCellMetrics(4, 20, 0)).toEqual({ cellPx: 5, gapPx: 0 });
  });
});

describe('getShapeStyle', () => {
  it('rounds circles and rounded squares and rotates diamonds', () => {
    expect(getShapeStyle('circle')).toEqual({ radius: '50%', transform: 'none' });
    expect(getShapeStyle('rounded')).toEqual({ radius: '30%', transform: 'none' });
    expect(getShapeStyle('square')).toEqual({ radius: '0', transform: 'none' });
    expect(getShapeStyle('diamond')).toEqual({ radius: '0', transform: 'rotate(45deg) scale(.74)' });
  });
});

describe('getCellPaint', () => {
  it('paints lit and unlit dots with their colours and no glow when flat', () => {
    expect(getCellPaint(1, LOOK, 10)).toEqual({ background: '#e4ff3e', boxShadow: 'none' });
    expect(getCellPaint(0, LOOK, 10)).toEqual({ background: '#26272d', boxShadow: 'none' });
  });

  it('adds a glow to lit dots in led mode, at least 3px wide', () => {
    const led: DotsLook = { ...LOOK, mode: 'led' };

    expect(getCellPaint(1, led, 10)).toEqual({ background: '#e4ff3e', boxShadow: '0 0 9px #e4ff3e' });
    expect(getCellPaint(1, led, 2)).toEqual({ background: '#e4ff3e', boxShadow: '0 0 3px #e4ff3e' });
    expect(getCellPaint(0, led, 10).boxShadow).toBe('none');
  });
});

describe('createGridRenderer layout', () => {
  it('builds one cell per dot sized from the look', () => {
    const { grid } = setUp();

    expect(grid.cells).toHaveLength(9);
    expect(grid.style.gridTemplateColumns).toBe('repeat(3, 7.5px)');
    expect(grid.style.gap).toBe('3.75px');
    expect(grid.cells[0].style).toMatchObject({
      width: '7.5px',
      height: '7.5px',
      borderRadius: '50%',
      transform: 'none',
    });
  });

  it('keeps the cells when the dot count stays the same', () => {
    const { grid, renderer } = setUp();
    const before = grid.cells;

    renderer.layout(GRID, { ...LOOK, shape: 'diamond' });

    expect(grid.cells).toBe(before);
    expect(grid.cells[4].style.transform).toBe('rotate(45deg) scale(.74)');
  });

  it('replaces the cells when the grid changes size', () => {
    const { grid, renderer } = setUp();

    renderer.layout({ cols: 4, rows: 3 }, LOOK);

    expect(grid.cells).toHaveLength(12);
    expect(grid.style.gridTemplateColumns).toBe(`repeat(4, ${30 / 5.5}px)`);
  });
});

describe('createGridRenderer paint', () => {
  it('paints every dot of the frame and remembers it', () => {
    const { grid, renderer } = setUp();

    renderer.paint(PLUS);

    expect(toBits(grid.cells, LOOK.on)).toEqual([...PLUS]);
    expect(renderer.frame).toBe(PLUS);
  });

  it('leaves dots that did not change alone', () => {
    const { grid, renderer } = setUp();
    renderer.paint(PLUS);
    grid.cells[0].style.background = 'marker';

    renderer.paint(DOT);

    expect(grid.cells[0].style.background).toBe('marker');
    expect(grid.cells[1].style.background).toBe(LOOK.off);
  });

  it('repaints every dot after a new layout', () => {
    const { grid, renderer } = setUp();
    renderer.paint(PLUS);
    grid.cells[0].style.background = 'marker';

    renderer.layout(GRID, { ...LOOK, off: '#000000' });
    renderer.paint(PLUS);

    expect(grid.cells[0].style.background).toBe('#000000');
  });

  it('does not animate in flat mode', () => {
    const { grid, renderer } = setUp();
    renderer.paint(PLUS);

    renderer.paint(DOT);

    expect(grid.cells.flatMap((cell) => cell.animations)).toEqual([]);
  });

  it('flips only the dots that changed in flip mode', () => {
    const { grid, renderer } = setUp({ ...LOOK, mode: 'flip' });
    renderer.paint(PLUS);

    renderer.paint(DOT);

    const flipped = grid.cells.map((cell) => cell.animations.length);
    expect(flipped).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
    expect(grid.cells[1].animations[0]).toEqual({
      keyframes: [
        { transform: 'rotateX(0deg)' },
        { transform: 'rotateX(90deg)' },
        { transform: 'rotateX(0deg)' },
      ],
      options: { duration: 160, easing: 'linear' },
    });
  });

  it('keeps the diamond rotation while flipping', () => {
    const { grid, renderer } = setUp({ ...LOOK, mode: 'flip', shape: 'diamond' });
    renderer.paint(PLUS);

    renderer.paint(DOT);

    expect(grid.cells[1].animations[0].keyframes[1]).toEqual({
      transform: 'rotate(45deg) scale(.74) rotateX(90deg)',
    });
  });

  it('paints without animating where the browser has no animate', () => {
    const { grid, renderer } = setUp({ ...LOOK, mode: 'flip' }, false);
    renderer.paint(PLUS);

    renderer.paint(DOT);

    expect(toBits(grid.cells, LOOK.on)).toEqual([...DOT]);
  });
});

describe('createGridRenderer transition steps', () => {
  it('paints one column and turns every dot in it', () => {
    const { grid, renderer } = setUp();
    renderer.paint(DOT);

    renderer.paintColumn(PLUS, 1);

    expect(toBits(grid.cells, LOOK.on)).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    expect(grid.cells.map((cell) => cell.animations.length)).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    expect(grid.cells[4].animations[0]).toEqual({
      keyframes: [
        { transform: 'rotateY(0deg)' },
        { transform: 'rotateY(90deg)' },
        { transform: 'rotateY(0deg)' },
      ],
      options: { duration: 180 },
    });
  });

  it('dips the whole grid for a crossfade', () => {
    const { grid, renderer } = setUp();

    renderer.fade();

    expect(grid.animations).toEqual([
      { keyframes: [{ opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }], options: { duration: 280 } },
    ]);
  });
});

describe('createGridRenderer with reduced motion', () => {
  function setUpReduced(look: DotsLook = { ...LOOK, mode: 'flip' }) {
    const grid = createFakeGrid();
    const renderer = createGridRenderer(grid, () => createFakeCell());
    renderer.layout(GRID, look, true);
    return { grid, renderer };
  }

  it('changes dots without flipping them in flip mode', () => {
    const { grid, renderer } = setUpReduced();
    renderer.paint(PLUS);

    renderer.paint(DOT);

    expect(toBits(grid.cells, LOOK.on)).toEqual([...DOT]);
    expect(grid.cells.flatMap((cell) => cell.animations)).toEqual([]);
  });

  it('paints a wipe column without turning the dots', () => {
    const { grid, renderer } = setUpReduced(LOOK);
    renderer.paint(DOT);

    renderer.paintColumn(PLUS, 1);

    expect(toBits(grid.cells, LOOK.on)).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    expect(grid.cells.flatMap((cell) => cell.animations)).toEqual([]);
  });

  it('skips the crossfade dip', () => {
    const { grid, renderer } = setUpReduced(LOOK);

    renderer.fade();

    expect(grid.animations).toEqual([]);
  });

  it('animates again after a layout without reduced motion', () => {
    const { grid, renderer } = setUpReduced();
    renderer.layout(GRID, { ...LOOK, mode: 'flip' });
    renderer.paint(PLUS);

    renderer.paint(DOT);

    expect(grid.cells.map((cell) => cell.animations.length)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0]);
  });
});
