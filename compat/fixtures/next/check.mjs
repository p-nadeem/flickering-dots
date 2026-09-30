import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const file of ['out/index.html', 'out/direct.html']) {
  assert.match(readFileSync(file, 'utf8'), /<flickering-dots[^>]*><\/flickering-dots>/, file);
}
console.log('next prerendered <flickering-dots> from a client component and from a server component');
