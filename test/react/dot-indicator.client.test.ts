// @vitest-environment happy-dom
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DotsElement } from '../../src/element';
import { defineDotsElement, DOTS_TAG } from '../../src/element';
import { getPreset } from '../../src/index';
import type { DotIndicatorProps } from '../../src/react';
import { DotIndicator } from '../../src/react';

import { createTestRoot, REACT_MAJOR } from './react-root';

const PULSE_DOTS = 7 * 7;
const SERVER_MARKUP = '<flickering-dots class="mark"></flickering-dots>';

let container: HTMLDivElement;
let consoleError: ReturnType<typeof vi.spyOn>;

function getElement(): DotsElement {
  const element = container.querySelector(DOTS_TAG);
  if (element === null) throw new Error(`no <${DOTS_TAG}> rendered`);
  return element as unknown as DotsElement;
}

function countDots(): number {
  return getElement().shadowRoot?.querySelectorAll('.c').length ?? 0;
}

function indicator(props: DotIndicatorProps) {
  return createElement(DotIndicator, props);
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  container.remove();
  consoleError.mockRestore();
});

describe(`DotIndicator in the browser on React ${REACT_MAJOR}`, () => {
  it('registers the element and draws the preset as dots', async () => {
    const root = await createTestRoot(container);

    await root.render(indicator({ set: 'pulse', state: 'thinking' }));

    expect(customElements.get(DOTS_TAG)).toBeDefined();
    expect(countDots()).toBe(PULSE_DOTS);
    await root.unmount();
  });

  it('passes object props through as the same objects', async () => {
    const pulse = getPreset('pulse');
    const tuning = { mode: 'led' as const };
    const root = await createTestRoot(container);

    await root.render(indicator({ set: pulse, tuning }));

    expect(getElement().set).toBe(pulse);
    expect(getElement().tune).toBe(tuning);
    await root.unmount();
  });

  it('updates the element when props change', async () => {
    const root = await createTestRoot(container);
    await root.render(indicator({ set: 'pulse', state: 'thinking', size: 24 }));

    await root.render(indicator({ set: 'pulse', state: 'success', size: 40 }));

    expect(getElement().state).toBe('success');
    expect(getElement().size).toBe(40);
    await root.unmount();
  });

  it('renders className as the class attribute', async () => {
    const root = await createTestRoot(container);

    await root.render(indicator({ className: 'mark' }));

    expect(getElement().getAttribute('class')).toBe('mark');
    await root.unmount();
  });

  it('unmounts cleanly', async () => {
    const root = await createTestRoot(container);
    await root.render(indicator({ set: 'radar' }));

    await root.unmount();

    expect(container.querySelector(DOTS_TAG)).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('hydrates without warnings when the element is already defined (early define, streaming)', async () => {
    defineDotsElement();
    const element = indicator({ set: 'pulse', state: 'thinking', className: 'mark' });
    container.innerHTML = SERVER_MARKUP;
    const root = await createTestRoot(container, { hydrate: true });

    await root.render(element);

    expect(consoleError).not.toHaveBeenCalled();
    expect(countDots()).toBe(PULSE_DOTS);
    await root.unmount();
  });
});
