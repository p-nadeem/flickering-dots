import type { IndicatorSet } from '../core/types';
import { ICON_PRESETS } from './icons';
import { LOADING_PRESETS } from './loading';
import { PLAYFUL_PRESETS } from './playful';
import { PROGRESS_PRESETS } from './progress';
import { RESULT_PRESETS } from './result';
import { THINKING_PRESETS } from './thinking';
import { AILIFE_SETS } from './wow/ai-life';
import { ARCADE_SETS } from './wow/arcade';
import { DEMOSCENE_SETS } from './wow/demoscene';
import { EMERGENCE_SETS } from './wow/emergence';
import { NATURE_SETS } from './wow/nature';
import { SIGNBOARD_SETS } from './wow/signboard';
import { SOLID_SETS } from './wow/solid';

export { COLLECTIONS } from './collections';
export { INTENTS } from './intents';

const WOW_POOL: readonly IndicatorSet[] = [
  ...DEMOSCENE_SETS,
  ...SOLID_SETS,
  ...ARCADE_SETS,
  ...NATURE_SETS,
  ...EMERGENCE_SETS,
  ...AILIFE_SETS,
  ...SIGNBOARD_SETS,
];

const WOW_FEATURED_ORDER: readonly string[] = [
  'vector-balls',
  'corner-hit',
  'fireworks',
  'sandplate',
  'donut',
  'stack-clear',
  'alien-march',
  'brick-wall',
  'reels',
  'pendulum-wave',
  'hourglass',
  'lightning',
  'maze-solve',
  'turing-spots',
  'fireflies',
  'eyes',
  'beam-search',
  'decode',
  'lava-lamp',
  'corridor',
  'hyperspace',
  'spiral-wave',
  'cube',
  'globe',
  'helix',
  'ridgeline',
  'rally',
  'chomper',
  'snake-hunt',
  'runner',
  'dice',
  'campfire',
  'fountain',
  'cradle',
  'slosh',
  'droplet',
  'aurora',
  'orrery',
  'sort-pass',
  'rule-stream',
  'flood-search',
  'ant-rewind',
  'frost',
  'synapse',
  'constellation',
  'critter',
  'morph',
  'circuit',
  'split-flap',
  'departure-board',
  'ecg-trace',
  'spirograph',
  'coin-flip',
  'snowfall',
  'countdown',
  'scope',
];

const WOW_PRESETS: readonly IndicatorSet[] = WOW_FEATURED_ORDER.flatMap((id) =>
  WOW_POOL.filter((set) => set.id === id),
);

/** The 29 original sets grouped by intent, then the 56 wow sets by wow score, in Featured order. */
export const PRESETS: readonly IndicatorSet[] = [
  ...THINKING_PRESETS,
  ...LOADING_PRESETS,
  ...PROGRESS_PRESETS,
  ...RESULT_PRESETS,
  ...PLAYFUL_PRESETS,
  ...ICON_PRESETS,
  ...WOW_PRESETS,
];

/** Returns the built-in set with this id, or undefined when there is none. */
export function getPreset(id: string): IndicatorSet | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
