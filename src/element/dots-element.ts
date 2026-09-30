import { SYSTEM_CLOCK } from '../player/clock';
import type { DotsController, DotsEnvironment, DotsParts } from './controller';
import { createDotsController } from './controller';
import { isPropName, PROP_NAMES } from './props';
import { playDotClick } from './sound';

const SHADOW_CSS = [
  ':host{display:inline-block;line-height:0;vertical-align:middle;flex:none}',
  ':host([hidden]){display:none}',
  '.g{display:grid}',
  '.c{display:block;box-sizing:border-box}',
].join('');

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getReducedMotionQuery(): MediaQueryList | null {
  return typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia(REDUCED_MOTION_QUERY) : null;
}

function watchReducedMotion(onChange: () => void): () => void {
  const query = getReducedMotionQuery();
  if (query === null) return () => undefined;
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const BROWSER_ENVIRONMENT: DotsEnvironment = Object.freeze({
  clock: SYSTEM_CLOCK,
  defer: (task: () => void) => globalThis.queueMicrotask(task),
  prefersReducedMotion: () => getReducedMotionQuery()?.matches ?? false,
  watchReducedMotion,
  click: playDotClick,
});

function createShadowParts(host: HTMLElement): DotsParts<HTMLSpanElement> {
  const doc = host.ownerDocument;
  const root = host.attachShadow({ mode: 'open' });
  const style = doc.createElement('style');
  style.textContent = SHADOW_CSS;
  const grid = doc.createElement('div');
  grid.className = 'g';
  root.append(style, grid);
  const createCell = (): HTMLSpanElement => {
    const cell = doc.createElement('span');
    cell.className = 'c';
    return cell;
  };
  return { host, grid, createCell };
}

function adoptUpgradedProperties(element: HTMLElement, controller: DotsController): void {
  PROP_NAMES.filter((name) => Object.hasOwn(element, name)).forEach((name) => {
    const value: unknown = Reflect.get(element, name);
    Reflect.deleteProperty(element, name);
    controller.setProp(name, value);
  });
}

export function createDotsElementClass(Base: typeof HTMLElement): CustomElementConstructor {
  class DotsElementImpl extends Base {
    static get observedAttributes(): readonly string[] {
      return PROP_NAMES;
    }

    readonly #controller: DotsController = createDotsController(createShadowParts(this), BROWSER_ENVIRONMENT);

    constructor() {
      super();
      adoptUpgradedProperties(this, this.#controller);
    }

    connectedCallback(): void {
      this.#controller.connect();
    }

    disconnectedCallback(): void {
      this.#controller.disconnect();
    }

    attributeChangedCallback(name: string, _previous: string | null, value: string | null): void {
      if (isPropName(name)) this.#controller.setProp(name, value);
    }

    static {
      PROP_NAMES.forEach((name) => {
        Object.defineProperty(DotsElementImpl.prototype, name, {
          get(this: DotsElementImpl): unknown {
            return #controller in this ? this.#controller.getProp(name) : undefined;
          },
          set(this: DotsElementImpl, value: unknown): void {
            this.#controller.setProp(name, value);
          },
          configurable: true,
          enumerable: true,
        });
      });
    }
  }
  return DotsElementImpl;
}
