import type { Bit, Frame, GridSize } from '../../types';
import { wrapIndex } from '../helpers';

const HEADINGS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const RIGHT_TURN = 1;
const LEFT_TURN = HEADINGS.length - 1;

/** Langton's ant: the lit cells it has drawn, where it stands and which way it faces (0 up, 1 right, 2 down, 3 left). */
export interface AntState {
  cells: Frame;
  x: number;
  y: number;
  heading: number;
}

/** The ant alone near the grid centre, facing up. */
export function createAnt(grid: GridSize): AntState {
  return {
    cells: Array.from({ length: grid.cols * grid.rows }, (): Bit => 0),
    x: Math.floor(grid.cols / 2),
    y: Math.floor(grid.rows / 2),
    heading: 0,
  };
}

function flipAt(cells: Frame, index: number): Frame {
  return cells.map((bit, at): Bit => (at === index ? (bit === 1 ? 0 : 1) : bit));
}

/** One Langton step on a torus: turn right on an off cell and left on a lit one, flip the cell, move forward. */
export function stepAnt(state: AntState, grid: GridSize): AntState {
  const index = state.y * grid.cols + state.x;
  const turn = state.cells[index] === 0 ? RIGHT_TURN : LEFT_TURN;
  const heading = (state.heading + turn) % HEADINGS.length;
  const [dx, dy] = HEADINGS[heading];
  return {
    cells: flipAt(state.cells, index),
    x: wrapIndex(state.x + dx, grid.cols),
    y: wrapIndex(state.y + dy, grid.rows),
    heading,
  };
}

/** The exact inverse of `stepAnt`: step back, flip the cell back and undo the turn. */
export function unstepAnt(state: AntState, grid: GridSize): AntState {
  const [dx, dy] = HEADINGS[state.heading];
  const x = wrapIndex(state.x - dx, grid.cols);
  const y = wrapIndex(state.y - dy, grid.rows);
  const cells = flipAt(state.cells, y * grid.cols + x);
  const turn = cells[y * grid.cols + x] === 0 ? RIGHT_TURN : LEFT_TURN;
  return { cells, x, y, heading: wrapIndex(state.heading - turn, HEADINGS.length) };
}

/** The states after 0 to `steps` Langton steps. */
export function runAnt(grid: GridSize, steps: number): AntState[] {
  return Array.from({ length: steps }).reduce<AntState[]>(
    (states) => [...states, stepAnt(states[states.length - 1], grid)],
    [createAnt(grid)],
  );
}

/** The states after undoing 0 to `steps` steps from `state`, using the exact inverse rule. */
export function rewindAnt(state: AntState, grid: GridSize, steps: number): AntState[] {
  return Array.from({ length: steps }).reduce<AntState[]>(
    (states) => [...states, unstepAnt(states[states.length - 1], grid)],
    [state],
  );
}

/** Draws the lit cells, plus the ant's own dot when it is shown. */
export function drawAnt(state: AntState, grid: GridSize, isAntShown: boolean): Frame {
  const antIndex = state.y * grid.cols + state.x;
  return state.cells.map((bit, index): Bit => (bit === 1 || (isAntShown && index === antIndex) ? 1 : 0));
}
