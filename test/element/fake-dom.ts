import type { CellElement, CellStyle, GridElement, GridStyle } from '../../src/element/render';

export interface Animation {
  readonly keyframes: readonly Keyframe[];
  readonly options: KeyframeAnimationOptions;
}

export interface FakeCell extends CellElement {
  readonly animations: readonly Animation[];
}

export interface FakeGrid extends GridElement<FakeCell> {
  readonly cells: readonly FakeCell[];
  readonly animations: readonly Animation[];
}

function createCellStyle(): CellStyle {
  return { width: '', height: '', borderRadius: '', transform: '', background: '', boxShadow: '' };
}

export function createFakeCell(canAnimate = true): FakeCell {
  let animations: readonly Animation[] = [];
  const cell = {
    style: createCellStyle(),
    get animations() {
      return animations;
    },
  };
  if (!canAnimate) return cell;
  return {
    ...cell,
    get animations() {
      return animations;
    },
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      animations = [...animations, { keyframes, options }];
    },
  };
}

export function createFakeGrid(): FakeGrid {
  let cells: readonly FakeCell[] = [];
  let animations: readonly Animation[] = [];
  const style: GridStyle = { gridTemplateColumns: '', gap: '' };
  return {
    style,
    replaceChildren: (...next: FakeCell[]) => {
      cells = next;
    },
    animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      animations = [...animations, { keyframes, options }];
    },
    get cells() {
      return cells;
    },
    get animations() {
      return animations;
    },
  };
}

export function toBits(cells: readonly FakeCell[], on: string): number[] {
  return cells.map((cell) => (cell.style.background === on ? 1 : 0));
}
