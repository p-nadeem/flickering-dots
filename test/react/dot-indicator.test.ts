import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DotIndicator } from '../../src/react';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DotIndicator', () => {
  it('renders a flickering-dots element', () => {
    expect(renderToStaticMarkup(createElement(DotIndicator, { set: 'pulse', state: 'thinking' }))).toBe(
      '<flickering-dots></flickering-dots>',
    );
  });

  it('renders the class name as the class attribute', () => {
    expect(renderToStaticMarkup(createElement(DotIndicator, { className: 'mark shrink-0' }))).toBe(
      '<flickering-dots class="mark shrink-0"></flickering-dots>',
    );
  });

  it('keeps object props off the markup, since they are set as properties', () => {
    const markup = renderToStaticMarkup(
      createElement(DotIndicator, {
        set: 'radar',
        tuning: { size: 40, mode: 'led' },
        grid: { cols: 9, rows: 9 },
        params: { seed: 2 },
      }),
    );

    expect(markup).toBe('<flickering-dots></flickering-dots>');
  });

  it('renders on the server without registering the element', () => {
    const define = vi.fn();
    vi.stubGlobal('customElements', { get: () => undefined, define });

    renderToStaticMarkup(createElement(DotIndicator, { set: 'pulse' }));

    expect(define).not.toHaveBeenCalled();
  });
});
