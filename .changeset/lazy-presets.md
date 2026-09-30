---
'flickering-dots': patch
---

Presets and recipes now load on demand. `<DotIndicator set="pulse" />` and `<flickering-dots set="pulse">` ship about 14 kB gzip up front instead of about 94 kB, and each preset fetches only its own data and recipes the first time it is used. While a preset loads, the element shows its first frame (or an empty grid of the right size for another state). New `preloadPresets(...ids)` from `flickering-dots/element` loads presets ahead of use. The package is published unbundled, so the core API tree-shakes too: `decodeSet` alone is under 2 kB gzip.
