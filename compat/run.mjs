import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkPages } from './browser.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const FIXTURES = path.join(ROOT, 'compat', 'fixtures');
const WORK = path.join(tmpdir(), 'flickering-dots-compat');

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
}

function pack() {
  const out = path.join(WORK, 'pack');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  run('pnpm', ['build'], ROOT);
  run('pnpm', ['pack', '--pack-destination', out], ROOT);
  const [tarball] = readdirSync(out).filter((name) => name.endsWith('.tgz'));
  if (tarball === undefined) throw new Error('pnpm pack produced no tarball');
  return path.join(out, tarball);
}

function prepare(name, tarball) {
  const dir = path.join(WORK, name);
  rmSync(dir, { recursive: true, force: true });
  cpSync(path.join(FIXTURES, name), dir, { recursive: true });
  const manifestPath = path.join(dir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.dependencies = { ...manifest.dependencies, 'flickering-dots': `file:${tarball}` };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { dir, manifest };
}

function buildFixture(name, tarball) {
  console.log(`\n=== ${name}`);
  const { dir, manifest } = prepare(name, tarball);
  run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir);
  if (manifest.scripts?.build) run('npm', ['run', 'build'], dir);
  if (manifest.scripts?.check) run('npm', ['run', 'check'], dir);
  const page = manifest.compat?.page;
  return page ? { name, root: path.join(dir, page) } : null;
}

const selected = process.argv.slice(2);
const names = readdirSync(FIXTURES).filter((name) => selected.length === 0 || selected.includes(name));
const tarball = pack();
const pages = names.map((name) => buildFixture(name, tarball)).filter((page) => page !== null);
const browsers = (process.env.COMPAT_BROWSERS ?? 'chromium,firefox,webkit').split(',');

if (pages.length > 0 && existsSync(path.join(ROOT, 'node_modules', 'playwright'))) {
  await checkPages(pages, browsers);
}
console.log(`\ncompat: ${names.length} fixture(s) passed`);
