import type { DotShape, PlayDirection, RenderMode } from '../core/types';
import type { PropMap } from './props';
import { createElementError, getErrorMessage, isRecord, readJson, readNumber, readText } from './props';
import type { DotsLook } from './render';

export interface ElementTuning {
  readonly on: string | null;
  readonly off: string | null;
  readonly mode: RenderMode;
  readonly shape: DotShape;
  readonly gap: number;
  readonly speed: number;
  readonly direction: PlayDirection;
  readonly size: number;
}

export interface TuningResult {
  readonly tuning: ElementTuning;
  readonly error: string | null;
}

export const ELEMENT_DEFAULTS: ElementTuning = Object.freeze({
  on: null,
  off: null,
  mode: 'flat',
  shape: 'circle',
  gap: 0.25,
  speed: 1,
  direction: 'forward',
  size: 24,
});

export const DEFAULT_ON = 'var(--dot-on, #e4ff3e)';
export const DEFAULT_OFF = 'var(--dot-off, #26272d)';

const LOOK_KEYS = ['on', 'off', 'mode', 'shape', 'gap', 'speed', 'direction', 'size'] as const;
const MODES: readonly RenderMode[] = ['flat', 'flip', 'led'];
const SHAPES: readonly DotShape[] = ['circle', 'square', 'rounded', 'diamond'];
const DIRECTIONS: readonly PlayDirection[] = ['forward', 'reverse', 'pingpong'];

type LookKey = (typeof LOOK_KEYS)[number];
type LookValues = Readonly<Partial<Record<LookKey, unknown>>>;

function pickOption<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.find((option) => option === value) ?? fallback;
}

function pickNumber(value: unknown, isValid: (number: number) => boolean, fallback: number): number {
  const number = readNumber(value);
  return number !== null && isValid(number) ? number : fallback;
}

function readTune(props: PropMap): { values: LookValues; error: string | null } {
  try {
    const tune = readJson('tune', props.tune.value);
    if (tune === null || isRecord(tune)) return { values: tune ?? {}, error: null };
    return { values: {}, error: createElementError('tune must be an object of look settings').message };
  } catch (error) {
    return { values: {}, error: getErrorMessage(error) };
  }
}

function withSingleAttributes(values: LookValues, props: PropMap): LookValues {
  return LOOK_KEYS.reduce<LookValues>((merged, key) => {
    const value = props[key].value;
    const isSet = value !== null && value !== '';
    return isSet ? { ...merged, [key]: value } : merged;
  }, values);
}

function toTuning(values: LookValues): ElementTuning {
  return {
    on: readText(values.on),
    off: readText(values.off),
    mode: pickOption(MODES, values.mode, ELEMENT_DEFAULTS.mode),
    shape: pickOption(SHAPES, values.shape, ELEMENT_DEFAULTS.shape),
    gap: pickNumber(values.gap, (gap) => gap >= 0, ELEMENT_DEFAULTS.gap),
    speed: pickNumber(values.speed, (speed) => speed > 0, ELEMENT_DEFAULTS.speed),
    direction: pickOption(DIRECTIONS, values.direction, ELEMENT_DEFAULTS.direction),
    size: pickNumber(values.size, (size) => size > 0, ELEMENT_DEFAULTS.size),
  };
}

export function resolveTuning(props: PropMap): TuningResult {
  const { values, error } = readTune(props);
  return { tuning: toTuning(withSingleAttributes(values, props)), error };
}

export function toDotsLook(tuning: ElementTuning, stateOn: string | null): DotsLook {
  return {
    on: stateOn ?? tuning.on ?? DEFAULT_ON,
    off: tuning.off ?? DEFAULT_OFF,
    mode: tuning.mode,
    shape: tuning.shape,
    size: tuning.size,
    gap: tuning.gap,
  };
}
