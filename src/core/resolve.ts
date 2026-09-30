import { build } from './build';
import { createResolve } from './resolver';
import type { ResolveFn } from './resolver';

/** Resolves a state to frames (fallback: thinking, then the first state); `grid` overrides recipe states, and a looping recipe state folds a last frame equal to its first. */
export const resolve: ResolveFn = createResolve(build);
