import type { DotsController, DotsEnvironment, DotsHost } from '../../src/element/controller';
import { createDotsController } from '../../src/element/controller';
import type { PropName } from '../../src/element/props';
import { PROP_NAMES } from '../../src/element/props';

import type { FakeClock } from '../player/fake-clock';
import { createFakeClock } from '../player/fake-clock';
import type { FakeGrid } from './fake-dom';
import { createFakeCell, createFakeGrid } from './fake-dom';

export interface FakeHost extends DotsHost {
  readonly attributes: Readonly<Record<string, string>>;
  readonly errors: readonly string[];
}

export interface FakeEnvironment extends DotsEnvironment {
  readonly clock: FakeClock;
  readonly clicks: number;
  readonly deferred: number;
  flush: () => void;
  setReducedMotion: (reduced: boolean) => void;
}

export interface Mounted {
  readonly controller: DotsController;
  readonly host: FakeHost;
  readonly grid: FakeGrid;
  readonly env: FakeEnvironment;
  set: (name: PropName, value: unknown) => void;
}

function readMessage(event: Event): string {
  if (!(event instanceof CustomEvent)) return '';
  const { detail } = event;
  return typeof detail === 'object' && detail !== null && 'message' in detail ? String(detail.message) : '';
}

export function createFakeHost(): FakeHost {
  let attributes: Readonly<Record<string, string>> = {};
  let errors: readonly string[] = [];
  return {
    getAttribute: (name) => attributes[name] ?? null,
    setAttribute: (name, value) => {
      attributes = { ...attributes, [name]: value };
    },
    removeAttribute: (name) => {
      attributes = Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== name));
    },
    dispatchEvent: (event) => {
      if (event.type === 'error') errors = [...errors, readMessage(event)];
      return true;
    },
    get attributes() {
      return attributes;
    },
    get errors() {
      return errors;
    },
  };
}

export function createFakeEnvironment(): FakeEnvironment {
  const clock = createFakeClock();
  let queue: readonly (() => void)[] = [];
  let listeners: readonly (() => void)[] = [];
  let reduced = false;
  let clicks = 0;
  let deferred = 0;
  return {
    clock,
    defer: (task) => {
      deferred += 1;
      queue = [...queue, task];
    },
    flush: () => {
      const tasks = queue;
      queue = [];
      tasks.forEach((task) => task());
    },
    prefersReducedMotion: () => reduced,
    watchReducedMotion: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((entry) => entry !== listener);
      };
    },
    setReducedMotion: (next) => {
      reduced = next;
      listeners.forEach((listener) => listener());
    },
    click: () => {
      clicks += 1;
    },
    get clicks() {
      return clicks;
    },
    get deferred() {
      return deferred;
    },
  };
}

export function mount(
  props: Partial<Record<PropName, unknown>> = {},
  env = createFakeEnvironment(),
): Mounted {
  const host = createFakeHost();
  const grid = createFakeGrid();
  const controller = createDotsController({ host, grid, createCell: () => createFakeCell() }, env);
  PROP_NAMES.filter((name) => Object.hasOwn(props, name)).forEach((name) =>
    controller.setProp(name, props[name]),
  );
  controller.connect();
  env.flush();
  return {
    controller,
    host,
    grid,
    env,
    set: (name, value) => {
      controller.setProp(name, value);
      env.flush();
    },
  };
}
