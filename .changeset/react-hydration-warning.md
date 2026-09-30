---
'flickering-dots': patch
---

`DotIndicator` no longer logs a hydration mismatch when `<flickering-dots>` is already defined before React hydrates (an early `defineDotsElement()` call, or a later Suspense boundary under streaming SSR). The element sets its own `role` and `aria-label`, so React now leaves those attributes alone.
