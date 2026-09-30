import type { IndicatorSet } from '../../core/types';
import { BUILTIN } from '../shared';

const ADDED_AT = '2026-09-29';
const COLLECTIONS = ['solid'] as const;
const GLOBE_STILL_FRAMES = 1;
const RIDGE_CALM_DENSITY = 0;
const DONUT_COOKING_FRAMES = 28;

/** The 3D collection: wireframes and solids that turn in space. */
export const SOLID_SETS = [
  {
    id: 'cube',
    name: 'Wireframe Cube',
    description: 'A tilted wireframe cube turns steadily, its front and back faces trading places.',
    intent: 'thinking',
    cols: 12,
    rows: 12,
    states: {
      idle: { kind: 'recipe', recipe: 'projection', params: { variant: 'cube-rest' } },
      thinking: { kind: 'recipe', recipe: 'projection', params: { variant: 'cube' } },
      waiting: { kind: 'recipe', recipe: 'projection', params: { variant: 'cube-wait' } },
      success: { kind: 'recipe', recipe: 'projection', params: { variant: 'cube-land' } },
      error: { kind: 'recipe', recipe: 'projection', params: { variant: 'cube-shake' } },
    },
    transition: 'flip',
    tags: ['3d', 'wireframe', 'cube', 'compute'],
    contexts: ['splash', 'page', 'card', 'chat'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'globe',
    name: 'Globe',
    description: 'A tilted globe outline with meridians sliding across its face, for searching the web.',
    intent: 'loading',
    cols: 11,
    rows: 11,
    states: {
      idle: {
        kind: 'recipe',
        recipe: 'projection',
        params: { variant: 'globe', frames: GLOBE_STILL_FRAMES },
      },
      thinking: { kind: 'recipe', recipe: 'projection', params: { variant: 'globe' } },
      listening: { kind: 'recipe', recipe: 'projection', params: { variant: 'globe-listen' } },
      success: { kind: 'recipe', recipe: 'projection', params: { variant: 'globe-settle' } },
      error: { kind: 'recipe', recipe: 'projection', params: { variant: 'globe-break' } },
    },
    transition: 'crossfade',
    tags: ['globe', 'search', 'web', '3d'],
    contexts: ['chat', 'card', 'page', 'splash'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'donut',
    name: 'Donut',
    description:
      'The famous spinning torus redrawn in binary dots, shaded by dither density with the hole kept open.',
    intent: 'thinking',
    cols: 16,
    rows: 16,
    states: {
      idle: { kind: 'recipe', recipe: 'projection', params: { variant: 'torus-slow' } },
      thinking: { kind: 'recipe', recipe: 'projection', params: { variant: 'torus' } },
      cooking: {
        kind: 'recipe',
        recipe: 'projection',
        params: { variant: 'torus', frames: DONUT_COOKING_FRAMES },
      },
      success: { kind: 'recipe', recipe: 'projection', params: { variant: 'torus-front' } },
      error: { kind: 'recipe', recipe: 'projection', params: { variant: 'torus-drop' } },
    },
    transition: 'crossfade',
    tags: ['3d', 'torus', 'dither', 'nerd'],
    contexts: ['splash', 'page'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'helix',
    name: 'Double Helix',
    description:
      'Two strands twist around each other with rungs between them, the back strand breaking where it passes behind.',
    intent: 'thinking',
    cols: 16,
    rows: 9,
    states: {
      idle: { kind: 'recipe', recipe: 'columns', params: { variant: 'helix-slow' } },
      thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'helix' } },
      indexing: { kind: 'recipe', recipe: 'columns', params: { variant: 'helix-fast' } },
      success: { kind: 'recipe', recipe: 'columns', params: { variant: 'helix-zip' } },
      error: { kind: 'recipe', recipe: 'columns', params: { variant: 'helix-unravel' } },
    },
    transition: 'flip',
    tags: ['dna', 'helix', 'data', 'wide'],
    contexts: ['page', 'splash', 'card', 'inline'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'ridgeline',
    name: 'Ridgeline',
    description:
      'Stacked ridge lines of a rolling wave field, nearer ridges hiding the ones behind, like the famous pulsar plot.',
    intent: 'thinking',
    cols: 16,
    rows: 10,
    states: {
      idle: {
        kind: 'recipe',
        recipe: 'columns',
        params: { variant: 'ridge', density: RIDGE_CALM_DENSITY },
      },
      thinking: { kind: 'recipe', recipe: 'columns', params: { variant: 'ridge' } },
      listening: { kind: 'recipe', recipe: 'columns', params: { variant: 'ridge-level' } },
      success: { kind: 'recipe', recipe: 'columns', params: { variant: 'ridge-settle' } },
      error: { kind: 'recipe', recipe: 'columns', params: { variant: 'ridge-spike' } },
    },
    transition: 'crossfade',
    tags: ['signal', 'terrain', 'voice', '3d'],
    contexts: ['page', 'splash', 'card'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
  {
    id: 'coin-flip',
    name: 'Coin Flip',
    description: 'A coin spins edge-on and back, then lands on the check face or the cross face.',
    intent: 'result',
    cols: 7,
    rows: 7,
    states: {
      idle: { kind: 'recipe', recipe: 'projection', params: { variant: 'coin-rest' } },
      thinking: { kind: 'recipe', recipe: 'projection', params: { variant: 'coin' } },
      deciding: { kind: 'recipe', recipe: 'projection', params: { variant: 'coin-decide' } },
      success: { kind: 'recipe', recipe: 'projection', params: { variant: 'coin', glyph: 'check' } },
      error: { kind: 'recipe', recipe: 'projection', params: { variant: 'coin', glyph: 'cross' } },
    },
    transition: 'flip',
    tags: ['coin', 'decide', 'compact', '3d'],
    contexts: ['button', 'inline', 'chat', 'terminal'],
    collections: COLLECTIONS,
    addedAt: ADDED_AT,
    ...BUILTIN,
  },
] as const satisfies readonly IndicatorSet[];
