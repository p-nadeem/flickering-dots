import assert from 'node:assert/strict';

import { decodeSet, encodeSet, getPreset, PRESETS } from 'flickering-dots';
import { defineDotsElement, DOTS_TAG } from 'flickering-dots/element';
import { DotIndicator } from 'flickering-dots/react';

assert.equal(PRESETS.length, 85);
assert.deepEqual(decodeSet(encodeSet(getPreset('pulse'))).id, 'pulse');
assert.equal(DOTS_TAG, 'flickering-dots');
assert.doesNotThrow(() => defineDotsElement());
assert.equal(typeof DotIndicator, 'function');
console.log('node esm ok');
