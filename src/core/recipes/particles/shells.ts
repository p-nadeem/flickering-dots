import type { GridSize } from '../../types';
import type { Point, RecipeOutput } from '../helpers';
import { stepsToOutput } from './steps';
import type { Step } from './steps';

const SHELL_GAP_MS = 400;
const MIN_STEP_MS = 33;

/** Where one firework shell launches and bursts, and the seed of its sparks. */
export interface Shell {
  x: number;
  apex: number;
  seed: number;
}

interface TimedStep extends Step {
  start: number;
}

function toTimed(steps: readonly Step[], offset: number): TimedStep[] {
  return steps.reduce<TimedStep[]>((timed, step) => {
    const last = timed[timed.length - 1];
    const start = last ? last.start + last.ms : offset;
    return [...timed, { ...step, start }];
  }, []);
}

function pointsAt(timelines: readonly TimedStep[][], time: number): Point[] {
  return timelines.flatMap((timeline) => {
    const active = timeline.find(({ start, ms }) => time >= start && time < start + ms);
    return active ? [...active.points] : [];
  });
}

function getEnd(timelines: readonly TimedStep[][]): number {
  return Math.max(
    ...timelines.map((timeline) => {
      const last = timeline[timeline.length - 1];
      return last.start + last.ms;
    }),
  );
}

function foldShortSteps(steps: readonly Step[]): Step[] {
  return steps.reduceRight<Step[]>((kept, step) => {
    const [next, ...rest] = kept;
    if (next === undefined || step.ms >= MIN_STEP_MS) return [step, ...kept];
    return [{ ...next, ms: next.ms + step.ms }, ...rest];
  }, []);
}

/** Plays shell timelines launched `SHELL_GAP_MS` apart as one clip, giving slivers under two display frames (33 ms) to the frame after, then `darkMs` of empty sky. */
export function playShells(grid: GridSize, shellSteps: readonly Step[][], darkMs: number): RecipeOutput {
  const timelines = shellSteps.map((steps, index) => toTimed(steps, index * SHELL_GAP_MS));
  const end = getEnd(timelines);
  const cuts = [...new Set(timelines.flat().flatMap(({ start, ms }) => [start, start + ms]))]
    .filter((time) => time < end)
    .sort((a, b) => a - b);
  const steps = cuts.map((time, index): Step => ({
    points: pointsAt(timelines, time),
    ms: (cuts[index + 1] ?? end) - time,
  }));
  return stepsToOutput(grid, [...foldShortSteps(steps), { points: [], ms: darkMs }]);
}
