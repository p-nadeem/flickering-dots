export const ELEMENT_ERROR_PREFIX = 'flickering-dots element:';

export const PROP_NAMES = [
  'set',
  'state',
  'recipe',
  'params',
  'frames',
  'cols',
  'rows',
  'tune',
  'on',
  'off',
  'mode',
  'shape',
  'gap',
  'speed',
  'direction',
  'size',
  'paused',
  'frame',
  'cycle',
  'reduced',
  'audible',
  'transition',
  'label',
] as const;

export type PropName = (typeof PROP_NAMES)[number];

export interface PropEntry {
  readonly value: unknown;
  readonly key: string | null;
}

export type PropMap = Readonly<Record<PropName, PropEntry>>;

const EMPTY_ENTRY: PropEntry = Object.freeze({ value: null, key: null });
const FLAG_OFF_TEXT: readonly string[] = ['false', '0'];
const JSON_START = /^\s*[[{]/;

let unserializableCount = 0;

export function createElementError(message: string): Error {
  return new Error(`${ELEMENT_ERROR_PREFIX} ${message}`);
}

export function isPropName(name: string): name is PropName {
  return PROP_NAMES.some((propName) => propName === name);
}

function isCompletePropMap(map: Partial<Record<PropName, PropEntry>>): map is Record<PropName, PropEntry> {
  return PROP_NAMES.every((name) => map[name] !== undefined);
}

export function createPropMap(): PropMap {
  const map = Object.fromEntries(PROP_NAMES.map((name) => [name, EMPTY_ENTRY]));
  if (!isCompletePropMap(map)) throw createElementError('prop map is missing a prop');
  return Object.freeze(map);
}

function toObjectKey(value: object): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    // reason: a value JSON cannot hold never equals an earlier one, so it always updates
    unserializableCount += 1;
    return `unserializable:${unserializableCount}`;
  }
}

export function toPropKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return toObjectKey(value);
  return String(value);
}

export function withProp(map: PropMap, name: PropName, value: unknown): PropMap {
  return Object.freeze({ ...map, [name]: Object.freeze({ value: value ?? null, key: toPropKey(value) }) });
}

export function isFlagOn(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return !FLAG_OFF_TEXT.includes(value.trim());
  return false;
}

export function readText(value: unknown): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  if (typeof value !== 'string') return null;
  return value.trim() === '' ? null : value;
}

export function readLabel(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function readJson(name: PropName, value: unknown): unknown {
  if (typeof value !== 'string' || !JSON_START.test(value)) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw createElementError(`${name} is not valid JSON: ${toMessage(error)}`);
  }
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getErrorMessage(error: unknown): string {
  return toMessage(error);
}
