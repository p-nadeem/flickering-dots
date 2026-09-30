import type { RecipeFn } from '../helpers';
import { generateFlap, generateFlapBand, generateFlapRest, generateFlapRtl } from './flap';
import { generateMorph, MORPH_GLYPHS } from './morph';
import { generateRainReveal } from './rain';
import { generateSettle, generateSettleFail, SETTLE_GLYPHS } from './settle';

/** Resolve variants for the decode, split-flap, morph and sandplate sets. */
export const VARIANTS_A: Readonly<Record<string, RecipeFn>> = {
  rain: generateRainReveal,
  flap: generateFlap,
  'flap-rtl': generateFlapRtl,
  'flap-band': generateFlapBand,
  'flap-rest': generateFlapRest,
  morph: generateMorph,
  settle: generateSettle,
  'settle-fail': generateSettleFail,
};

/** Every glyph name the variants in `VARIANTS_A` accept; each variant still checks its own list. */
export const GLYPHS_A: readonly string[] = [...new Set([...MORPH_GLYPHS, ...SETTLE_GLYPHS])];
