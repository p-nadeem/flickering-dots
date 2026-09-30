import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('out/index.html', 'utf8');
assert.match(html, /<flickering-dots[^>]*><\/flickering-dots>/);
console.log('next prerendered <flickering-dots>');
