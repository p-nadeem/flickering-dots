import { describe, expect, it } from 'vitest';

import * as runtime from '../../src/index';

const CONTRACT_EXPORTS = [
  'DEFAULT_TUNING',
  'DEFAULT_FRAME_MS',
  'GRID_MIN',
  'GRID_MAX',
  'STATE_ORDER',
  'RECIPES',
  'build',
  'resolve',
  'applyDirection',
  'stats',
  'busiestFrame',
  'stateNames',
  'rowsOf',
  'frameFromRows',
  'encodeSet',
  'decodeSet',
  'parseGridArray',
  'createRng',
  'MARK',
  'markSvg',
  'PRESETS',
  'COLLECTIONS',
  'INTENTS',
  'getPreset',
  'createPlayer',
  'isOneShotState',
  'finalMarkFrame',
];

const FRAME_HELPERS = ['createFrame', 'cellIndex', 'countLit', 'framesEqual'];

const WOW_GROUNDWORK_EXPORTS = [
  'glyphMask',
  'GLYPH_NAMES',
  'isGlyphName',
  'getRecipeOptions',
  'RECIPE_OPTIONS',
];

describe('runtime root entry', () => {
  it('exports every name in the build contract', () => {
    expect(Object.keys(runtime)).toEqual(expect.arrayContaining(CONTRACT_EXPORTS));
  });

  it('exports the shared glyphs and the recipe option rules', () => {
    expect(Object.keys(runtime)).toEqual(expect.arrayContaining(WOW_GROUNDWORK_EXPORTS));
    expect(runtime.glyphMask('plus', { cols: 3, rows: 3 })).toEqual([0, 1, 0, 1, 1, 1, 0, 1, 0]);
  });

  it('exports the frame helpers', () => {
    const exported = new Map<string, unknown>(Object.entries(runtime));

    FRAME_HELPERS.forEach((name) => {
      expect(typeof exported.get(name)).toBe('function');
    });
  });

  it('runs the model functions end to end without a stub', () => {
    const set = runtime.decodeSet(runtime.encodeSet(runtime.MARK));
    const clip = runtime.applyDirection(runtime.resolve(set, 'thinking'), 'pingpong');

    expect(clip.frames).toHaveLength(6);
    expect(runtime.busiestFrame(clip)).toBe(2);
    expect(runtime.stats(set)).toEqual({ frames: 5, cycleMs: 1020, states: 2 });
    expect(runtime.stateNames(set)).toEqual(['idle', 'thinking']);
    expect(runtime.markSvg({ grid: 3, on: '#fff' })).toContain('viewBox="0 0 35 35"');
  });
});
