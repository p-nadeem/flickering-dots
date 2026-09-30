import { glyphMask, isGlyphName } from '../../glyphs';
import type { Frame, GridSize, RecipeParams } from '../../types';
import { spaceBigChanges } from '../flash-spacing';
import type { RecipeOutput } from '../helpers';
import { RESULT_HOLD_MS, withLastDuration } from './frames';
import { drawHistory, findCycle, runRows, seedRow } from './rule-sim';
import type { RingLayout, Row, RowCycle } from './rule-sim';

const INT_BITS = 32;
const SIERPINSKI_RULE = 90;
const CHAOS_RULE = 30;
const IDENTITY_RULE = 204;
const STREAM_MS = 90;
const CHAOS_MS = 170;
const BLOOM_MS = 60;
const BLOOM_HOLD_MS = 240;
const BLINK_MS = 250;
const BLINKS = 2;
const FREEZE_ROWS_BEFORE_FULL = 3;
const CHAOS_MIN_WIDTH = 3;
const CHAOS_MIN_PERIOD = 12;
const CHAOS_MAX_PERIOD = 110;
const CHAOS_SEARCH_STEPS = 256;
const LIVELY_RANK = 10000;
const COVERAGE_RANK = 100;

function getPowerRing(cols: number): RingLayout {
  const width = 1 << (INT_BITS - 1 - Math.clz32(cols));
  return { width, copies: 1, offset: Math.floor((cols - width) / 2) };
}

function getBloomSteps(layout: RingLayout): number {
  return layout.width / 2;
}

function sierpinskiView(grid: GridSize): (newest: number) => Frame {
  const layout = getPowerRing(grid.cols);
  const rows = runRows(seedRow(layout), SIERPINSKI_RULE, getBloomSteps(layout));
  return (newest) => drawHistory(grid, layout, (step) => (step < 0 ? undefined : rows[step]), newest);
}

/** Rule 90 from one seed on a power-of-two ring: a Sierpinski triangle grows, annihilates and scrolls away. */
export function generateRule90(grid: GridSize, params: RecipeParams): RecipeOutput {
  const layout = getPowerRing(grid.cols);
  const view = sierpinskiView(grid);
  const grown = getBloomSteps(layout) - 1;
  if (params.frames === 1) return { frames: [view(grown)], durations: [STREAM_MS] };
  if (params.glyph !== undefined && isGlyphName(params.glyph)) {
    const bloom = Array.from({ length: grown + 1 }, (_, step) => view(step));
    const durations = withLastDuration(
      bloom.map(() => BLOOM_MS),
      BLOOM_HOLD_MS,
    );
    return { frames: [...bloom, glyphMask(params.glyph, grid)], durations: [...durations, RESULT_HOLD_MS] };
  }
  const frames = Array.from({ length: getBloomSteps(layout) + grid.rows }, (_, step) => view(step));
  return {
    frames,
    durations: spaceBigChanges(
      frames,
      frames.map(() => STREAM_MS),
      true,
    ),
    still: grown,
  };
}

interface ChaosRing {
  layout: RingLayout;
  cycle: RowCycle;
}

function getChaosRing(cols: number, width: number): ChaosRing | undefined {
  const copies = Math.floor(cols / width);
  const layout = { width, copies, offset: Math.floor((cols - width * copies) / 2) };
  const cycle = findCycle(seedRow({ ...layout, copies: 1 }), CHAOS_RULE, CHAOS_SEARCH_STEPS);
  if (cycle === undefined || cycle.period > CHAOS_MAX_PERIOD) return undefined;
  return { layout, cycle };
}

function rankChaosRing(ring: ChaosRing): number {
  const coverage = ring.layout.width * ring.layout.copies;
  const isLively = ring.cycle.period >= CHAOS_MIN_PERIOD ? 1 : 0;
  return isLively * LIVELY_RANK + coverage * COVERAGE_RANK + ring.layout.width;
}

function pickChaosRing(cols: number): ChaosRing {
  const widths = Array.from(
    { length: Math.max(1, cols - CHAOS_MIN_WIDTH + 1) },
    (_, index) => CHAOS_MIN_WIDTH + index,
  );
  const rings = widths.flatMap((width) => getChaosRing(cols, width) ?? []);
  const best = rings.reduce<ChaosRing | undefined>(
    (winner, ring) => (winner === undefined || rankChaosRing(ring) > rankChaosRing(winner) ? ring : winner),
    undefined,
  );
  if (best === undefined) throw new Error(`flickering-dots automaton: no rule 30 ring fits ${cols} columns`);
  return best;
}

/** Rule 30 from one seed per ring copy, shown only once it repeats, so the chaotic stream loops exactly. */
export function generateRule30(grid: GridSize): RecipeOutput {
  const { layout, cycle } = pickChaosRing(grid.cols);
  const first = cycle.start + grid.rows - 1;
  const rows = runRows(seedRow(layout), CHAOS_RULE, first + cycle.period);
  const frames = Array.from({ length: cycle.period }, (_, index) =>
    drawHistory(grid, layout, (step) => rows[step], first + index),
  );
  return { frames, durations: frames.map(() => CHAOS_MS) };
}

function frozenStream(grid: GridSize): Frame[] {
  const layout = getPowerRing(grid.cols);
  const stuckStep = Math.max(1, getBloomSteps(layout) - FREEZE_ROWS_BEFORE_FULL);
  const grown = runRows(seedRow(layout), SIERPINSKI_RULE, stuckStep + 1);
  const history = [...grown, ...runRows(grown[stuckStep], IDENTITY_RULE, grid.rows).slice(1)];
  const rowAt = (step: number): Row | undefined => (step < 0 ? undefined : history[step]);
  return Array.from({ length: grid.rows }, (_, index) => drawHistory(grid, layout, rowAt, stuckStep + index));
}

/** Rule 204 copies the last row forever: the stream fills with it until the view is frozen, then blinks twice. */
export function generateRule204(grid: GridSize): RecipeOutput {
  const stream = frozenStream(grid);
  const frozen = stream[stream.length - 1];
  const blank = frozen.map(() => 0 as const);
  const blinks = Array.from({ length: BLINKS }, () => [blank, frozen]).flat();
  const durations = [...stream.map(() => STREAM_MS), ...blinks.map(() => BLINK_MS)];
  return { frames: [...stream, ...blinks], durations: withLastDuration(durations, RESULT_HOLD_MS) };
}
