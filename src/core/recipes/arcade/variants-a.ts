import type { RecipeFn } from '../helpers';
import { CHOMP_VARIANTS } from './chomp';
import { HUNT_VARIANTS } from './hunt';
import { MARCH_VARIANTS } from './march';
import { RALLY_VARIANTS } from './rally';
import { STACK_VARIANTS } from './stack';

/** Arcade variants of stack-clear, rally, alien-march, chomper and snake-hunt. */
export const VARIANTS_A: Readonly<Record<string, RecipeFn>> = {
  ...STACK_VARIANTS,
  ...RALLY_VARIANTS,
  ...MARCH_VARIANTS,
  ...CHOMP_VARIANTS,
  ...HUNT_VARIANTS,
};
