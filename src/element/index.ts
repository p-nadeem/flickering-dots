/** `flickering-dots/element`: the `<flickering-dots>` custom element. */
import { createDotsElementClass } from './dots-element';

export { preloadPresets } from '../presets/store';
export { playDotClick, setDotSoundEnabled } from './sound';
export type { DotsElement, DotsElementProperties, DotsFlag, DotsNumber } from './types';

/** Tag name of the custom element. */
export const DOTS_TAG = 'flickering-dots';

/** Registers the flickering-dots element once. Safe to call repeatedly, and does nothing where there is no DOM. */
export function defineDotsElement(): void {
  if (typeof globalThis.customElements !== 'object' || typeof globalThis.HTMLElement !== 'function') return;
  if (globalThis.customElements.get(DOTS_TAG) !== undefined) return;
  globalThis.customElements.define(DOTS_TAG, createDotsElementClass(globalThis.HTMLElement));
}
