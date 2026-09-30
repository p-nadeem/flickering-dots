export interface ClickOutput {
  readonly prepare: () => boolean;
  readonly play: (samples: Float32Array) => boolean;
}

export interface ClickBuffer {
  getChannelData(channel: number): Float32Array;
}

export interface ClickSource {
  buffer: ClickBuffer | null;
  connect(destination: unknown): unknown;
  start(): void;
}

export interface ClickAudioContext {
  readonly state: AudioContextState;
  readonly sampleRate: number;
  readonly destination: unknown;
  resume(): Promise<void>;
  createBuffer(channels: number, length: number, sampleRate: number): ClickBuffer;
  createBufferSource(): ClickSource;
}

export interface AudioEnvironment {
  readonly createContext: () => ClickAudioContext | null;
  readonly hasUserActivation: () => boolean;
}

export interface ActivationSource {
  readonly userActivation?: { readonly hasBeenActive: boolean };
}

const MONO = 1;
const FIRST_CHANNEL = 0;
const IDLE_STATES: readonly AudioContextState[] = ['running', 'closed'];

export function readUserActivation(navigator: ActivationSource | undefined): boolean {
  return navigator?.userActivation?.hasBeenActive ?? true;
}

function startClick(context: ClickAudioContext, samples: Float32Array): boolean {
  try {
    const buffer = context.createBuffer(MONO, samples.length, context.sampleRate);
    buffer.getChannelData(FIRST_CHANNEL).set(samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    return true;
  } catch {
    return false;
  }
}

export function createWebAudioOutput(env: AudioEnvironment): ClickOutput {
  let context: ClickAudioContext | null = null;
  let isResuming = false;

  const isUsable = (): boolean => context !== null && context.state !== 'closed';

  const open = (): boolean => {
    if (context !== null) return isUsable();
    if (!env.hasUserActivation()) return true;
    try {
      context = env.createContext();
    } catch {
      return false;
    }
    return isUsable();
  };

  const settleResume = (): void => {
    isResuming = false;
  };

  const resumeIfSuspended = (): void => {
    if (context === null || isResuming || IDLE_STATES.includes(context.state)) return;
    isResuming = true;
    try {
      context.resume().then(settleResume, settleResume);
    } catch {
      settleResume();
    }
  };

  const prepare = (): boolean => {
    const isOpen = open();
    if (isOpen) resumeIfSuspended();
    return isOpen;
  };

  const play = (samples: Float32Array): boolean => {
    if (!prepare()) return false;
    if (context === null || context.state !== 'running') return true;
    return startClick(context, samples);
  };

  return Object.freeze({ prepare, play });
}

function createSystemContext(): ClickAudioContext | null {
  return typeof globalThis.AudioContext === 'function' ? new globalThis.AudioContext() : null;
}

export const SYSTEM_AUDIO: AudioEnvironment = Object.freeze({
  createContext: createSystemContext,
  hasUserActivation: () => readUserActivation(globalThis.navigator),
});
