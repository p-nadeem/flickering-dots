<img src="https://raw.githubusercontent.com/p-nadeem/flickering-dots/main/.github/assets/banner.png" alt="Flickering Dots: animated dot-matrix loading, thinking and typing indicators for React and web components" width="100%">

# Flickering Dots

Dot-matrix loading, thinking and typing indicators for AI chat and agent UIs. 85 animated presets, a React component and a `<flickering-dots>` web component for Vue, Svelte, Angular or plain HTML. Zero dependencies.

Website: [flickering-dots.dev](https://flickering-dots.dev/)

[![npm](https://img.shields.io/npm/v/flickering-dots)](https://www.npmjs.com/package/flickering-dots)
[![minzipped size](https://img.shields.io/badge/minzipped-%3C15%20kB-blue)](https://github.com/p-nadeem/flickering-dots/blob/main/scripts/size.mjs)
[![CI](https://github.com/p-nadeem/flickering-dots/actions/workflows/ci.yml/badge.svg)](https://github.com/p-nadeem/flickering-dots/actions/workflows/ci.yml)

```bash
npm install flickering-dots
```

## React (`DotIndicator`)

```tsx
import { DotIndicator } from 'flickering-dots/react';

export function Reply({ busy }: { busy: boolean }) {
  return <DotIndicator set="pulse" state={busy ? 'thinking' : 'success'} />;
}
```

Works with React 17, 18 and 19.

## Web component: Vue, Svelte, Angular and plain HTML

Register the `<flickering-dots>` custom element once, then use the tag anywhere.

```ts
import { defineDotsElement } from 'flickering-dots/element';

defineDotsElement();
```

```html
<flickering-dots set="radar" state="thinking" size="32"></flickering-dots>
```

Or import `flickering-dots/element/define`, which registers the element as a side effect: handy in a plain `<script type="module">`.

In Vue, tell the compiler the tag is a custom element: `compilerOptions.isCustomElement: (tag) => tag === 'flickering-dots'`.

## Presets and states

Pick a preset by id with `set`, and what it shows with `state`:

| State      | Meaning                                        |
| ---------- | ---------------------------------------------- |
| `idle`     | resting, nothing happening                     |
| `thinking` | working; the default when `state` is not given |
| `success`  | finished well; plays once and holds its mark   |
| `error`    | finished badly; plays once and holds its mark  |

Made for AI chat and agent UIs: `typing-hop`, `dots3` and `type` are typing indicators, `pulse` and `shimmer` suit assistant replies, and agent presets add states such as `waiting`, `listening`, `connecting` and `rate-limited`.

Most presets have all four standard states. Many add their own, such as `waiting`, `listening`, `connecting` or `progress`. Changing `state` plays the preset's transition (`cut`, `flip` or `crossfade`). An unknown state falls back to `thinking`, then to the preset's first state.

<details>
<summary>All 85 preset ids</summary>

`pulse` `typing-hop` `shimmer` `dots3` `ember` `radar` `breathe` `braille` `arc` `orbit` `scanner` `equalizer` `skeleton` `grid-wave` `snake` `ripple` `fill-bar` `type` `steps` `ring-fill` `okfail` `tool-call` `attention` `bounce` `life` `rain` `sparkle` `heart` `send` `vector-balls` `corner-hit` `fireworks` `sandplate` `donut` `stack-clear` `alien-march` `brick-wall` `reels` `pendulum-wave` `hourglass` `lightning` `maze-solve` `turing-spots` `fireflies` `eyes` `beam-search` `decode` `lava-lamp` `corridor` `hyperspace` `spiral-wave` `cube` `globe` `helix` `ridgeline` `rally` `chomper` `snake-hunt` `runner` `dice` `campfire` `fountain` `cradle` `slosh` `droplet` `aurora` `orrery` `sort-pass` `rule-stream` `flood-search` `ant-rewind` `frost` `synapse` `constellation` `critter` `morph` `circuit` `split-flap` `departure-board` `ecg-trace` `spirograph` `coin-flip` `snowfall` `countdown` `scope`

</details>

### Loading and size

Presets load on demand. `DotIndicator` or the element costs about 14 kB gzip up front; the first time a preset id is used, just that preset and the recipes it draws with are fetched (a few kB for most presets), and until then the element shows the preset's first frame. To fetch presets ahead of time, so they start animating immediately:

```ts
import { preloadPresets } from 'flickering-dots/element';

preloadPresets('pulse', 'radar');
```

A set object you pass yourself renders as soon as its recipes are loaded, and a set made only of frames renders at once.

`PRESETS`, `COLLECTIONS` and `INTENTS` from `flickering-dots` list every preset with its name, description, states and tags, so you can build your own picker. Importing them includes every preset in your bundle.

## Props and attributes

React props and element attributes are the same, except the four marked below. On the element, object values can be set as JavaScript properties or as JSON in the attribute.

| React prop   | Attribute      | Type                                             | Default                   | Description                                    |
| ------------ | -------------- | ------------------------------------------------ | ------------------------- | ---------------------------------------------- |
| `set`        | `set`          | preset id or `IndicatorSet`                      | `'pulse'`                 | What to play                                   |
| `state`      | `state`        | `string`                                         | `'thinking'`              | Which state of the set to play                 |
| `size`       | `size`         | `number`                                         | `24`                      | Width in px; height follows the grid           |
| `on`         | `on`           | CSS colour                                       | `var(--dot-on, #e4ff3e)`  | Lit dot colour                                 |
| `off`        | `off`          | CSS colour                                       | `var(--dot-off, #26272d)` | Unlit dot colour                               |
| `mode`       | `mode`         | `'flat' \| 'flip' \| 'led'`                      | `'flat'`                  | How dots are drawn                             |
| `shape`      | `shape`        | `'circle' \| 'square' \| 'rounded' \| 'diamond'` | `'circle'`                | Dot shape                                      |
| `gap`        | `gap`          | `number`                                         | `0.25`                    | Space between dots, as a fraction of one dot   |
| `speed`      | `speed`        | `number`                                         | `1`                       | Playback multiplier                            |
| `direction`  | `direction`    | `'forward' \| 'reverse' \| 'pingpong'`           | `'forward'`               | Play order                                     |
| `transition` | `transition`   | `'cut' \| 'flip' \| 'crossfade'`                 | the set's                 | Overrides the set's state transition           |
| `paused`     | `paused`       | `boolean`                                        | `false`                   | Holds the current frame                        |
| `frame`      | `frame`        | `number`                                         |                           | Shows one frame, no playback                   |
| `cycle`      | `cycle`        | `boolean`                                        | `false`                   | Steps through every state, 2.4 s each          |
| `reduced`    | `reduced`      | `boolean`                                        | from the OS               | Forces reduced motion                          |
| `label`      | `label`        | `string`                                         | the state name            | Accessible name; `''` hides it                 |
| `audible`    | `audible`      | `boolean`                                        | `false`                   | Clicks on frame changes, see below             |
| `tuning`     | `tune`         | `Partial<Tuning>`                                |                           | All look props in one object; single props win |
| `clip`       | `frames`       | `Clip`                                           |                           | Your own frames; overrides `set`               |
| `grid`       | `cols`, `rows` | `GridSize`                                       | the set's                 | Grid for recipe-based states                   |
| `className`  | `class`        | `string`                                         |                           | Class names on the element                     |

The colours default to the `--dot-on` and `--dot-off` CSS custom properties, so a theme can set them once for every indicator on the page.

Sound is off for the whole page until you call `setDotSoundEnabled(true)` from `flickering-dots/element`; only indicators with `audible` then click.

## Your own animations

A set is plain data: a grid size and, per state, either frames or a recipe with parameters. Pass it to `set` instead of an id. The core entry has what you need to build one:

```ts
import { decodeSet, encodeSet, build, createPlayer } from 'flickering-dots';
```

- `encodeSet` turns a set into compact JSON, every state resolved to frames; `decodeSet` validates that JSON and returns a set.
- `build` renders a recipe to frames; `RECIPES` lists the 32 recipes.
- `createPlayer` schedules frames without a DOM, for your own renderer.

## Server rendering

`DotIndicator` works in the Next.js App Router and other React Server Components setups: the React entry is marked `'use client'`, so you can use it straight from a server component. On the server it renders an empty `<flickering-dots>` tag, which draws once the page hydrates. Every entry point can be imported in Node without a DOM.

## Accessibility

The element has `role="img"` and an `aria-label` of the current state (`thinking`, `success`, ...). Set `label` to name it yourself, or `label=""` to hide a decorative indicator from assistive tech. When the user prefers reduced motion, or `reduced` is set, it shows a single still frame instead of animating.

## Errors

Invalid input never throws from the element. It dispatches an `error` event whose `detail.message` says what was wrong, and falls back to the `pulse` preset.

## Browser support

Current Chrome, Edge, Firefox and Safari: Chrome and Edge 94+, Firefox 93+, Safari 16.4+.

## Contributing

See [CONTRIBUTING.md](https://github.com/p-nadeem/flickering-dots/blob/main/CONTRIBUTING.md).

## License

[MIT](https://github.com/p-nadeem/flickering-dots/blob/main/LICENSE) © Nadeem Pullisseri
