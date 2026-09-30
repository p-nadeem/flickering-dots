import * as React from 'react';

import type {
  Clip,
  DotShape,
  GridSize,
  IndicatorSet,
  PlayDirection,
  RecipeId,
  RecipeParams,
  RenderMode,
  StateName,
  Transition,
  Tuning,
} from '../core/types';
import type { DotsElement } from '../element';
import { defineDotsElement, DOTS_TAG } from '../element';
import { assignDotsProperties, toDotsProperties } from './dots-properties';

/** Props of DotIndicator. Individual look props (on, off, mode, shape, gap, speed, direction, size) win over `tuning`. */
export interface DotIndicatorProps {
  /** Preset id or a full set. */
  set?: IndicatorSet | string;
  /** State to play; changing it plays the set's transition. */
  state?: StateName;
  /** Explicit frames; overrides set and state. */
  clip?: Clip;
  /** Render a recipe directly (Generate and recipe previews). */
  recipe?: RecipeId;
  /** Params for `recipe`. */
  params?: RecipeParams;
  /** Grid for `recipe`, or an override for a set's recipe states. */
  grid?: GridSize;
  /** Look settings as one object; the individual look props win over it. */
  tuning?: Partial<Tuning>;
  /** Width in px; height follows the grid. Defaults to 24. */
  size?: number;
  /** Lit dot colour; defaults to var(--dot-on). */
  on?: string;
  /** Unlit dot colour; defaults to var(--dot-off). */
  off?: string;
  /** flat, flip or led. */
  mode?: RenderMode;
  /** circle, square, rounded or diamond. */
  shape?: DotShape;
  /** Space between dots as a fraction of one dot. */
  gap?: number;
  /** Playback multiplier. */
  speed?: number;
  /** forward, reverse or pingpong. */
  direction?: PlayDirection;
  /** cut, flip or crossfade; overrides the set's transition. */
  transition?: Transition;
  /** Holds the current frame. */
  paused?: boolean;
  /** Show one frame, no playback (scrubbing, static marks). */
  frame?: number;
  /** Cycle through the set's states every 2.4 s (Library cards). */
  cycle?: boolean;
  /** Force reduced motion. */
  reduced?: boolean;
  /** Click on frame changes when sound is enabled. */
  audible?: boolean;
  /** Accessible label; defaults to the state name. Pass an empty string to hide from assistive tech. */
  label?: string;
  /** Class names for the flickering-dots element. */
  className?: string;
}

const useClientLayoutEffect =
  typeof globalThis.document === 'undefined' ? React.useEffect : React.useLayoutEffect;

/** Renders a flickering-dots element and passes every prop to it as a property, objects as objects. */
export function DotIndicator(props: DotIndicatorProps): React.ReactElement {
  const elementRef = React.useRef<DotsElement | null>(null);

  useClientLayoutEffect(() => {
    if (elementRef.current === null) return;
    assignDotsProperties(elementRef.current, toDotsProperties(props));
  });

  useClientLayoutEffect(() => {
    defineDotsElement();
  }, []);

  return React.createElement(DOTS_TAG, { ref: elementRef, class: props.className });
}
