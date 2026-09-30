/**
 * Public types of the `flickering-dots` package.
 * They are the package's API contract: changing a shape is a breaking change and needs a changeset.
 */

/** One cell: 1 is lit, 0 is off. */
export type Bit = 0 | 1;

/** One frame: `cols * rows` cells in row-major order (index = y * cols + x). */
export type Frame = readonly Bit[];

/** Grid dimensions in dots. */
export interface GridSize {
  cols: number;
  rows: number;
}

/** A playable sequence: frames plus one duration (ms) per frame. */
export interface Clip extends GridSize {
  frames: readonly Frame[];
  durations: readonly number[];
  /** Frame shown under reduced motion; the busiest frame when absent. */
  still?: number;
}

/** The four states every app understands. */
export type StandardState = 'idle' | 'thinking' | 'success' | 'error';

/** Standard states plus any custom state name. */
export type StateName = StandardState | (string & {});

/** Id of a built-in procedural recipe. */
export type RecipeId =
  | 'pulse'
  | 'orbit'
  | 'radar'
  | 'ripple'
  | 'snake'
  | 'rain'
  | 'noise'
  | 'life'
  | 'wave'
  | 'bounce'
  | 'scan'
  | 'breathe'
  | 'ellipsis'
  | 'typewriter'
  | 'check'
  | 'cross'
  | 'idle'
  | 'heart'
  | 'arrow'
  | 'hop'
  | 'shimmer'
  | 'scanner'
  | 'bars'
  | 'cascade'
  | 'fill'
  | 'shader'
  | 'particles'
  | 'automaton'
  | 'grow'
  | 'network'
  | 'projection'
  | 'columns'
  | 'trace'
  | 'arcade'
  | 'resolve'
  | 'granular'
  | 'face';

/** Numeric options a recipe takes; each recipe reads the ones it uses and ignores the rest. */
export interface RecipeNumberParams {
  frames?: number;
  trail?: number;
  length?: number;
  density?: number;
  seed?: number;
}

/** Options a recipe takes; each recipe reads the ones it uses and ignores the rest. */
export interface RecipeParams extends RecipeNumberParams {
  /** Named variant of the recipe's engine; each recipe accepts its own list. */
  variant?: string;
  /** Mask the recipe draws or resolves to, such as check, cross, sparkle or plus. */
  glyph?: string;
}

/** A state rendered from a procedural recipe at render time. */
export interface RecipeStateDef {
  kind: 'recipe';
  recipe: RecipeId;
  params?: RecipeParams;
  /** Per-state on-colour override. */
  on?: string;
}

/** A state stored as explicit frames. */
export interface FramesStateDef {
  kind: 'frames';
  frames: readonly Frame[];
  durations: readonly number[];
  on?: string;
}

/** How one state is drawn: from a recipe or from explicit frames. */
export type StateDef = RecipeStateDef | FramesStateDef;

/** How the indicator moves into a new state: at once, by a column wipe or by a dip. */
export type Transition = 'cut' | 'flip' | 'crossfade';

/** What a set is for, used to group the Library. */
export type Intent = 'thinking' | 'loading' | 'progress' | 'result' | 'playful' | 'icons';

/** A place in an interface where an indicator is shown. */
export type ContextId = 'chat' | 'terminal' | 'button' | 'inline' | 'card' | 'page' | 'splash';

/** Where a set comes from: shipped with the package or saved by the user. */
export type SetSource = 'builtin' | 'mine';

/** A named set of states drawn on one dot grid. */
export interface IndicatorSet extends GridSize {
  id: string;
  name: string;
  description?: string;
  /** Keys are state names; order of display follows STATE_ORDER then insertion order. */
  states: Readonly<Record<string, StateDef>>;
  transition: Transition;
  /** Per-state transition used when entering that state. */
  transitions?: Readonly<Partial<Record<string, Transition>>>;
  tags: readonly string[];
  author: string;
  source: SetSource;
  intent?: Intent;
  contexts?: readonly ContextId[];
  collections?: readonly string[];
  /** ISO date (YYYY-MM-DD), used for the Newest sort. */
  addedAt?: string;
  /** ISO timestamp of the last edit (sets the user saved). */
  updatedAt?: string;
}

/** Result of resolving one state of a set. */
export interface ResolvedState extends Clip {
  state: StateName;
  on?: string;
}

/** Size and timing figures of a set. */
export interface SetStats {
  /** Total frames across all states. */
  frames: number;
  /** Cycle length of the thinking state, or the first state, in ms. */
  cycleMs: number;
  states: number;
}

/** How lit dots are drawn: flat, flip-dot turns or LED glow. */
export type RenderMode = 'flat' | 'flip' | 'led';
/** Shape of each dot. */
export type DotShape = 'circle' | 'square' | 'rounded' | 'diamond';
/** Order frames play in. */
export type PlayDirection = 'forward' | 'reverse' | 'pingpong';

/** Look and playback settings applied to every state. `null` colours follow the theme tokens. */
export interface Tuning {
  on: string | null;
  off: string | null;
  mode: RenderMode;
  shape: DotShape;
  /** Gap as a fraction of one dot (0 to 0.8). */
  gap: number;
  /** Playback multiplier (0.25 to 3). */
  speed: number;
  direction: PlayDirection;
  /** Rendered width in px (12 to 64 in the tuning tray). */
  size: number;
}

/** A curated group of built-in sets. */
export interface Collection {
  id: string;
  name: string;
  description: string;
}

/** Display label for an intent. */
export interface IntentInfo {
  id: Intent;
  label: string;
}

/** Display label for a recipe. */
export interface RecipeInfo {
  id: RecipeId;
  label: string;
  /** Params a sheet starts from when this recipe is picked, such as the engine's default variant. */
  params?: RecipeParams;
}

/** Plain JSON form of a set, fully resolved to frames (see Docs, Data format). */
export interface SetData {
  version: 1;
  id?: string;
  name: string;
  grid: [cols: number, rows: number];
  transition: Transition;
  encoding: 'rows-bitmask-msb-left';
  states: Record<string, { durations: number[]; frames: number[][]; on?: string }>;
  /** Per-state transition used when entering that state. */
  transitions?: Partial<Record<string, Transition>>;
  tags?: string[];
  author?: string;
}

/** Options for drawing the Flickering Dots mark as SVG. */
export interface MarkSvgOptions {
  /** 5 renders the 5x5 asterisk, 3 renders the 3x3 plus used at 16px. */
  grid: 5 | 3;
  on: string;
  /** Off-dot colour; omit or null to leave off dots out. */
  off?: string | null;
  /** Output width and height in px; defaults to the natural size. */
  px?: number;
}
