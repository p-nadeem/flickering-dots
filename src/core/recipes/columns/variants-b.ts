import type { RecipeFn } from '../helpers';
import { generateAurora, generateAuroraLevel } from './aurora';
import { generateAuroraFade, generateAuroraFull } from './aurora-moments';
import { generateCradle, generateCradleRest, generateCradleSlow } from './cradle';
import { generateCradleDamp, generateCradleLost } from './cradle-moments';
import { generateRidge, generateRidgeLevel } from './ridge';
import { generateRidgeSettle, generateRidgeSpike } from './ridge-moments';
import {
  generateSort,
  generateSortBogo,
  generateSortDone,
  generateSortInsert,
  generateSortVerify,
} from './sort';

/** Columns variants for the ridgeline, aurora, sort-pass and cradle sets, keyed by variant id. */
export const VARIANTS_B: Readonly<Record<string, RecipeFn>> = {
  ridge: generateRidge,
  'ridge-level': generateRidgeLevel,
  'ridge-settle': generateRidgeSettle,
  'ridge-spike': generateRidgeSpike,
  aurora: generateAurora,
  'aurora-level': generateAuroraLevel,
  'aurora-full': generateAuroraFull,
  'aurora-fade': generateAuroraFade,
  sort: generateSort,
  'sort-done': generateSortDone,
  'sort-insert': generateSortInsert,
  'sort-verify': generateSortVerify,
  'sort-bogo': generateSortBogo,
  cradle: generateCradle,
  'cradle-rest': generateCradleRest,
  'cradle-slow': generateCradleSlow,
  'cradle-damp': generateCradleDamp,
  'cradle-lost': generateCradleLost,
};
