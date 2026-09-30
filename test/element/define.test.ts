import { afterEach, describe, expect, it, vi } from 'vitest';

import { defineDotsElement, DOTS_TAG, playDotClick, setDotSoundEnabled } from '../../src/element';
import { PROP_NAMES } from '../../src/element/props';

import { createFakeDocument, FakeElementBase } from './fake-element';

function createRegistry() {
  let defined: Readonly<Record<string, CustomElementConstructor>> = {};
  let defineCalls = 0;
  return {
    get: (name: string) => defined[name],
    define: (name: string, constructor: CustomElementConstructor) => {
      defineCalls += 1;
      defined = { ...defined, [name]: constructor };
    },
    get defineCalls() {
      return defineCalls;
    },
  };
}

function defineWithFakes() {
  const registry = createRegistry();
  vi.stubGlobal('customElements', registry);
  vi.stubGlobal('HTMLElement', FakeElementBase);
  defineDotsElement();
  return registry;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('flickering-dots registration', () => {
  it('names the element flickering-dots', () => {
    expect(DOTS_TAG).toBe('flickering-dots');
  });

  it('does nothing where there is no DOM', () => {
    expect(() => defineDotsElement()).not.toThrow();
    expect(() => setDotSoundEnabled(false)).not.toThrow();
    expect(() => playDotClick()).not.toThrow();
  });

  it('registers the element once however often it is called', () => {
    const registry = defineWithFakes();

    defineDotsElement();

    expect(registry.defineCalls).toBe(1);
    expect(registry.get(DOTS_TAG)).toBeTypeOf('function');
  });

  it('observes every documented attribute', () => {
    const registry = defineWithFakes();

    expect(Reflect.get(registry.get(DOTS_TAG) ?? {}, 'observedAttributes')).toEqual(PROP_NAMES);
  });
});

describe('flickering-dots element', () => {
  function createDots() {
    const registry = defineWithFakes();
    const Dots = registry.get(DOTS_TAG);
    if (!Dots) throw new Error('flickering-dots was not defined');
    FakeElementBase.nextDocument = createFakeDocument();
    return new Dots();
  }

  it('builds its grid inside an open shadow root', () => {
    const element = createDots();
    const root = FakeElementBase.lastShadow;

    expect(element).toBeInstanceOf(FakeElementBase);
    expect(root?.mode).toBe('open');
    expect(root?.children.map((child) => child.tagName)).toEqual(['style', 'div']);
    expect(root?.children[0].textContent).toContain(
      ':host{display:inline-block;line-height:0;vertical-align:middle;flex:none}',
    );
  });

  it('reads back object properties as they were set', () => {
    const element = createDots();
    const tune = { size: 40 };

    Reflect.set(element, 'tune', tune);
    Reflect.set(element, 'state', 'success');

    expect(Reflect.get(element, 'tune')).toBe(tune);
    expect(Reflect.get(element, 'state')).toBe('success');
  });

  it('takes attribute changes as prop values', () => {
    const element = createDots();

    Reflect.apply(Reflect.get(element, 'attributeChangedCallback'), element, ['set', null, 'orbit']);
    Reflect.apply(Reflect.get(element, 'attributeChangedCallback'), element, ['class', null, 'wide']);

    expect(Reflect.get(element, 'set')).toBe('orbit');
  });

  it('picks up properties set before it was upgraded', () => {
    FakeElementBase.presetProperties = { set: 'radar' };
    const element = createDots();
    FakeElementBase.presetProperties = {};

    expect(Object.hasOwn(element, 'set')).toBe(false);
    expect(Reflect.get(element, 'set')).toBe('radar');
  });
});
