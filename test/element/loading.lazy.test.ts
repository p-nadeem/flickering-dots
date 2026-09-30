import { describe, expect, it, vi } from 'vitest';

import { getLoadedRecipe } from '../../src/core/recipes/store';
import { resolve } from '../../src/core/resolve';
import type { IndicatorSet, StateName } from '../../src/core/types';
import { getPreset } from '../../src/presets';
import { PRESET_MANIFEST } from '../../src/presets/manifest';
import type { PresetGroup } from '../../src/presets/manifest';
import { preloadPresets } from '../../src/element';
import { getLoadedPreset } from '../../src/presets/store';

import { toBits } from './fake-dom';
import { mount } from './fake-host';

const ON = 'var(--dot-on, #e4ff3e)';

function idIn(group: PresetGroup, index = 0): string {
  const ids = Object.keys(PRESET_MANIFEST).filter((id) => PRESET_MANIFEST[id].group === group);
  return ids[index];
}

function presetOf(id: string): IndicatorSet {
  const preset = getPreset(id);
  if (preset === undefined) throw new Error(`missing preset ${id}`);
  return preset;
}

function firstFrame(id: string, state?: StateName): number[] {
  return [...resolve(presetOf(id), state).frames[0]];
}

function posterOf(id: string): number[] {
  const { cols, poster } = PRESET_MANIFEST[id];
  return poster.flatMap((mask) => Array.from({ length: cols }, (_, x) => (mask >> (cols - 1 - x)) & 1));
}

async function settle(flush: () => void, isLoaded: () => boolean): Promise<void> {
  await vi.waitFor(() => expect(isLoaded()).toBe(true));
  await Promise.resolve();
  flush();
}

describe('loading presets on demand', () => {
  it('shows the poster at once, then the animation once the preset has loaded', async () => {
    const id = idIn('solid');
    expect(getLoadedPreset(id)).toBeUndefined();

    const { grid, env } = mount({ set: id });
    expect(toBits(grid.cells, ON)).toEqual(posterOf(id));

    await settle(env.flush, () => getLoadedPreset(id) !== undefined);
    const { frames, durations } = resolve(presetOf(id));
    env.clock.advance(durations[0]);

    expect(toBits(grid.cells, ON)).toEqual([...frames[1]]);
  });

  it('matches the poster to the first frame of the default state', () => {
    Object.keys(PRESET_MANIFEST).forEach((id) => expect(posterOf(id), id).toEqual(firstFrame(id)));
  });

  it('shows an empty grid of the right size while another state loads', async () => {
    const id = idIn('arcade');
    const { cols, rows } = PRESET_MANIFEST[id];

    const { grid, env } = mount({ set: id, state: 'success' });

    expect(toBits(grid.cells, ON)).toEqual(Array.from({ length: cols * rows }, () => 0));
    await settle(env.flush, () => getLoadedPreset(id) !== undefined);

    expect(toBits(grid.cells, ON)).toEqual(firstFrame(id, 'success'));
  });

  it('loads only the group and recipes the preset needs', async () => {
    const id = idIn('emergence');
    const { grid, env } = mount({ set: id });

    await settle(env.flush, () => getLoadedPreset(id) !== undefined);

    expect(toBits(grid.cells, ON)).toEqual(firstFrame(id));
    expect(getLoadedPreset(idIn('signboard'))).toBeUndefined();
    PRESET_MANIFEST[idIn('signboard')].recipes
      .filter((recipe) => !PRESET_MANIFEST[id].recipes.includes(recipe))
      .forEach((recipe) => expect(getLoadedRecipe(recipe), recipe).toBeUndefined());
  });

  it('loads the recipes of a set object before playing it', async () => {
    const id = idIn('nature');
    const { grid, env } = mount({ set: presetOf(id) });
    const recipes = PRESET_MANIFEST[id].recipes;

    await settle(env.flush, () => recipes.every((recipe) => getLoadedRecipe(recipe) !== undefined));

    expect(toBits(grid.cells, ON)).toEqual(firstFrame(id));
  });

  it('loads a recipe given by the recipe prop', async () => {
    const { grid, env } = mount({ recipe: 'orbit', cols: 7, rows: 7 });

    await vi.waitFor(() => {
      env.flush();
      expect(getLoadedRecipe('orbit')).toBeDefined();
      expect(toBits(grid.cells, ON).some((bit) => bit === 1)).toBe(true);
    });
  });

  it('reports an unknown preset and falls back to pulse once it has loaded', async () => {
    const { grid, env, host } = mount({ set: 'no-such-preset' });

    expect(host.errors).toEqual(['flickering-dots element: there is no preset called "no-such-preset"']);
    await settle(env.flush, () => getLoadedPreset('pulse') !== undefined);

    expect(toBits(grid.cells, ON)).toEqual(firstFrame('pulse'));
  });

  it('renders a preloaded preset at once, with no loading frame', async () => {
    const id = idIn('demoscene');
    await preloadPresets(id);

    const { grid } = mount({ set: id, state: 'success' });

    expect(toBits(grid.cells, ON)).toEqual(firstFrame(id, 'success'));
  });
});
