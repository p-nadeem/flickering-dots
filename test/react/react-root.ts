import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface TestRoot {
  readonly render: (element: React.ReactElement) => Promise<void>;
  readonly unmount: () => Promise<void>;
}

type Act = (callback: () => void) => Promise<void> | void;

async function runAct(act: Act, work: () => void): Promise<void> {
  const result = act(() => {
    work();
  });
  if (REACT_MAJOR >= 18) await result;
}

const CLIENT_MODULE = 'react-dom/client';
const TEST_UTILS_MODULE = 'react-dom/test-utils';

export const REACT_MAJOR = Number(React.version.split('.')[0]);

async function getAct(): Promise<Act> {
  const fromReact: unknown = Reflect.get(React, 'act');
  if (typeof fromReact === 'function') return fromReact as Act;
  const utils: { act: Act } = await import(/* @vite-ignore */ TEST_UTILS_MODULE);
  return utils.act;
}

function getLegacy(name: 'render' | 'hydrate' | 'unmountComponentAtNode'): (...args: unknown[]) => void {
  const legacy: unknown = Reflect.get(ReactDOM, name);
  if (typeof legacy !== 'function') throw new Error(`react-dom ${React.version} has no ${name}`);
  return legacy as (...args: unknown[]) => void;
}

interface ClientModule {
  createRoot: (container: Element) => { render: (element: React.ReactElement) => void; unmount: () => void };
  hydrateRoot: (
    container: Element,
    element: React.ReactElement,
  ) => { render: (element: React.ReactElement) => void; unmount: () => void };
}

async function withRoots(): Promise<ClientModule> {
  return import(/* @vite-ignore */ CLIENT_MODULE);
}

export async function createTestRoot(container: Element, { hydrate = false } = {}): Promise<TestRoot> {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);
  const act = await getAct();
  let root: { render: (element: React.ReactElement) => void; unmount: () => void } | null = null;

  const renderModern = async (element: React.ReactElement): Promise<void> => {
    const client = await withRoots();
    await runAct(act, () => {
      if (root === null && hydrate) {
        root = client.hydrateRoot(container, element);
        return;
      }
      root ??= client.createRoot(container);
      root.render(element);
    });
  };

  const renderLegacy = async (element: React.ReactElement): Promise<void> => {
    const isFirst = root === null;
    root = { render: () => undefined, unmount: () => getLegacy('unmountComponentAtNode')(container) };
    await runAct(act, () => getLegacy(hydrate && isFirst ? 'hydrate' : 'render')(element, container));
  };

  return {
    render: REACT_MAJOR >= 18 ? renderModern : renderLegacy,
    unmount: async () => {
      const current = root;
      if (current !== null) await runAct(act, () => current.unmount());
    },
  };
}
