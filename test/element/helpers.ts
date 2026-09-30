import type { PropMap, PropName } from '../../src/element/props';
import { createPropMap, PROP_NAMES, withProp } from '../../src/element/props';

export function propsWith(entries: Partial<Record<PropName, unknown>>): PropMap {
  return PROP_NAMES.reduce(
    (props, name) => (Object.hasOwn(entries, name) ? withProp(props, name, entries[name]) : props),
    createPropMap(),
  );
}
