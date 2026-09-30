import type { DotsElementProperties } from '../element';
import { PROP_NAMES } from '../element/props';
import type { DotIndicatorProps } from './dot-indicator';

export function toDotsProperties(props: DotIndicatorProps): DotsElementProperties {
  return {
    set: props.set ?? null,
    state: props.state ?? null,
    recipe: props.recipe ?? null,
    params: props.params ?? null,
    frames: props.clip ?? null,
    cols: props.grid?.cols ?? null,
    rows: props.grid?.rows ?? null,
    tune: props.tuning ?? null,
    on: props.on ?? null,
    off: props.off ?? null,
    mode: props.mode ?? null,
    shape: props.shape ?? null,
    gap: props.gap ?? null,
    speed: props.speed ?? null,
    direction: props.direction ?? null,
    size: props.size ?? null,
    paused: props.paused ?? null,
    frame: props.frame ?? null,
    cycle: props.cycle ?? null,
    reduced: props.reduced ?? null,
    audible: props.audible ?? null,
    transition: props.transition ?? null,
    label: props.label ?? null,
  };
}

function assignProperty<K extends keyof DotsElementProperties>(
  element: DotsElementProperties,
  values: DotsElementProperties,
  name: K,
): void {
  if (Object.is(element[name], values[name])) return;
  element[name] = values[name];
}

export function assignDotsProperties(element: DotsElementProperties, values: DotsElementProperties): void {
  PROP_NAMES.forEach((name) => assignProperty(element, values, name));
}
