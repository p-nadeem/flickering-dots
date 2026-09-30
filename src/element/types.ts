import type {
  Clip,
  DotShape,
  IndicatorSet,
  PlayDirection,
  RecipeId,
  RecipeParams,
  RenderMode,
  SetData,
  StateName,
  Transition,
  Tuning,
} from '../core/types';

/** A boolean property: true, or any attribute text except "false" and "0", turns it on. */
export type DotsFlag = boolean | string | null;

/** A number property, as a number or as attribute text. */
export type DotsNumber = number | string | null;

/** Properties of a flickering-dots element. Each mirrors the attribute of the same name and reads back what was set. */
export interface DotsElementProperties {
  /** Preset id, a set object, or set JSON (the SetData export format works too). Defaults to the pulse preset. */
  set: IndicatorSet | SetData | string | null;
  /** State to play; changing it plays the set's transition. */
  state: StateName | null;
  /** Recipe to render directly instead of a set. */
  recipe: RecipeId | (string & {}) | null;
  /** Params for `recipe`, as an object or JSON. */
  params: RecipeParams | string | null;
  /** Explicit clip { frames, durations, cols, rows }, as an object or JSON; overrides set, state and recipe. */
  frames: Clip | string | null;
  /** Grid columns for `recipe`, or an override for a set's recipe states. */
  cols: DotsNumber;
  /** Grid rows for `recipe`, or an override for a set's recipe states. */
  rows: DotsNumber;
  /** Look settings as one object or JSON; the single properties below win over it. */
  tune: Partial<Tuning> | string | null;
  /** Lit dot colour; defaults to var(--dot-on, #e4ff3e). */
  on: string | null;
  /** Unlit dot colour; defaults to var(--dot-off, #26272d). */
  off: string | null;
  /** flat, flip or led. */
  mode: RenderMode | (string & {}) | null;
  /** circle, square, rounded or diamond. */
  shape: DotShape | (string & {}) | null;
  /** Space between dots as a fraction of one dot. */
  gap: DotsNumber;
  /** Playback multiplier. */
  speed: DotsNumber;
  /** forward, reverse or pingpong. */
  direction: PlayDirection | (string & {}) | null;
  /** Width in px; height follows the grid. Defaults to 24. */
  size: DotsNumber;
  /** Holds the current frame. */
  paused: DotsFlag;
  /** Shows one frame index with no playback. */
  frame: DotsNumber;
  /** Steps through the set's states every 2.4 s. */
  cycle: DotsFlag;
  /** Forces reduced motion: the busiest frame, no playback. */
  reduced: DotsFlag;
  /** Clicks on frame changes once setDotSoundEnabled(true) has been called. */
  audible: DotsFlag;
  /** cut, flip or crossfade; overrides the set's transition. */
  transition: Transition | (string & {}) | null;
  /** Accessible label; defaults to the state name. An empty label hides the element from assistive tech. */
  label: string | null;
}

/** A flickering-dots element. */
export type DotsElement = HTMLElement & DotsElementProperties;

declare global {
  interface HTMLElementTagNameMap {
    'flickering-dots': DotsElement;
  }
}
