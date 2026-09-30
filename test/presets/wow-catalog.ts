import type { Collection } from '../../src/core/types';

export const ORIGINAL_SET_COUNT = 29;
export const WOW_SET_COUNT = 56;

const WOW_SCORES: readonly (readonly [string, number])[] = [
  ['lava-lamp', 8],
  ['corridor', 8],
  ['hyperspace', 8],
  ['spiral-wave', 8],
  ['sandplate', 9],
  ['vector-balls', 10],
  ['cube', 8],
  ['globe', 8],
  ['donut', 9],
  ['helix', 8],
  ['ridgeline', 8],
  ['coin-flip', 7],
  ['stack-clear', 9],
  ['rally', 8],
  ['alien-march', 9],
  ['chomper', 8],
  ['snake-hunt', 8],
  ['brick-wall', 9],
  ['runner', 8],
  ['corner-hit', 10],
  ['reels', 9],
  ['dice', 8],
  ['campfire', 8],
  ['fireworks', 10],
  ['fountain', 8],
  ['pendulum-wave', 9],
  ['cradle', 8],
  ['hourglass', 9],
  ['slosh', 8],
  ['droplet', 8],
  ['lightning', 9],
  ['aurora', 8],
  ['snowfall', 7],
  ['orrery', 8],
  ['maze-solve', 9],
  ['sort-pass', 8],
  ['rule-stream', 8],
  ['flood-search', 8],
  ['ant-rewind', 8],
  ['turing-spots', 9],
  ['frost', 8],
  ['fireflies', 9],
  ['eyes', 9],
  ['synapse', 8],
  ['beam-search', 9],
  ['constellation', 8],
  ['critter', 8],
  ['morph', 8],
  ['circuit', 8],
  ['split-flap', 8],
  ['departure-board', 8],
  ['decode', 9],
  ['countdown', 7],
  ['ecg-trace', 8],
  ['scope', 7],
  ['spirograph', 8],
];

/** The wow set ids in proposal order. */
export const WOW_PROPOSAL_IDS: readonly string[] = WOW_SCORES.map(([id]) => id);

/** The wow set ids by wow score, highest first, ties kept in proposal order. */
export const WOW_FEATURED_IDS: readonly string[] = [...WOW_SCORES]
  .sort((left, right) => right[1] - left[1])
  .map(([id]) => id);

export const NEW_COLLECTIONS: readonly Collection[] = [
  {
    id: 'demoscene',
    name: 'Demoscene',
    description: 'Classic demo effects rebuilt for on and off dots: blobs, tunnels, starfields and spirals.',
  },
  {
    id: 'solid',
    name: '3D',
    description: 'Wireframes and solids that turn in space, drawn with depth cues and no greyscale.',
  },
  {
    id: 'arcade',
    name: 'Arcade',
    description: 'Tiny self-playing games whose wins and losses double as success and error.',
  },
  {
    id: 'nature',
    name: 'Nature and physics',
    description: 'Fire, water, sand, sky and swinging things that move by real physics.',
  },
  {
    id: 'emergence',
    name: 'Emergence',
    description: 'Simple rules that grow patterns: automata, mazes, sorting, crystals and fireflies.',
  },
  {
    id: 'ai-life',
    name: 'AI life',
    description: 'Eyes, neurons, search trees and a mascot that make an assistant feel alive.',
  },
  {
    id: 'signboard',
    name: 'Signboard',
    description:
      'LED and flip-board culture: split flaps, word boards, rain decoders, digits and monitor traces.',
  },
];

/** Members of each new collection, in proposal order. */
export const NEW_COLLECTION_MEMBERS: Readonly<Record<string, readonly string[]>> = {
  demoscene: ['lava-lamp', 'corridor', 'hyperspace', 'spiral-wave', 'sandplate', 'vector-balls'],
  solid: ['cube', 'globe', 'donut', 'helix', 'ridgeline', 'coin-flip'],
  arcade: [
    'stack-clear',
    'rally',
    'alien-march',
    'chomper',
    'snake-hunt',
    'brick-wall',
    'runner',
    'corner-hit',
    'reels',
    'dice',
  ],
  nature: [
    'campfire',
    'fireworks',
    'fountain',
    'pendulum-wave',
    'cradle',
    'hourglass',
    'slosh',
    'droplet',
    'lightning',
    'aurora',
    'snowfall',
    'orrery',
  ],
  emergence: [
    'maze-solve',
    'sort-pass',
    'rule-stream',
    'flood-search',
    'ant-rewind',
    'turing-spots',
    'frost',
    'fireflies',
  ],
  'ai-life': ['eyes', 'synapse', 'beam-search', 'constellation', 'critter', 'morph', 'circuit'],
  signboard: ['split-flap', 'departure-board', 'decode', 'countdown', 'ecg-trace', 'scope', 'spirograph'],
};

/** The wow sets each older collection gains, in proposal order. */
export const CROSS_LISTINGS: Readonly<Record<string, readonly string[]>> = {
  ai: ['eyes', 'decode', 'morph', 'constellation'],
  agent: ['eyes', 'rally', 'runner', 'circuit', 'flood-search'],
  term: ['sort-pass', 'ecg-trace', 'circuit', 'cradle', 'scope'],
};
