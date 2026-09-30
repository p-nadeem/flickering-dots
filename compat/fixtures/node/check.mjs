import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { decodeSet, encodeSet, getPreset, PRESETS } from 'flickering-dots';
import { defineDotsElement, DOTS_TAG } from 'flickering-dots/element';
import { DotIndicator } from 'flickering-dots/react';

assert.equal(PRESETS.length, 85);
assert.deepEqual(decodeSet(encodeSet(getPreset('pulse'))).id, 'pulse');
assert.equal(DOTS_TAG, 'flickering-dots');
assert.doesNotThrow(() => defineDotsElement());
assert.equal(typeof DotIndicator, 'function');
for (const file of ['react.js', 'react.cjs']) {
  const source = readFileSync(
    new URL(`./node_modules/flickering-dots/dist/${file}`, import.meta.url),
    'utf8',
  );
  assert.ok(source.startsWith('"use client";'), `dist/${file} must start with "use client"`);
}
console.log('node esm ok');
