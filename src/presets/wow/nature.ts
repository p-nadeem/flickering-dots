import type { IndicatorSet } from '../../core/types';
import { CAMPFIRE_SET, FIREWORKS_SET, FOUNTAIN_SET, SLOSH_SET } from './nature-elements';
import { CRADLE_SET, HOURGLASS_SET, ORRERY_SET, PENDULUM_WAVE_SET } from './nature-mechanics';
import { AURORA_SET, DROPLET_SET, LIGHTNING_SET, SNOWFALL_SET } from './nature-sky';

/** The Nature and physics collection: fire, water, sand, sky and swinging things, in Library order. */
export const NATURE_SETS = [
  CAMPFIRE_SET,
  FIREWORKS_SET,
  FOUNTAIN_SET,
  PENDULUM_WAVE_SET,
  CRADLE_SET,
  HOURGLASS_SET,
  SLOSH_SET,
  DROPLET_SET,
  LIGHTNING_SET,
  AURORA_SET,
  SNOWFALL_SET,
  ORRERY_SET,
] as const satisfies readonly IndicatorSet[];
