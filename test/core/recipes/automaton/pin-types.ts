import type { GridSize, RecipeParams } from '../../../../src/core/types';

export interface VariantPin {
  name: string;
  grid: GridSize;
  params: RecipeParams;
  count: number;
  digest: number;
  still: number | undefined;
  totalMs: number;
  frames?: readonly string[];
  durations?: readonly number[];
  samples?: readonly [first: string, middle: string, last: string];
}
