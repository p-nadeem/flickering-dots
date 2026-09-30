import { describe, expect, it } from 'vitest';

import { busiestFrame, getPreset, resolve } from '../../src/index';
import type { Frame, IndicatorSet, StateName } from '../../src/index';

import { createDotsController } from '../../src/element/controller';

import { createFakeCell, createFakeGrid, toBits } from './fake-dom';
import { createFakeEnvironment, createFakeHost, mount } from './fake-host';

const ON = 'var(--dot-on, #e4ff3e)';

function presetOf(id: string): IndicatorSet {
  const preset = getPreset(id);
  if (!preset) throw new Error(`missing preset ${id}`);
  return preset;
}

function framesOf(id: string, state?: StateName): readonly Frame[] {
  return resolve(presetOf(id), state).frames;
}

function mixColumns(next: Frame, previous: Frame, cols: number, upTo: number): number[] {
  return next.map((bit, index) => (index % cols <= upTo ? bit : previous[index]));
}

describe('dots controller playback', () => {
  it('builds the grid and plays the pulse thinking frames in time', () => {
    const frames = framesOf('pulse');
    const { grid, env } = mount({ set: 'pulse' });
    const first = toBits(grid.cells, ON);

    env.clock.advance(480);
    const second = toBits(grid.cells, ON);
    env.clock.advance(80);

    expect(grid.cells).toHaveLength(49);
    expect(first).toEqual([...frames[0]]);
    expect(second).toEqual([...frames[1]]);
    expect(toBits(grid.cells, ON)).toEqual([...frames[2]]);
  });

  it('scales frame times by the tuned speed', () => {
    const frames = framesOf('pulse');
    const { grid, env } = mount({ set: 'pulse', tune: { speed: 2 } });

    env.clock.advance(240);

    expect(toBits(grid.cells, ON)).toEqual([...frames[1]]);
  });

  it('holds the first frame while paused and carries on when unpaused', () => {
    const frames = framesOf('pulse');
    const { grid, env, set } = mount({ set: 'pulse', paused: '' });
    env.clock.advance(1000);
    const held = toBits(grid.cells, ON);
    const pendingWhilePaused = env.clock.pending;

    set('paused', null);
    env.clock.advance(480);

    expect(held).toEqual([...frames[0]]);
    expect(pendingWhilePaused).toBe(0);
    expect(toBits(grid.cells, ON)).toEqual([...frames[1]]);
  });

  it('shows one frame with no playback when frame is set', () => {
    const frames = framesOf('pulse');
    const { grid, env, set } = mount({ set: 'pulse', frame: '3' });
    const third = toBits(grid.cells, ON);

    set('frame', '99');

    expect(third).toEqual([...frames[3]]);
    expect(toBits(grid.cells, ON)).toEqual([...frames[frames.length - 1]]);
    expect(env.clock.pending).toBe(0);
  });

  it('plays again from the first frame when frame is removed', () => {
    const frames = framesOf('pulse');
    const { grid, env, set } = mount({ set: 'pulse', frame: '3' });

    set('frame', undefined);
    const restarted = toBits(grid.cells, ON);
    env.clock.advance(480);

    expect(restarted).toEqual([...frames[0]]);
    expect(toBits(grid.cells, ON)).toEqual([...frames[1]]);
  });

  it('paints lit dots with a CSS variable colour', () => {
    const on = 'var(--fd-on, #e4ff3e)';
    const { grid } = mount({ set: 'pulse', on });

    expect(toBits(grid.cells, on)).toEqual([...framesOf('pulse')[0]]);
  });

  it('shows the busiest frame with no playback when reduced is set', () => {
    const clip = resolve(presetOf('pulse'));
    const { grid, env } = mount({ set: 'pulse', reduced: '' });

    expect(toBits(grid.cells, ON)).toEqual([...clip.frames[busiestFrame(clip)]]);
    expect(env.clock.pending).toBe(0);
  });

  it('shows the shimmer base, not a band frame, when reduced is set', () => {
    const frames = framesOf('shimmer');
    const { grid } = mount({ set: 'shimmer', reduced: '' });

    expect(toBits(grid.cells, ON)).toEqual([...(frames.at(-1) ?? [])]);
  });

  it('follows the reduced motion preference as it changes', () => {
    const clip = resolve(presetOf('pulse'));
    const env = createFakeEnvironment();
    env.setReducedMotion(true);
    const { grid } = mount({ set: 'pulse' }, env);
    const reduced = toBits(grid.cells, ON);

    env.setReducedMotion(false);
    env.flush();

    expect(reduced).toEqual([...clip.frames[busiestFrame(clip)]]);
    expect(toBits(grid.cells, ON)).toEqual([...clip.frames[0]]);
    expect(env.clock.pending).toBe(1);
  });

  it('restyles on a look change without restarting playback', () => {
    const frames = framesOf('pulse');
    const { grid, env, set } = mount({ set: 'pulse', size: '28' });
    env.clock.advance(480);

    set('size', '56');
    const afterResize = toBits(grid.cells, ON);
    env.clock.advance(80);

    expect(grid.cells[0].style.width).toBe(`${56 / 8.5}px`);
    expect(afterResize).toEqual([...frames[1]]);
    expect(toBits(grid.cells, ON)).toEqual([...frames[2]]);
  });

  it('does not restart when an equal object is set again', () => {
    const frames = framesOf('pulse');
    const { grid, env, set } = mount({ set: 'pulse', tune: { size: 28 } });
    env.clock.advance(480);

    set('tune', { size: 28 });
    env.clock.advance(80);

    expect(toBits(grid.cells, ON)).toEqual([...frames[2]]);
  });

  it('batches changes made in the same task into one update', () => {
    const { controller, env } = mount({ set: 'pulse' });
    const before = env.deferred;

    controller.setProp('size', '30');
    controller.setProp('gap', '0.5');
    controller.setProp('shape', 'square');

    expect(env.deferred - before).toBe(1);
  });

  it('returns each prop as it was set', () => {
    const tune = { size: 40 };
    const { controller } = mount({ tune });

    expect(controller.getProp('tune')).toBe(tune);
    expect(controller.getProp('state')).toBeNull();
  });
});

describe('dots controller transitions', () => {
  it("wipes column by column into the new state with the set's flip", () => {
    const idle = framesOf('okfail', 'idle');
    const error = framesOf('okfail', 'error');
    const { grid, env, set } = mount({ set: 'okfail', state: 'idle' });

    set('state', 'error');
    const firstColumn = toBits(grid.cells, ON);
    env.clock.advance(26);
    const secondColumn = toBits(grid.cells, ON);
    env.clock.advance(6 * 26 + 180 - 26);

    expect(firstColumn).toEqual(mixColumns(error[0], idle[0], 7, 0));
    expect(secondColumn).toEqual(mixColumns(error[0], idle[0], 7, 1));
    expect(toBits(grid.cells, ON)).toEqual([...error[0]]);
    expect(env.clock.pending).toBe(1);
  });

  it('dips and repaints halfway for a crossfade', () => {
    const idle = framesOf('ember', 'idle');
    const thinking = framesOf('ember', 'thinking');
    const { grid, env, set } = mount({ set: 'ember', state: 'idle' });

    set('state', 'thinking');
    const duringDip = toBits(grid.cells, ON);
    env.clock.advance(140);

    expect(grid.animations).toHaveLength(1);
    expect(duringDip).toEqual([...idle[0]]);
    expect(toBits(grid.cells, ON)).toEqual([...thinking[0]]);
  });

  it('switches at once for a cut', () => {
    const { grid, set } = mount({ set: 'typing-hop', state: 'idle' });

    set('state', 'thinking');

    expect(toBits(grid.cells, ON)).toEqual([...framesOf('typing-hop', 'thinking')[0]]);
  });

  it('lets the transition attribute override the set', () => {
    const { grid, set } = mount({ set: 'okfail', state: 'idle', transition: 'cut' });

    set('state', 'error');

    expect(toBits(grid.cells, ON)).toEqual([...framesOf('okfail', 'error')[0]]);
  });

  it('does not transition when the state is first given', () => {
    const { grid, set } = mount({ set: 'okfail' });

    set('state', 'error');

    expect(toBits(grid.cells, ON)).toEqual([...framesOf('okfail', 'error')[0]]);
  });

  it('cuts when the grid changes size', () => {
    const { grid, set } = mount({ set: 'pulse', state: 'thinking' });

    set('set', 'radar');

    expect(grid.cells).toHaveLength(81);
    expect(toBits(grid.cells, ON)).toEqual([...framesOf('radar')[0]]);
  });

  it('advances through the set states every 2.4 s when cycling', () => {
    const { controller, host, env } = mount({ set: 'okfail', state: 'idle', cycle: '' });

    env.clock.advance(2400);
    env.flush();
    const first = host.attributes['aria-label'];
    env.clock.advance(6 * 26 + 180 + 2400);
    env.flush();

    expect(first).toBe('success');
    expect(host.attributes['aria-label']).toBe('error');
    expect(controller.getProp('state')).toBe('error');
  });

  it('cuts straight to the new state when reduced motion is preferred', () => {
    const env = createFakeEnvironment();
    env.setReducedMotion(true);
    const { grid, set } = mount({ set: 'okfail', state: 'idle' }, env);

    set('state', 'error');

    expect(env.clock.pending).toBe(0);
    expect(grid.animations).toEqual([]);
    expect(grid.cells.flatMap((cell) => cell.animations)).toEqual([]);
    expect(toBits(grid.cells, ON)).toEqual([
      ...framesOf('okfail', 'error')[busiestFrame(resolve(presetOf('okfail'), 'error'))],
    ]);
  });

  it('skips the crossfade when the reduced attribute is set', () => {
    const { grid, env, set } = mount({ set: 'ember', state: 'idle', reduced: '' });

    set('state', 'thinking');

    expect(env.clock.pending).toBe(0);
    expect(grid.animations).toEqual([]);
  });

  it('does not cycle a set with one state', () => {
    const { host, env } = mount({ set: 'life', cycle: '' });

    env.clock.advance(5000);
    env.flush();

    expect(host.attributes['aria-label']).toBe('thinking');
  });
});

describe('dots controller sound', () => {
  it('clicks on each frame when audible', () => {
    const { env } = mount({ set: 'pulse', audible: '' });

    env.clock.advance(480);

    expect(env.clicks).toBe(2);
  });

  it('stays quiet without audible, while paused, and for a single frame', () => {
    const quiet = mount({ set: 'pulse' });
    const paused = mount({ set: 'pulse', audible: '', paused: '' });
    const still = mount({ frames: { cols: 3, rows: 3, frames: [[0, 0, 0, 0, 1, 0, 0, 0, 0]] }, audible: '' });

    [quiet, paused, still].forEach(({ env }) => env.clock.advance(1000));

    expect([quiet.env.clicks, paused.env.clicks, still.env.clicks]).toEqual([0, 0, 0]);
  });
});

describe('dots controller lifecycle', () => {
  it('clears every timer on disconnect and restarts on reconnect', () => {
    const { controller, env } = mount({ set: 'okfail', state: 'idle', cycle: '' });
    const pendingWhileConnected = env.clock.pending;

    controller.disconnect();
    const pendingAfterDisconnect = env.clock.pending;
    controller.connect();
    env.flush();

    expect(pendingWhileConnected).toBe(2);
    expect(pendingAfterDisconnect).toBe(0);
    expect(env.clock.pending).toBe(2);
  });

  it('cancels a transition in progress on disconnect', () => {
    const { controller, env, set } = mount({ set: 'okfail', state: 'idle' });
    set('state', 'error');

    controller.disconnect();

    expect(env.clock.pending).toBe(0);
  });

  it('does not render until connected', () => {
    const env = createFakeEnvironment();
    const host = createFakeHost();
    const grid = createFakeGrid();
    const controller = createDotsController({ host, grid, createCell: () => createFakeCell() }, env);
    controller.setProp('set', 'pulse');
    env.flush();
    const beforeConnect = grid.cells.length;

    controller.connect();
    env.flush();

    expect(beforeConnect).toBe(0);
    expect(grid.cells).toHaveLength(49);
  });
});

describe('dots controller accessibility', () => {
  it('is an image labelled with the state name', () => {
    const { host, set } = mount({ set: 'okfail', state: 'success' });
    const first = { ...host.attributes };

    set('state', 'error');

    expect(first).toEqual({ role: 'img', 'aria-label': 'success' });
    expect(host.attributes['aria-label']).toBe('error');
  });

  it('uses the label when one is given', () => {
    const { host } = mount({ set: 'pulse', label: 'Generating a reply' });

    expect(host.attributes['aria-label']).toBe('Generating a reply');
  });

  it('hides itself from assistive tech with an empty label and returns when labelled again', () => {
    const { host, set } = mount({ set: 'pulse', label: '' });
    const hidden = { ...host.attributes };

    set('label', 'Loading');

    expect(hidden).toEqual({ 'aria-hidden': 'true' });
    expect(host.attributes).toEqual({ role: 'img', 'aria-label': 'Loading' });
  });

  it('keeps an aria-hidden it did not set', () => {
    const env = createFakeEnvironment();
    const mounted = mount({}, env);
    mounted.host.setAttribute('aria-hidden', 'true');

    mounted.set('label', 'Loading');

    expect(mounted.host.attributes['aria-hidden']).toBe('true');
  });
});

describe('dots controller errors', () => {
  it('reports an unknown preset and plays the pulse preset instead', () => {
    const { host, grid } = mount({ set: 'spinner' });

    expect(host.errors).toEqual(['flickering-dots element: there is no preset called "spinner"']);
    expect(toBits(grid.cells, ON)).toEqual([...framesOf('pulse')[0]]);
  });

  it('reports tune JSON that does not parse once', () => {
    const { host, set } = mount({ tune: '{size:40}' });

    set('size', '30');

    expect(host.errors).toHaveLength(1);
    expect(host.errors[0]).toMatch(/^flickering-dots element: tune is not valid JSON/);
  });
});
