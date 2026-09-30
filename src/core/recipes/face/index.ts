import type { GridSize, RecipeParams } from '../../types';
import type { RecipeOutput } from '../helpers';
import { generateGlance } from './glance';
import { generateRead, generateSleepy, generateWide } from './gaze';
import { getFaceLayout } from './layout';
import type { FaceLayout } from './layout';
import { generateAngry, generateHappy } from './moods';

/** Variants of the `face` recipe, the robot eyes engine. */
export const FACE_VARIANTS = ['glance', 'sleepy', 'wide', 'read', 'happy', 'angry'] as const;

/** One variant of the `face` recipe. */
export type FaceVariant = (typeof FACE_VARIANTS)[number];

/** Default params of the `face` recipe. */
export const FACE_DEFAULTS = { variant: 'glance', seed: 1 } as const satisfies RecipeParams;

const BUILDERS: Readonly<Record<FaceVariant, (layout: FaceLayout, seed: number) => RecipeOutput>> = {
  glance: generateGlance,
  sleepy: generateSleepy,
  wide: generateWide,
  read: generateRead,
  happy: generateHappy,
  angry: generateAngry,
};

function isFaceVariant(name: string): name is FaceVariant {
  return (FACE_VARIANTS as readonly string[]).includes(name);
}

/** Two rounded robot eyes that glance, doze, listen, read, smile or glare, sized to the grid. */
export function generateFace(grid: GridSize, params: RecipeParams = {}): RecipeOutput {
  const variant = params.variant ?? FACE_DEFAULTS.variant;
  if (!isFaceVariant(variant)) {
    throw new Error(
      `flickering-dots face: unknown variant "${variant}"; use one of ${FACE_VARIANTS.join(', ')}`,
    );
  }
  return BUILDERS[variant](getFaceLayout(grid), params.seed ?? FACE_DEFAULTS.seed);
}
