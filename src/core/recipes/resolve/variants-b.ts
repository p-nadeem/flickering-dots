import type { RecipeFn } from '../helpers';
import { generateFont } from './font';
import { generateFontDone, generateFontFail, generateFontWait } from './font-results';
import { generateSegments } from './segments';
import { generateSegmentsDone, generateSegmentsFail } from './segments-results';

/** Resolve variants for the departure-board and countdown sets. */
export const VARIANTS_B: Readonly<Record<string, RecipeFn>> = {
  font: generateFont,
  'font-wait': generateFontWait,
  'font-done': generateFontDone,
  'font-fail': generateFontFail,
  segments: generateSegments,
  'segments-done': generateSegmentsDone,
  'segments-fail': generateSegmentsFail,
};
