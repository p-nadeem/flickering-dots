import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

import { chromium, firefox, webkit } from 'playwright';

const ENGINES = { chromium, firefox, webkit };
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
};
const DOT_TIMEOUT_MS = 10_000;

function serve(root) {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) {
      response.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function countDots(browser, url) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(url);
  await page.waitForFunction(
    () => (document.querySelector('flickering-dots')?.shadowRoot?.querySelectorAll('.c').length ?? 0) > 0,
    null,
    { timeout: DOT_TIMEOUT_MS },
  );
  const dots = await page.evaluate(
    () => document.querySelector('flickering-dots')?.shadowRoot?.querySelectorAll('.c').length ?? 0,
  );
  await page.close();
  return { dots, errors };
}

export async function checkPages(pages, browserNames) {
  const failures = [];
  for (const browserName of browserNames) {
    const browser = await ENGINES[browserName].launch();
    for (const { name, root } of pages) {
      const server = await serve(root);
      const { port } = server.address();
      try {
        const { dots, errors } = await countDots(browser, `http://127.0.0.1:${port}/`);
        const status = errors.length === 0 ? 'ok' : `errors: ${errors.join(' | ')}`;
        console.log(`${browserName.padEnd(8)} ${name.padEnd(12)} ${dots} dots, ${status}`);
        if (errors.length > 0) failures.push(`${browserName}/${name}`);
      } catch (error) {
        console.log(`${browserName.padEnd(8)} ${name.padEnd(12)} FAILED: ${error.message.split('\n')[0]}`);
        failures.push(`${browserName}/${name}`);
      } finally {
        server.close();
      }
    }
    await browser.close();
  }
  if (failures.length > 0) throw new Error(`browser checks failed: ${failures.join(', ')}`);
}
