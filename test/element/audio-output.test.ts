import { describe, expect, it } from 'vitest';

import { createWebAudioOutput, readUserActivation } from '../../src/element/audio-output';
import type {
  AudioEnvironment,
  ClickAudioContext,
  ClickBuffer,
  ClickSource,
} from '../../src/element/audio-output';

const SAMPLES = Float32Array.from([0.25, -0.125, 0.0625]);
const SAMPLE_RATE = 48000;

interface FakeBuffer extends ClickBuffer {
  readonly length: number;
  readonly sampleRate: number;
  readonly data: Float32Array;
}

interface FakeSource extends ClickSource {
  readonly connectedTo: readonly unknown[];
  readonly starts: number;
}

interface FakeContextOptions {
  readonly state?: AudioContextState;
  readonly canPlay?: boolean;
}

interface FakeContext extends ClickAudioContext {
  readonly buffers: readonly FakeBuffer[];
  readonly sources: readonly FakeSource[];
  readonly resumes: number;
  finishResume: (isAllowed: boolean) => void;
}

function createFakeBuffer(length: number, sampleRate: number): FakeBuffer {
  const data = new Float32Array(length);
  return { length, sampleRate, data, getChannelData: () => data };
}

function createFakeSource(): FakeSource {
  let connectedTo: readonly unknown[] = [];
  let starts = 0;
  return {
    buffer: null,
    connect: (destination: unknown) => {
      connectedTo = [...connectedTo, destination];
    },
    start: () => {
      starts += 1;
    },
    get connectedTo() {
      return connectedTo;
    },
    get starts() {
      return starts;
    },
  };
}

function createFakeContext(options: FakeContextOptions = {}): FakeContext {
  let state: AudioContextState = options.state ?? 'running';
  let buffers: readonly FakeBuffer[] = [];
  let sources: readonly FakeSource[] = [];
  let resumes = 0;
  let settle: ((isAllowed: boolean) => void) | null = null;
  return {
    sampleRate: SAMPLE_RATE,
    destination: { name: 'speakers' },
    get state() {
      return state;
    },
    resume: () => {
      resumes += 1;
      return new Promise<void>((resolve, reject) => {
        settle = (isAllowed) => {
          if (!isAllowed) return reject(new Error('The AudioContext was not allowed to start.'));
          state = 'running';
          resolve();
        };
      });
    },
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const buffer = createFakeBuffer(length, sampleRate);
      buffers = [...buffers, buffer];
      return buffer;
    },
    createBufferSource: () => {
      if (options.canPlay === false) throw new Error('The source could not be created.');
      const source = createFakeSource();
      sources = [...sources, source];
      return source;
    },
    finishResume: (isAllowed) => settle?.(isAllowed),
    get buffers() {
      return buffers;
    },
    get sources() {
      return sources;
    },
    get resumes() {
      return resumes;
    },
  };
}

interface FakeAudio extends AudioEnvironment {
  readonly opened: number;
  interact: () => void;
}

function createFakeAudio(context: ClickAudioContext | null, isActive = true): FakeAudio {
  let opened = 0;
  let hasBeenActive = isActive;
  return {
    createContext: () => {
      opened += 1;
      return context;
    },
    hasUserActivation: () => hasBeenActive,
    interact: () => {
      hasBeenActive = true;
    },
    get opened() {
      return opened;
    },
  };
}

function settlePromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('createWebAudioOutput', () => {
  it('opens the audio context when sound is switched on after the user has interacted', () => {
    const audio = createFakeAudio(createFakeContext());
    const output = createWebAudioOutput(audio);

    const isReady = output.prepare();

    expect(isReady).toBe(true);
    expect(audio.opened).toBe(1);
  });

  it('opens the audio context only once', () => {
    const context = createFakeContext();
    const audio = createFakeAudio(context);
    const output = createWebAudioOutput(audio);

    output.prepare();
    output.prepare();
    output.play(SAMPLES);

    expect(audio.opened).toBe(1);
    expect(context.sources).toHaveLength(1);
  });

  it('plays each click through a new buffer source on the speakers', () => {
    const context = createFakeContext();
    const output = createWebAudioOutput(createFakeAudio(context));

    const isPlaying = output.play(SAMPLES);

    const [buffer] = context.buffers;
    const [source] = context.sources;
    expect(isPlaying).toBe(true);
    expect(buffer.length).toBe(SAMPLES.length);
    expect(buffer.sampleRate).toBe(SAMPLE_RATE);
    expect([...buffer.data]).toEqual([...SAMPLES]);
    expect(source.buffer).toBe(buffer);
    expect(source.connectedTo).toEqual([context.destination]);
    expect(source.starts).toBe(1);
  });

  it('waits for the first user interaction before opening the audio context', () => {
    const context = createFakeContext();
    const audio = createFakeAudio(context, false);
    const output = createWebAudioOutput(audio);

    const isReady = output.prepare();
    const isStillAvailable = output.play(SAMPLES);
    const openedBefore = audio.opened;
    audio.interact();
    output.play(SAMPLES);

    expect(isReady).toBe(true);
    expect(isStillAvailable).toBe(true);
    expect(openedBefore).toBe(0);
    expect(audio.opened).toBe(1);
    expect(context.sources).toHaveLength(1);
  });

  it('resumes a suspended audio context and drops clicks until it runs', async () => {
    const context = createFakeContext({ state: 'suspended' });
    const output = createWebAudioOutput(createFakeAudio(context));

    output.prepare();
    const isStillAvailable = output.play(SAMPLES);
    const startedWhileSuspended = context.sources.length;
    const resumesWhilePending = context.resumes;
    context.finishResume(true);
    await settlePromises();
    output.play(SAMPLES);

    expect(isStillAvailable).toBe(true);
    expect(startedWhileSuspended).toBe(0);
    expect(resumesWhilePending).toBe(1);
    expect(context.sources).toHaveLength(1);
  });

  it('asks again on the next click after the browser refuses to resume', async () => {
    const context = createFakeContext({ state: 'suspended' });
    const output = createWebAudioOutput(createFakeAudio(context));

    output.prepare();
    context.finishResume(false);
    await settlePromises();
    const isStillAvailable = output.play(SAMPLES);

    expect(isStillAvailable).toBe(true);
    expect(context.resumes).toBe(2);
    expect(context.sources).toHaveLength(0);
  });

  it('reports no audio where Web Audio is missing', () => {
    const output = createWebAudioOutput(createFakeAudio(null));

    expect(output.prepare()).toBe(false);
    expect(output.play(SAMPLES)).toBe(false);
  });

  it('reports no audio when the audio context cannot be opened', () => {
    const output = createWebAudioOutput({
      createContext: () => {
        throw new Error('Too many audio contexts.');
      },
      hasUserActivation: () => true,
    });

    expect(output.prepare()).toBe(false);
  });

  it('reports no audio once the audio context is closed', () => {
    const output = createWebAudioOutput(createFakeAudio(createFakeContext({ state: 'closed' })));

    expect(output.play(SAMPLES)).toBe(false);
  });

  it('reports no audio when a click fails to play', () => {
    const output = createWebAudioOutput(createFakeAudio(createFakeContext({ canPlay: false })));

    expect(output.play(SAMPLES)).toBe(false);
  });
});

describe('readUserActivation', () => {
  it('reads whether the page has had a user interaction', () => {
    expect(readUserActivation({ userActivation: { hasBeenActive: false } })).toBe(false);
    expect(readUserActivation({ userActivation: { hasBeenActive: true } })).toBe(true);
  });

  it('assumes an interaction where the browser cannot tell', () => {
    expect(readUserActivation({})).toBe(true);
    expect(readUserActivation(undefined)).toBe(true);
  });
});
