import { readFileSync, writeFileSync } from 'node:fs';

import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

import { toKnownRecipe } from '../../src/core/recipes/ids';
import { resolve } from '../../src/core/resolve';
import type { Frame, IndicatorSet } from '../../src/core/types';
import { PRESETS } from '../../src/presets';
import { ICON_PRESETS } from '../../src/presets/icons';
import { LOADING_PRESETS } from '../../src/presets/loading';
import { PRESET_MANIFEST } from '../../src/presets/manifest';
import { PLAYFUL_PRESETS } from '../../src/presets/playful';
import { PROGRESS_PRESETS } from '../../src/presets/progress';
import { RESULT_PRESETS } from '../../src/presets/result';
import { THINKING_PRESETS } from '../../src/presets/thinking';
import { AILIFE_SETS } from '../../src/presets/wow/ai-life';
import { ARCADE_SETS } from '../../src/presets/wow/arcade';
import { DEMOSCENE_SETS } from '../../src/presets/wow/demoscene';
import { EMERGENCE_SETS } from '../../src/presets/wow/emergence';
import { NATURE_SETS } from '../../src/presets/wow/nature';
import { SIGNBOARD_SETS } from '../../src/presets/wow/signboard';
import { SOLID_SETS } from '../../src/presets/wow/solid';

const MANIFEST_PATH = new URL('../../src/presets/manifest.ts', import.meta.url);

const GROUPS = [
  { key: 'thinking', path: './thinking', name: 'THINKING_PRESETS', sets: THINKING_PRESETS },
  { key: 'loading', path: './loading', name: 'LOADING_PRESETS', sets: LOADING_PRESETS },
  { key: 'progress', path: './progress', name: 'PROGRESS_PRESETS', sets: PROGRESS_PRESETS },
  { key: 'result', path: './result', name: 'RESULT_PRESETS', sets: RESULT_PRESETS },
  { key: 'playful', path: './playful', name: 'PLAYFUL_PRESETS', sets: PLAYFUL_PRESETS },
  { key: 'icons', path: './icons', name: 'ICON_PRESETS', sets: ICON_PRESETS },
  { key: 'ai-life', path: './wow/ai-life', name: 'AILIFE_SETS', sets: AILIFE_SETS },
  { key: 'arcade', path: './wow/arcade', name: 'ARCADE_SETS', sets: ARCADE_SETS },
  { key: 'demoscene', path: './wow/demoscene', name: 'DEMOSCENE_SETS', sets: DEMOSCENE_SETS },
  { key: 'emergence', path: './wow/emergence', name: 'EMERGENCE_SETS', sets: EMERGENCE_SETS },
  { key: 'nature', path: './wow/nature', name: 'NATURE_SETS', sets: NATURE_SETS },
  { key: 'signboard', path: './wow/signboard', name: 'SIGNBOARD_SETS', sets: SIGNBOARD_SETS },
  { key: 'solid', path: './wow/solid', name: 'SOLID_SETS', sets: SOLID_SETS },
] as const;

function toRowMasks(frame: Frame, cols: number, rows: number): number[] {
  return Array.from({ length: rows }, (_, y) =>
    frame.slice(y * cols, (y + 1) * cols).reduce<number>((mask, bit) => mask * 2 + bit, 0),
  );
}

function recipesOf(set: IndicatorSet): string[] {
  const ids = Object.values(set.states).flatMap((def) =>
    def.kind === 'recipe' ? [toKnownRecipe(def.recipe)] : [],
  );
  return [...new Set(ids)].sort();
}

function entryOf(set: IndicatorSet, group: string): string {
  const { state, cols, rows, frames } = resolve(set);
  const poster = toRowMasks(frames[0], cols, rows);
  return `${JSON.stringify(set.id)}: { group: ${JSON.stringify(group)}, cols: ${cols}, rows: ${rows}, state: ${JSON.stringify(state)}, poster: ${JSON.stringify(poster)}, recipes: ${JSON.stringify(recipesOf(set))} },`;
}

async function generate(): Promise<string> {
  const keys = GROUPS.map((group) => JSON.stringify(group.key)).join(' | ');
  const loaders = GROUPS.map(
    (g) => `${JSON.stringify(g.key)}: () => import('${g.path}').then((m) => m.${g.name}),`,
  );
  const entries = GROUPS.flatMap((group) => group.sets.map((set) => entryOf(set, group.key)));
  const source = `import type { IndicatorSet, RecipeId, StateName } from '../core/types';

export type PresetGroup = ${keys};

export interface PresetEntry {
  readonly group: PresetGroup;
  readonly cols: number;
  readonly rows: number;
  readonly state: StateName;
  readonly poster: readonly number[];
  readonly recipes: readonly RecipeId[];
}

export const PRESET_GROUPS: Readonly<Record<PresetGroup, () => Promise<readonly IndicatorSet[]>>> = {
${loaders.join('\n')}
};

export const PRESET_MANIFEST: Readonly<Record<string, PresetEntry>> = {
${entries.join('\n')}
};
`;
  const config = await resolveConfig(MANIFEST_PATH.pathname);
  return format(source, { ...config, parser: 'typescript' });
}

describe('presets/manifest.ts', () => {
  it('is generated from the presets (run `pnpm gen:manifest` after changing a preset)', async () => {
    const expected = await generate();
    if (process.env.UPDATE_MANIFEST === '1') writeFileSync(MANIFEST_PATH, expected);

    expect(readFileSync(MANIFEST_PATH, 'utf8')).toBe(expected);
  });

  it('lists every preset exactly once', () => {
    expect(Object.keys(PRESET_MANIFEST).sort()).toEqual(PRESETS.map((set) => set.id).sort());
  });
});
