import type { Bit, DotShape, Frame, GridSize, RenderMode } from '../core/types';

export interface CellStyle {
  width: string;
  height: string;
  borderRadius: string;
  transform: string;
  background: string;
  boxShadow: string;
}

export interface GridStyle {
  gridTemplateColumns: string;
  gap: string;
}

type Animate = (keyframes: Keyframe[], options: KeyframeAnimationOptions) => unknown;

export interface CellElement {
  readonly style: CellStyle;
  animate?: Animate;
}

export interface GridElement<C extends CellElement> {
  readonly style: GridStyle;
  replaceChildren(...cells: C[]): void;
  animate?: Animate;
}

export interface DotsLook {
  readonly on: string;
  readonly off: string;
  readonly mode: RenderMode;
  readonly shape: DotShape;
  readonly size: number;
  readonly gap: number;
}

export interface CellMetrics {
  readonly cellPx: number;
  readonly gapPx: number;
}

export interface ShapeStyle {
  readonly radius: string;
  readonly transform: string;
}

export interface CellPaint {
  readonly background: string;
  readonly boxShadow: string;
}

export interface GridRenderer {
  layout(grid: GridSize, look: DotsLook, isReduced?: boolean): void;
  paint(frame: Frame): void;
  paintColumn(frame: Frame, column: number): void;
  fade(): void;
  readonly frame: Frame | null;
}

type Painted = Bit | -1;

const FLIP_MS = 160;
const WIPE_TURN_MS = 180;
const FADE_MS = 280;
const FADE_LOW_OPACITY = 0.1;
const GLOW_RATIO = 0.9;
const GLOW_MIN_PX = 3;
const NO_TRANSFORM = 'none';
const NO_SHADOW = 'none';

const SHAPE_STYLES: Readonly<Record<DotShape, ShapeStyle>> = {
  circle: { radius: '50%', transform: NO_TRANSFORM },
  rounded: { radius: '30%', transform: NO_TRANSFORM },
  square: { radius: '0', transform: NO_TRANSFORM },
  diamond: { radius: '0', transform: 'rotate(45deg) scale(.74)' },
};

export function getCellMetrics(cols: number, size: number, gap: number): CellMetrics {
  const cellPx = size / (cols + (cols - 1) * gap);
  return { cellPx, gapPx: cellPx * gap };
}

export function getShapeStyle(shape: DotShape): ShapeStyle {
  return SHAPE_STYLES[shape];
}

export function getCellPaint(lit: Bit, look: DotsLook, cellPx: number): CellPaint {
  const glows = look.mode === 'led' && lit === 1;
  return {
    background: lit === 1 ? look.on : look.off,
    boxShadow: glows ? `0 0 ${Math.max(GLOW_MIN_PX, cellPx * GLOW_RATIO)}px ${look.on}` : NO_SHADOW,
  };
}

function getTurnKeyframes(base: string, axis: 'X' | 'Y'): Keyframe[] {
  const prefix = base === NO_TRANSFORM ? '' : `${base} `;
  return [0, 90, 0].map((degrees) => ({ transform: `${prefix}rotate${axis}(${degrees}deg)` }));
}

function animateIfAble(
  target: { animate?: Animate },
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): void {
  if (typeof target.animate === 'function') target.animate(keyframes, options);
}

function toBit(value: number | undefined): Bit {
  return value === 1 ? 1 : 0;
}

interface RendererState<C extends CellElement> {
  readonly cells: readonly C[];
  readonly painted: readonly Painted[];
  readonly cols: number;
  readonly look: DotsLook | null;
  readonly cellPx: number;
  readonly frame: Frame | null;
  readonly isReduced: boolean;
}

function styleCell(cell: CellElement, lit: Bit, look: DotsLook, cellPx: number): void {
  const paint = getCellPaint(lit, look, cellPx);
  cell.style.background = paint.background;
  cell.style.boxShadow = paint.boxShadow;
}

function sizeCells(cells: readonly CellElement[], look: DotsLook, cellPx: number): void {
  const shape = getShapeStyle(look.shape);
  cells.forEach((cell) => {
    cell.style.width = `${cellPx}px`;
    cell.style.height = `${cellPx}px`;
    cell.style.borderRadius = shape.radius;
    cell.style.transform = shape.transform;
  });
}

function paintCells<C extends CellElement>(state: RendererState<C>, frame: Frame): readonly Painted[] {
  const { look, cellPx } = state;
  if (look === null) return state.painted;
  const shouldFlip = look.mode === 'flip' && !state.isReduced;
  const keyframes = getTurnKeyframes(getShapeStyle(look.shape).transform, 'X');
  return state.cells.map((cell, index) => {
    const lit = toBit(frame[index]);
    const before = state.painted[index];
    if (before === lit) return before;
    styleCell(cell, lit, look, cellPx);
    if (shouldFlip && before !== -1) animateIfAble(cell, keyframes, { duration: FLIP_MS, easing: 'linear' });
    return lit;
  });
}

function paintColumnCells<C extends CellElement>(
  state: RendererState<C>,
  frame: Frame,
  column: number,
): readonly Painted[] {
  const { look, cellPx, cols } = state;
  if (look === null) return state.painted;
  const keyframes = getTurnKeyframes(getShapeStyle(look.shape).transform, 'Y');
  return state.cells.map((cell, index) => {
    const before = state.painted[index];
    if (index % cols !== column) return before;
    const lit = toBit(frame[index]);
    if (before !== lit) styleCell(cell, lit, look, cellPx);
    if (!state.isReduced) animateIfAble(cell, keyframes, { duration: WIPE_TURN_MS });
    return lit;
  });
}

function createCells<C extends CellElement>(count: number, createCell: () => C): readonly C[] {
  return Array.from({ length: count }, () => createCell());
}

export function createGridRenderer<C extends CellElement>(
  grid: GridElement<C>,
  createCell: () => C,
): GridRenderer {
  let state: RendererState<C> = {
    cells: [],
    painted: [],
    cols: 0,
    look: null,
    cellPx: 0,
    frame: null,
    isReduced: false,
  };

  const layout = (size: GridSize, look: DotsLook, isReduced = false): void => {
    const count = size.cols * size.rows;
    const { cellPx, gapPx } = getCellMetrics(size.cols, look.size, look.gap);
    const cells = state.cells.length === count ? state.cells : createCells(count, createCell);
    if (cells !== state.cells) grid.replaceChildren(...cells);
    grid.style.gridTemplateColumns = `repeat(${size.cols}, ${cellPx}px)`;
    grid.style.gap = `${gapPx}px`;
    sizeCells(cells, look, cellPx);
    const painted = cells.map((): Painted => -1);
    state = { ...state, cells, cols: size.cols, look, cellPx, isReduced, painted };
  };

  return Object.freeze({
    layout,
    paint: (frame: Frame) => {
      state = { ...state, painted: paintCells(state, frame), frame };
    },
    paintColumn: (frame: Frame, column: number) => {
      state = { ...state, painted: paintColumnCells(state, frame, column) };
    },
    fade: () => {
      if (state.isReduced) return;
      const keyframes = [1, FADE_LOW_OPACITY, 1].map((opacity) => ({ opacity }));
      animateIfAble(grid, keyframes, { duration: FADE_MS });
    },
    get frame() {
      return state.frame;
    },
  });
}
