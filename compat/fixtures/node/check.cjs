const assert = require('node:assert/strict');

const { decodeSet, encodeSet, getPreset, PRESETS } = require('flickering-dots');
const { defineDotsElement, DOTS_TAG } = require('flickering-dots/element');
const { DotIndicator } = require('flickering-dots/react');

assert.equal(PRESETS.length, 85);
assert.deepEqual(decodeSet(encodeSet(getPreset('pulse'))).id, 'pulse');
assert.equal(DOTS_TAG, 'flickering-dots');
assert.doesNotThrow(() => defineDotsElement());
assert.equal(typeof DotIndicator, 'function');
console.log('node cjs ok');
