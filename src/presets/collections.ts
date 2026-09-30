import type { Collection } from '../core/types';

/** The curated collections shown on the Library, in display order. */
export const COLLECTIONS: readonly Collection[] = [
  {
    id: 'ai',
    name: 'AI replies',
    description: 'Calm pulses, sparkles and shimmers made for assistant replies.',
  },
  {
    id: 'minimal',
    name: 'Minimal dots',
    description: 'The three-dot ellipsis and its small neighbours, quiet enough for any chat.',
  },
  {
    id: 'term',
    name: 'Terminal-ready',
    description: 'Small, crisp sets that sit on a CLI line next to text.',
  },
  {
    id: 'agent',
    name: 'Agent states',
    description: 'Sets with extra states for agents: waiting, warning, cancelled, listening and connecting.',
  },
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
