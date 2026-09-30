import type { RecipeOutput } from '../../../src/core/recipes';
import type { Frame } from '../../../src/core/types';

export interface OutputText {
  frames: string[];
  durations: number[];
}

export function toFrameText(frame: Frame, cols: number): string {
  const rowCount = Math.ceil(frame.length / cols);
  return Array.from({ length: rowCount }, (_, y) => frame.slice(y * cols, (y + 1) * cols).join('')).join(' ');
}

export function toOutputText(output: RecipeOutput, cols: number): OutputText {
  return { frames: output.frames.map((frame) => toFrameText(frame, cols)), durations: output.durations };
}

export function countLit(frame: Frame): number {
  return frame.filter((bit) => bit === 1).length;
}
