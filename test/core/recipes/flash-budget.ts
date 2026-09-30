import type { RecipeOutput } from '../../../src/core/recipes';
import type { Frame, GridSize } from '../../../src/core/types';

import { countPeakBigChanges } from '../../presets/wow/emergence-flashes';

export const MAX_BIG_CHANGES_PER_SECOND = 6;

export function peakBigChanges(output: RecipeOutput, grid: GridSize, isLoop: boolean): number {
  return countPeakBigChanges({ ...output, ...grid }, isLoop);
}

export function isolatedCells(frame: Frame, grid: GridSize, isEdgeOpen = false): number {
  const lit = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && frame[y * grid.cols + x] === 1;
  return frame.filter((bit, index) => {
    if (bit !== 1) return false;
    const x = index % grid.cols;
    const y = Math.floor(index / grid.cols);
    if (isEdgeOpen && (x === 0 || x === grid.cols - 1)) return false;
    const around = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const));
    return !around.some(([dx, dy]) => (dx !== 0 || dy !== 0) && lit(x + dx, y + dy));
  }).length;
}
