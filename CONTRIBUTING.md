# Contributing to Flickering Dots

Thanks for helping. The short version: put code in the right folder, add a test, add a changeset, get a green check.

This repo is the runtime only. The editor, generators and exporters live in a separate private repo.

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately, as described in [SECURITY.md](SECURITY.md).

## Setup

```bash
git clone https://github.com/p-nadeem/flickering-dots && cd flickering-dots
pnpm install
```

The Node version is pinned in `.nvmrc`; pnpm is the only supported package manager.

## Where code goes

| Folder         | Contains                                                             |
| -------------- | -------------------------------------------------------------------- |
| `src/core/`    | types, codec, frames, recipes: pure TypeScript, no DOM, no React     |
| `src/presets/` | the built-in presets, as data                                        |
| `src/player/`  | frame scheduling and transitions; timers through an injectable clock |
| `src/element/` | the `<flickering-dots>` custom element                               |
| `src/react/`   | the `DotIndicator` React component                                   |
| `test/`        | mirrors `src/`: `test/core/codec.test.ts` tests `src/core/codec.ts`  |

Imports flow one way: `react` → `element` → `player`, `presets` → `core`. The package has zero runtime dependencies.

## Everyday commands

| Command                     | What it does                                   |
| --------------------------- | ---------------------------------------------- |
| `pnpm test`                 | Unit tests (Vitest)                            |
| `pnpm test:watch`           | Unit tests in watch mode                       |
| `pnpm typecheck`            | `tsc --noEmit`                                 |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                              |
| `pnpm build`                | ESM + CJS + types into `dist/`                 |
| `pnpm size`                 | Checks bundle-size budgets (after a build)     |
| `pnpm compat`               | Builds sample apps against the packed package  |
| `pnpm gen:manifest`         | Regenerates `src/presets/manifest.ts`          |
| `pnpm dev`                  | Rebuilds `dist/` on change                     |
| `pnpm changeset`            | Records a user-facing change for the changelog |

## Making a change

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.
2. Put code where the structure rules say it goes. `core/`, `presets/` and `player/` have no DOM.
3. Add or update the test at the mirrored path in `test/`.
4. Run `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm size` locally.
5. If you changed anything in `src/`, run `pnpm changeset` and commit the generated file.
6. Open a PR. CI must be green; a maintainer will squash-merge.

## Commit messages

Conventional Commits: `type(scope): summary`, e.g. `feat(core): add pingPong option`, `fix(react): respect prefers-reduced-motion`. Scopes: `core`, `react`, `element`, `presets`, `docs`, `repo`.

## Adding a preset

Presets are data, typed with the core types. Add the set to the matching file in `src/presets/` (or `src/presets/wow/`), keep its `id` unique, and give it a name, a one-line description and tags. Then run `pnpm gen:manifest`: the manifest lets the element load each preset on demand and show its first frame while it loads, and a test fails when it is out of date. Its tests go in `test/presets/`.

## Reporting bugs

Open an issue with a minimal reproduction, the `flickering-dots` version, and your framework and browser.
