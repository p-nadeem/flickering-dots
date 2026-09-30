import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ENTRIES = ['src/element/index.ts', 'src/element/define.ts', 'src/react/index.ts'];
const STATIC_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[\s\S]*?\sfrom\s+)?'([^']+)';/gm;
const ALLOWED_RECIPE_FILES = ['ids.ts', 'loaders.ts', 'store.ts', 'unit.ts', 'validate.ts'];
const ALLOWED_PRESET_FILES = ['manifest.ts', 'store.ts'];
const EAGER_CORE_FILES = ['build.ts', 'resolve.ts', 'codec.ts', 'encode.ts', 'stats.ts'];

function resolveImport(from: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(from), specifier);
  const file = [`${base}.ts`, path.join(base, 'index.ts')].find((candidate) => existsSync(candidate));
  if (file === undefined) throw new Error(`cannot resolve ${specifier} from ${from}`);
  return file;
}

function staticImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(STATIC_IMPORT)].flatMap(([, specifier]) => resolveImport(file, specifier) ?? []);
}

function reachableFrom(entries: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const queue = entries.map((entry) => path.join(ROOT, entry));
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...staticImports(file));
  }
  return seen;
}

function isEager(file: string): boolean {
  const relative = path.relative(path.join(ROOT, 'src'), file);
  const [folder, ...rest] = relative.split(path.sep);
  if (relative.startsWith(path.join('core', 'recipes') + path.sep)) {
    return !ALLOWED_RECIPE_FILES.includes(relative.slice('core/recipes/'.length));
  }
  if (folder === 'presets') return !ALLOWED_PRESET_FILES.includes(rest.join('/'));
  return folder === 'core' && EAGER_CORE_FILES.includes(rest.join('/'));
}

describe('render path imports', () => {
  it('reaches no preset data or recipe engine without a dynamic import', () => {
    const reached = [...reachableFrom(ENTRIES)].map((file) => path.relative(ROOT, file));

    expect(reached.filter((file) => isEager(path.join(ROOT, file)))).toEqual([]);
    expect(reached).toContain('src/presets/manifest.ts');
  });
});
