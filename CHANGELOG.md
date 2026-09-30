# flickering-dots

## 0.1.2

### Patch Changes

- b1263a2: `DotIndicator` now works directly in React Server Components (the React entry starts with `'use client'`). New `flickering-dots/element/define` entry registers `<flickering-dots>` on import, for plain `<script type="module">` use. CommonJS consumers get their own type declarations (`.d.cts`), and the package is much smaller on disk: minified, no source maps, no duplicated CommonJS bundles.
- b36634c: Presets and recipes now load on demand. `<DotIndicator set="pulse" />` and `<flickering-dots set="pulse">` ship about 14 kB gzip up front instead of about 94 kB, and each preset fetches only its own data and recipes the first time it is used. While a preset loads, the element shows its first frame (or an empty grid of the right size for another state). New `preloadPresets(...ids)` from `flickering-dots/element` loads presets ahead of use. The package is published unbundled, so the core API tree-shakes too: `decodeSet` alone is under 2 kB gzip.

## 0.1.1

### Patch Changes

- c781bff: `DotIndicator` no longer logs a hydration mismatch when `<flickering-dots>` is already defined before React hydrates (an early `defineDotsElement()` call, or a later Suspense boundary under streaming SSR). The element sets its own `role` and `aria-label`, so React now leaves those attributes alone.
