import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { build } from 'esbuild';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const KB = 1000;

const SCENARIOS = [
  {
    name: 'DotIndicator up front',
    code: "import { DotIndicator } from 'flickering-dots/react'; export { DotIndicator };",
    limit: 15 * KB,
  },
  {
    name: 'defineDotsElement up front',
    code: "import { defineDotsElement } from 'flickering-dots/element'; defineDotsElement();",
    limit: 15 * KB,
  },
  {
    name: 'decodeSet',
    code: "import { decodeSet } from 'flickering-dots'; export { decodeSet };",
    limit: 2.5 * KB,
  },
];
const LARGEST_CHUNK_LIMIT = 13 * KB;
const ALL_CHUNKS_LIMIT = 110 * KB;

const gzipSize = (file) => gzipSync(readFileSync(file), { level: 9 }).length;

async function measure({ name, code }, work) {
  const dir = mkdtempSync(path.join(work, 'size-'));
  const entry = path.join(dir, 'entry.mjs');
  writeFileSync(entry, code);
  await build({
    entryPoints: [entry],
    outdir: path.join(dir, 'out'),
    bundle: true,
    splitting: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    external: ['react', 'react/jsx-runtime'],
    alias: {
      'flickering-dots/react': path.join(ROOT, 'dist/react.js'),
      'flickering-dots/element': path.join(ROOT, 'dist/element.js'),
      'flickering-dots': path.join(ROOT, 'dist/index.js'),
    },
    logLevel: 'error',
  });
  const files = readdirSync(path.join(dir, 'out')).map((file) => path.join(dir, 'out', file));
  const initial = gzipSize(path.join(dir, 'out', 'entry.js'));
  const chunks = files.filter((file) => !file.endsWith('entry.js')).map(gzipSize);
  return { name, initial, chunks };
}

function row(label, size, limit) {
  const ok = size <= limit;
  console.log(
    `${ok ? 'ok  ' : 'OVER'} ${label.padEnd(30)} ${(size / KB).toFixed(1).padStart(6)} kB  (limit ${limit / KB} kB)`,
  );
  return ok;
}

const work = mkdtempSync(path.join(tmpdir(), 'flickering-dots-size-'));
try {
  const results = await Promise.all(SCENARIOS.map((scenario) => measure(scenario, work)));
  const lazy = results.find((result) => result.chunks.length > 0)?.chunks ?? [];
  const checks = [
    ...results.map(({ name, initial }, index) => row(name, initial, SCENARIOS[index].limit)),
    row('largest lazy chunk', Math.max(0, ...lazy), LARGEST_CHUNK_LIMIT),
    row(
      `all ${lazy.length} lazy chunks together`,
      lazy.reduce((sum, size) => sum + size, 0),
      ALL_CHUNKS_LIMIT,
    ),
  ];
  console.log('sizes are minified + gzip, measured from dist/ with esbuild code splitting');
  if (checks.includes(false)) process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
