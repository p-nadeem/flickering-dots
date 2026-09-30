import type { RecipeFn } from '../helpers';
import {
  generateEcg,
  generateEcgFlat,
  generateEcgIrregular,
  generateEcgRise,
  generateEcgSkip,
  generateEcgSlow,
} from './ecg';
import {
  generateHelix,
  generateHelixFast,
  generateHelixSlow,
  generateHelixUnravel,
  generateHelixZip,
} from './helix';
import { generatePendulum, generatePendulumDrop, generatePendulumSync } from './pendulum';
import {
  generateSlosh,
  generateSloshCycle,
  generateSloshDrain,
  generateSloshFull,
  generateSloshProgress,
} from './slosh';

/** Columns variants for the pendulum-wave, helix, slosh and ecg-trace sets. */
export const VARIANTS_A: Readonly<Record<string, RecipeFn>> = {
  pendulum: generatePendulum,
  'pendulum-sync': generatePendulumSync,
  'pendulum-drop': generatePendulumDrop,
  helix: generateHelix,
  'helix-slow': generateHelixSlow,
  'helix-fast': generateHelixFast,
  'helix-zip': generateHelixZip,
  'helix-unravel': generateHelixUnravel,
  slosh: generateSlosh,
  'slosh-cycle': generateSloshCycle,
  'slosh-progress': generateSloshProgress,
  'slosh-full': generateSloshFull,
  'slosh-drain': generateSloshDrain,
  ecg: generateEcg,
  'ecg-slow': generateEcgSlow,
  'ecg-skip': generateEcgSkip,
  'ecg-irregular': generateEcgIrregular,
  'ecg-rise': generateEcgRise,
  'ecg-flat': generateEcgFlat,
};
