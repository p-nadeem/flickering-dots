import type { IndicatorSet } from '../../core/types';
import { BUILTIN, CROSS_STATE } from '../shared';

const ADDED_AT = '2026-09-29';
const DEMOSCENE = 'demoscene';
const LAVA_BALLS = 3;
const VOICE_SEED = 5;
const SPIRAL_IDLE_DUTY = 0.25;
const SPIRAL_DUTY = 0.3;
const DEEP_ARMS = 2;
const DEEP_FRAMES = 12;

/** The Demoscene collection: classic demo effects rebuilt for on and off dots. */
export const DEMOSCENE_SETS = [
  {
    id: 'lava-lamp',
    name: 'Lava Lamp',
    description:
      'Soft blobs drift, touch, merge through a stretching neck and pull apart again, like a lava lamp.',
    intent: 'thinking',
    cols: 12,
    rows: 8,
    states: {
      idle: { kind: 'recipe', recipe: 'shader', params: { variant: 'metaball', length: 1 } },
      thinking: { kind: 'recipe', recipe: 'shader', params: { variant: 'metaball', length: LAVA_BALLS } },
      success: { kind: 'recipe', recipe: 'shader', params: { variant: 'metaball-merge' } },
      error: { kind: 'recipe', recipe: 'shader', params: { variant: 'metaball-drip' } },
      listening: {
        kind: 'recipe',
        recipe: 'shader',
        params: { variant: 'metaball', length: 1, seed: VOICE_SEED },
      },
    },
    transition: 'crossfade',
    tags: ['metaballs', 'blob', 'organic', 'demoscene'],
    contexts: ['card', 'page', 'splash', 'chat'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'corridor',
    name: 'Corridor',
    description: 'Square rings rush out of a drifting vanishing point, like flying down a bending tunnel.',
    intent: 'loading',
    cols: 9,
    rows: 9,
    states: {
      idle: { kind: 'recipe', recipe: 'shader', params: { variant: 'corridor-hover' } },
      thinking: { kind: 'recipe', recipe: 'shader', params: { variant: 'corridor' } },
      success: { kind: 'recipe', recipe: 'shader', params: { variant: 'corridor-land' } },
      error: { kind: 'recipe', recipe: 'shader', params: { variant: 'corridor-reverse' } },
      connecting: { kind: 'recipe', recipe: 'shader', params: { variant: 'corridor-rush' } },
    },
    transition: 'flip',
    tags: ['tunnel', 'demoscene', 'depth', 'rings'],
    contexts: ['splash', 'page', 'card', 'button'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'hyperspace',
    name: 'Hyperspace',
    description: 'Stars drift out of the centre, then stretch into streaks as the jump begins.',
    intent: 'loading',
    cols: 11,
    rows: 11,
    states: {
      idle: { kind: 'recipe', recipe: 'particles', params: { variant: 'warp-drift' } },
      thinking: { kind: 'recipe', recipe: 'particles', params: { variant: 'warp' } },
      success: { kind: 'recipe', recipe: 'particles', params: { variant: 'warp-arrive' } },
      error: { kind: 'recipe', recipe: 'particles', params: { variant: 'warp-stall' } },
    },
    transition: 'crossfade',
    tags: ['starfield', 'space', 'warp', 'launch'],
    contexts: ['splash', 'page', 'card'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'spiral-wave',
    name: 'Spiral Wave',
    description:
      'One arm of an excitable-medium spiral winds out from the centre and turns like a record groove.',
    intent: 'thinking',
    cols: 11,
    rows: 11,
    states: {
      idle: {
        kind: 'recipe',
        recipe: 'shader',
        params: { variant: 'spiral', density: SPIRAL_IDLE_DUTY, frames: 1 },
      },
      thinking: {
        kind: 'recipe',
        recipe: 'shader',
        params: { variant: 'spiral', length: 1, density: SPIRAL_DUTY },
      },
      success: { kind: 'recipe', recipe: 'shader', params: { variant: 'spiral-unwind' } },
      error: CROSS_STATE,
      'deep-thinking': {
        kind: 'recipe',
        recipe: 'shader',
        params: { variant: 'spiral', length: DEEP_ARMS, density: SPIRAL_DUTY, frames: DEEP_FRAMES },
      },
    },
    transition: 'flip',
    tags: ['spiral', 'automaton', 'hypnotic', 'coil'],
    contexts: ['splash', 'page', 'card'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'sandplate',
    name: 'Sand Plate',
    description:
      'Grains jitter like sand on a vibrating plate, then snap into a crisp symmetric figure before the next note shakes them loose.',
    intent: 'thinking',
    cols: 11,
    rows: 11,
    states: {
      idle: { kind: 'recipe', recipe: 'resolve', params: { variant: 'settle', glyph: 'chladni-1' } },
      thinking: { kind: 'recipe', recipe: 'resolve', params: { variant: 'settle', glyph: 'chladni' } },
      success: { kind: 'recipe', recipe: 'resolve', params: { variant: 'settle', glyph: 'check' } },
      error: { kind: 'recipe', recipe: 'resolve', params: { variant: 'settle-fail' } },
    },
    transition: 'cut',
    tags: ['cymatics', 'sand', 'symmetry', 'physics'],
    contexts: ['splash', 'page', 'card'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'vector-balls',
    name: 'Vector Balls',
    description:
      'A cloud of points turns in 3D and flows from cube to sphere to ring to helix, then forms the answer.',
    intent: 'thinking',
    cols: 16,
    rows: 16,
    states: {
      idle: { kind: 'recipe', recipe: 'projection', params: { variant: 'cloud', glyph: 'sphere' } },
      thinking: { kind: 'recipe', recipe: 'projection', params: { variant: 'cloud' } },
      success: { kind: 'recipe', recipe: 'projection', params: { variant: 'cloud', glyph: 'check' } },
      error: { kind: 'recipe', recipe: 'projection', params: { variant: 'cloud', glyph: 'cross' } },
    },
    transition: 'crossfade',
    tags: ['3d', 'points', 'morph', 'demoscene'],
    contexts: ['splash', 'page'],
    collections: [DEMOSCENE],
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
