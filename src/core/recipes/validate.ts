import { GRID_MAX, GRID_MIN } from '../constants';
import type { GridSize, RecipeParams } from '../types';

const ERROR_PREFIX = 'flickering-dots build:';
const COUNT_PARAMS = ['frames', 'trail', 'length'] as const;
const COUNT_MAX = 256;
const DENSITY_MAX = 1;
const TEXT_PARAMS = ['variant', 'glyph'] as const;
const TEXT_MAX = 64;
const VOWEL_START = /^[aeiou]/i;

type TextParam = (typeof TEXT_PARAMS)[number];

export const NO_GLYPHS: readonly string[] = [];

/** Values a recipe accepts for `variant` and `glyph`; an absent entry accepts any text. */
export interface RecipeOptionRules {
  variants?: readonly string[];
  glyphs?: readonly string[] | ((glyph: string) => boolean);
}

function formatValue(value: unknown): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWholeNumberWithin(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function assertGridSide(name: 'cols' | 'rows', value: unknown): void {
  if (isWholeNumberWithin(value, GRID_MIN, GRID_MAX)) return;
  throw new Error(
    `${ERROR_PREFIX} grid.${name} must be a whole number from ${GRID_MIN} to ${GRID_MAX}, got ${formatValue(value)}`,
  );
}

/** Throws a readable `Error` unless `grid` has whole-number sides from `GRID_MIN` to `GRID_MAX`. */
export function assertRecipeGrid(grid: unknown): asserts grid is GridSize {
  if (!isObject(grid)) throw new Error(`${ERROR_PREFIX} grid must be an object with cols and rows`);
  assertGridSide('cols', grid.cols);
  assertGridSide('rows', grid.rows);
}

function assertCount(name: (typeof COUNT_PARAMS)[number], value: unknown): void {
  if (value === undefined || isWholeNumberWithin(value, 0, COUNT_MAX)) return;
  throw new Error(
    `${ERROR_PREFIX} params.${name} must be a whole number from 0 to ${COUNT_MAX}, got ${formatValue(value)}`,
  );
}

function assertDensity(value: unknown): void {
  if (value === undefined) return;
  if (typeof value === 'number' && value >= 0 && value <= DENSITY_MAX) return;
  throw new Error(
    `${ERROR_PREFIX} params.density must be a number from 0 to ${DENSITY_MAX}, got ${formatValue(value)}`,
  );
}

function assertSeed(value: unknown): void {
  if (value === undefined || (typeof value === 'number' && Number.isFinite(value))) return;
  throw new Error(`${ERROR_PREFIX} params.seed must be a finite number, got ${formatValue(value)}`);
}

function assertText(name: TextParam, value: unknown): void {
  if (value === undefined) return;
  if (typeof value === 'string' && value.length > 0 && value.length <= TEXT_MAX) return;
  throw new Error(
    `${ERROR_PREFIX} params.${name} must be text of 1 to ${TEXT_MAX} characters, got ${formatValue(value)}`,
  );
}

/** Throws a readable `Error` unless every recipe param present is in range. */
export function assertRecipeParams(params: unknown): asserts params is RecipeParams {
  if (!isObject(params)) throw new Error(`${ERROR_PREFIX} params must be an object`);
  COUNT_PARAMS.forEach((name) => assertCount(name, params[name]));
  assertDensity(params.density);
  assertSeed(params.seed);
  TEXT_PARAMS.forEach((name) => assertText(name, params[name]));
}

function withArticle(noun: string): string {
  return VOWEL_START.test(noun) ? `an ${noun}` : `a ${noun}`;
}

function allowedHint(allowed: RecipeOptionRules['glyphs']): string {
  if (allowed === undefined || typeof allowed === 'function') return '';
  return allowed.length === 0 ? '; the recipe takes none' : `; use one of ${allowed.join(', ')}`;
}

function isAllowed(value: string, allowed: RecipeOptionRules['glyphs']): boolean {
  if (allowed === undefined) return true;
  return typeof allowed === 'function' ? allowed(value) : allowed.includes(value);
}

function assertAllowed(
  recipe: string,
  name: TextParam,
  value: string | undefined,
  allowed: RecipeOptionRules['glyphs'],
): void {
  if (value === undefined || isAllowed(value, allowed)) return;
  throw new Error(
    `${ERROR_PREFIX} params.${name} ${formatValue(value)} is not ${withArticle(recipe)} ${name}${allowedHint(allowed)}`,
  );
}

/** Throws a readable `Error` when `variant` or `glyph` is not one the recipe's rules accept. */
export function assertRecipeOptions(
  recipe: string,
  params: RecipeParams,
  rules: RecipeOptionRules | undefined,
): void {
  if (rules === undefined) return;
  assertAllowed(recipe, 'variant', params.variant, rules.variants);
  assertAllowed(recipe, 'glyph', params.glyph, rules.glyphs);
}
