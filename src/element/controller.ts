import { isOneShotState } from '../core/one-shot';
import { stillFrame } from '../core/stats';
import type { Clip, GridSize } from '../core/types';
import { createPlayer } from '../player/create-player';
import type { Clock, Player } from '../player/types';
import type { DotsContent } from './content';
import { getNextState, getTransitionKind, loadContent } from './content';
import type { PropMap, PropName } from './props';
import {
  createPropMap,
  getErrorMessage,
  isFlagOn,
  readLabel,
  readNumber,
  toPropKey,
  withProp,
} from './props';
import type { CellElement, DotsLook, GridElement, GridRenderer } from './render';
import { createGridRenderer } from './render';
import type { ElementTuning } from './tuning';
import { resolveTuning, toDotsLook } from './tuning';
import { planTransition, runTransition } from './transitions';

export interface DotsHost {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  dispatchEvent(event: Event): boolean;
}

export interface DotsParts<C extends CellElement> {
  readonly host: DotsHost;
  readonly grid: GridElement<C>;
  readonly createCell: () => C;
}

export interface DotsEnvironment {
  readonly clock: Clock;
  readonly defer: (task: () => void) => void;
  readonly prefersReducedMotion: () => boolean;
  readonly watchReducedMotion: (onChange: () => void) => () => void;
  readonly click: () => void;
}

export interface DotsController {
  setProp(name: PropName, value: unknown): void;
  getProp(name: PropName): unknown;
  connect(): void;
  disconnect(): void;
}

interface Build {
  readonly key: string;
  readonly content: DotsContent;
  readonly lookKey: string;
  readonly speed: number;
  readonly isReduced: boolean;
}

interface ControllerState {
  readonly props: PropMap;
  readonly isQueued: boolean;
  readonly isConnected: boolean;
  readonly isPendingTransition: boolean;
  readonly build: Build | null;
  readonly player: Player | null;
  readonly isPaused: boolean;
  readonly cancelTransition: (() => void) | null;
  readonly cycleTimer: unknown;
  readonly stopWatching: (() => void) | null;
  readonly reportedTuneKey: string | null;
  readonly ownsAriaHidden: boolean;
}

interface Context {
  readonly host: DotsHost;
  readonly env: DotsEnvironment;
  readonly renderer: GridRenderer;
  readonly read: () => ControllerState;
  readonly write: (patch: Partial<ControllerState>) => void;
}

const CYCLE_MS = 2400;
const ERROR_EVENT = 'error';
const IMG_ROLE = 'img';

function reportError(context: Context, message: string): void {
  context.host.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: { message } }));
}

function reportTuneError(context: Context, error: string | null): void {
  const { props, reportedTuneKey } = context.read();
  if (error === null) {
    context.write({ reportedTuneKey: null });
    return;
  }
  if (props.tune.key === reportedTuneKey) return;
  context.write({ reportedTuneKey: props.tune.key });
  reportError(context, error);
}

function toLookKey(look: DotsLook): string {
  return JSON.stringify(look);
}

function isSameGrid(a: GridSize, b: GridSize): boolean {
  return a.cols === b.cols && a.rows === b.rows;
}

function getBuildKey(props: PropMap, tuning: ElementTuning, isReduced: boolean): string {
  const inputs = [props.set, props.state, props.recipe, props.params, props.frames, props.cols, props.rows];
  const playback = [props.frame.key, isFlagOn(props.cycle.value), isReduced, tuning.direction];
  return JSON.stringify([...inputs.map((entry) => entry.key), ...playback]);
}

function getStillIndex(props: PropMap, isReduced: boolean, content: DotsContent): number | null {
  const { clip, state } = content;
  const frame = readNumber(props.frame.value);
  if (frame !== null) return Math.min(clip.frames.length - 1, Math.max(0, Math.trunc(frame)));
  if (!isReduced) return null;
  return isOneShotState(state) ? content.mark : stillFrame(clip);
}

function cancelCycle(context: Context): void {
  const { cycleTimer } = context.read();
  if (cycleTimer !== null) context.env.clock.cancel(cycleTimer);
  context.write({ cycleTimer: null });
}

function stopPlayback(context: Context): void {
  const { player, cancelTransition } = context.read();
  player?.stop();
  cancelTransition?.();
  cancelCycle(context);
  context.write({ player: null, cancelTransition: null });
}

function showFrame(context: Context, clip: Clip, index: number): void {
  context.renderer.paint(clip.frames[index]);
  const { player, props } = context.read();
  const isAudible = isFlagOn(props.audible.value) && clip.frames.length > 1;
  if (isAudible && player?.playing === true) context.env.click();
}

function armCycle(context: Context): void {
  cancelCycle(context);
  const { build, props } = context.read();
  if (build === null || !isFlagOn(props.cycle.value)) return;
  const next = getNextState(build.content);
  if (next === null) return;
  const cycleTimer = context.env.clock.schedule(() => {
    context.write({ cycleTimer: null });
    setProp(context, 'state', next);
    context.write({ isPendingTransition: true });
  }, CYCLE_MS);
  context.write({ cycleTimer });
}

function startPlayback(context: Context): void {
  const { build, props } = context.read();
  if (build === null) return;
  const { clip, state } = build.content;
  const still = getStillIndex(props, build.isReduced, build.content);
  if (still !== null) {
    context.renderer.paint(clip.frames[still]);
    return;
  }
  const onFrame = (index: number) => showFrame(context, clip, index);
  const loop = !isOneShotState(state);
  const player = createPlayer({ clip, speed: build.speed, clock: context.env.clock, loop, onFrame });
  const isPaused = isFlagOn(props.paused.value);
  context.write({ player, isPaused });
  if (isPaused) {
    player.seek(0);
    return;
  }
  player.play();
  armCycle(context);
}

function playTransition(context: Context, content: DotsContent): void {
  const kind = getTransitionKind(context.read().props.transition.value, content);
  if (kind === 'cut') {
    startPlayback(context);
    return;
  }
  const [target] = content.clip.frames;
  const cancelTransition = runTransition(planTransition(kind, content.clip.cols), context.env.clock, {
    fade: () => context.renderer.fade(),
    paint: () => context.renderer.paint(target),
    column: (index) => context.renderer.paintColumn(target, index),
    done: () => {
      context.write({ cancelTransition: null });
      startPlayback(context);
    },
  });
  context.write({ cancelTransition });
}

function rebuildWhenLoaded(context: Context, key: string, pending: Promise<void>): void {
  pending.then(
    () => {
      const { build, isConnected } = context.read();
      if (!isConnected || build?.key !== key) return;
      context.write({ build: null });
      schedule(context);
    },
    (error: unknown) => reportError(context, getErrorMessage(error)),
  );
}

function rebuild(context: Context, key: string, tuning: ElementTuning, isReduced: boolean): void {
  const { props, build: previous, isPendingTransition } = context.read();
  const { content, error, pending } = loadContent(props, tuning.direction);
  if (error !== null) reportError(context, error);
  if (pending !== null) rebuildWhenLoaded(context, key, pending);
  const shouldTransition =
    !isReduced && isPendingTransition && previous !== null && isSameGrid(previous.content.clip, content.clip);
  stopPlayback(context);
  const look = toDotsLook(tuning, content.on);
  context.renderer.layout(content.clip, look, isReduced);
  const build: Build = { key, content, lookKey: toLookKey(look), speed: tuning.speed, isReduced };
  context.write({ build, isPendingTransition: false });
  if (shouldTransition) playTransition(context, content);
  else startPlayback(context);
}

function restyle(context: Context, build: Build, tuning: ElementTuning): void {
  const look = toDotsLook(tuning, build.content.on);
  const lookKey = toLookKey(look);
  const { frame } = context.renderer;
  if (lookKey !== build.lookKey) {
    context.renderer.layout(build.content.clip, look, build.isReduced);
    if (frame !== null) context.renderer.paint(frame);
  }
  if (tuning.speed !== build.speed) context.read().player?.setSpeed(tuning.speed);
  context.write({ build: { ...build, lookKey, speed: tuning.speed }, isPendingTransition: false });
}

function syncPaused(context: Context): void {
  const { player, isPaused, props } = context.read();
  const shouldPause = isFlagOn(props.paused.value);
  if (player === null || shouldPause === isPaused) return;
  context.write({ isPaused: shouldPause });
  if (shouldPause) {
    player.pause();
    cancelCycle(context);
    return;
  }
  player.play();
  armCycle(context);
}

function syncAttribute(host: DotsHost, name: string, value: string | null): void {
  const current = host.getAttribute(name);
  if (value === null && current !== null) host.removeAttribute(name);
  if (value !== null && current !== value) host.setAttribute(name, value);
}

function syncAria(context: Context): void {
  const { props, build, ownsAriaHidden } = context.read();
  const { host } = context;
  const label = readLabel(props.label.value);
  if (label === '') {
    if (host.getAttribute('aria-hidden') === null) context.write({ ownsAriaHidden: true });
    if (context.read().ownsAriaHidden) syncAttribute(host, 'aria-hidden', 'true');
    syncAttribute(host, 'role', null);
    syncAttribute(host, 'aria-label', null);
    return;
  }
  if (ownsAriaHidden) syncAttribute(host, 'aria-hidden', null);
  context.write({ ownsAriaHidden: false });
  syncAttribute(host, 'role', IMG_ROLE);
  syncAttribute(host, 'aria-label', label ?? build?.content.label ?? null);
}

function update(context: Context): void {
  const { props, build } = context.read();
  const { tuning, error } = resolveTuning(props);
  reportTuneError(context, error);
  const isReduced = isFlagOn(props.reduced.value) || context.env.prefersReducedMotion();
  const key = getBuildKey(props, tuning, isReduced);
  if (build === null || build.key !== key) rebuild(context, key, tuning, isReduced);
  else restyle(context, build, tuning);
  syncPaused(context);
  syncAria(context);
}

function schedule(context: Context): void {
  if (context.read().isQueued) return;
  context.write({ isQueued: true });
  context.env.defer(() => {
    context.write({ isQueued: false });
    if (context.read().isConnected) update(context);
  });
}

function setProp(context: Context, name: PropName, value: unknown): void {
  const { props } = context.read();
  const key = toPropKey(value);
  if (props[name].key === key) return;
  if (name === 'state' && props.state.key !== null) context.write({ isPendingTransition: true });
  context.write({ props: withProp(props, name, value) });
  schedule(context);
}

function connect(context: Context): void {
  const stopWatching = context.env.watchReducedMotion(() => schedule(context));
  context.write({ isConnected: true, build: null, stopWatching });
  schedule(context);
}

function disconnect(context: Context): void {
  stopPlayback(context);
  context.read().stopWatching?.();
  context.write({ isConnected: false, build: null, stopWatching: null, isPendingTransition: false });
}

function createInitialState(): ControllerState {
  return {
    props: createPropMap(),
    isQueued: false,
    isConnected: false,
    isPendingTransition: false,
    build: null,
    player: null,
    isPaused: false,
    cancelTransition: null,
    cycleTimer: null,
    stopWatching: null,
    reportedTuneKey: null,
    ownsAriaHidden: false,
  };
}

export function createDotsController<C extends CellElement>(
  parts: DotsParts<C>,
  env: DotsEnvironment,
): DotsController {
  let state = createInitialState();
  const context: Context = {
    host: parts.host,
    env,
    renderer: createGridRenderer(parts.grid, parts.createCell),
    read: () => state,
    write: (patch) => {
      state = { ...state, ...patch };
    },
  };
  return Object.freeze({
    setProp: (name: PropName, value: unknown) => setProp(context, name, value),
    getProp: (name: PropName) => state.props[name].value,
    connect: () => connect(context),
    disconnect: () => disconnect(context),
  });
}
