export interface FakeNode {
  readonly tagName: string;
  className: string;
  textContent: string;
  readonly style: Record<string, string>;
  readonly children: readonly FakeNode[];
  append: (...nodes: FakeNode[]) => void;
  replaceChildren: (...nodes: FakeNode[]) => void;
}

export interface FakeShadowRoot {
  readonly mode: string;
  readonly children: readonly FakeNode[];
  append: (...nodes: FakeNode[]) => void;
}

export interface FakeDocument {
  createElement: (tagName: string) => FakeNode;
}

function createFakeNode(tagName: string): FakeNode {
  let children: readonly FakeNode[] = [];
  return {
    tagName,
    className: '',
    textContent: '',
    style: {},
    get children() {
      return children;
    },
    append: (...nodes) => {
      children = [...children, ...nodes];
    },
    replaceChildren: (...nodes) => {
      children = nodes;
    },
  };
}

export function createFakeDocument(): FakeDocument {
  return { createElement: createFakeNode };
}

function createFakeShadowRoot(mode: string): FakeShadowRoot {
  let children: readonly FakeNode[] = [];
  return {
    mode,
    get children() {
      return children;
    },
    append: (...nodes) => {
      children = [...children, ...nodes];
    },
  };
}

export class FakeElementBase {
  static nextDocument: FakeDocument = createFakeDocument();
  static presetProperties: Readonly<Record<string, unknown>> = {};
  static lastShadow: FakeShadowRoot | null = null;

  readonly ownerDocument: FakeDocument = FakeElementBase.nextDocument;
  readonly isConnected = false;
  shadow: FakeShadowRoot | null = null;
  private attributes: Readonly<Record<string, string>> = {};

  constructor() {
    Object.entries(FakeElementBase.presetProperties).forEach(([name, value]) => {
      Object.defineProperty(this, name, { value, writable: true, configurable: true, enumerable: true });
    });
  }

  attachShadow(init: { mode: string }): FakeShadowRoot {
    this.shadow = createFakeShadowRoot(init.mode);
    FakeElementBase.lastShadow = this.shadow;
    return this.shadow;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes = { ...this.attributes, [name]: value };
  }

  removeAttribute(name: string): void {
    this.attributes = Object.fromEntries(Object.entries(this.attributes).filter(([key]) => key !== name));
  }

  dispatchEvent(): boolean {
    return true;
  }
}
