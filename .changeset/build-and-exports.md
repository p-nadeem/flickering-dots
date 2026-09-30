---
'flickering-dots': patch
---

`DotIndicator` now works directly in React Server Components (the React entry starts with `'use client'`). New `flickering-dots/element/define` entry registers `<flickering-dots>` on import, for plain `<script type="module">` use. CommonJS consumers get their own type declarations (`.d.cts`), and the package is much smaller on disk: no source maps, no duplicated CommonJS bundles.
