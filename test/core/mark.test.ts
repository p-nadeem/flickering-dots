import { describe, expect, it } from 'vitest';

import { MARK, markSvg } from '../../src/core/mark';
import { resolve } from '../../src/core/resolve';

import { toFrame } from './fixtures';

const DOT = toFrame('00000 00000 00100 00000 00000');
const PLUS = toFrame('00000 00100 01110 00100 00000');
const ASTERISK = toFrame('10101 01110 11111 01110 10101');

function circle(cx: number, cy: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="5" fill="${fill}"/>`;
}

function svg(size: number, box: number, circles: readonly string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}">${circles.join('')}</svg>`;
}

const AT = [5, 17.5, 30, 42.5, 55] as const;

describe('MARK', () => {
  it('is a 5x5 builtin set with idle and thinking', () => {
    expect(MARK).toMatchObject({
      id: 'mark',
      name: 'Flickering Dots mark',
      cols: 5,
      rows: 5,
      transition: 'cut',
      tags: [],
      author: 'Flickering Dots',
      source: 'builtin',
    });
    expect(Object.keys(MARK.states)).toEqual(['idle', 'thinking']);
  });

  it('idles on the centre dot', () => {
    expect(MARK.states.idle).toEqual({ kind: 'frames', frames: [DOT], durations: [1000] });
  });

  it('pulses from the dot through the plus to the asterisk and back', () => {
    expect(MARK.states.thinking).toEqual({
      kind: 'frames',
      frames: [DOT, PLUS, ASTERISK, PLUS],
      durations: [320, 90, 520, 90],
    });
  });

  it('resolves like any other set', () => {
    expect(resolve(MARK, 'thinking')).toMatchObject({
      cols: 5,
      rows: 5,
      frames: [DOT, PLUS, ASTERISK, PLUS],
    });
  });
});

describe('markSvg', () => {
  it('draws the 3x3 plus at its natural size without off dots', () => {
    expect(markSvg({ grid: 3, on: '#fff' })).toBe(
      svg(35, 35, [
        circle(17.5, 5, '#fff'),
        circle(5, 17.5, '#fff'),
        circle(17.5, 17.5, '#fff'),
        circle(30, 17.5, '#fff'),
        circle(17.5, 30, '#fff'),
      ]),
    );
  });

  it('draws every dot of the 3x3 grid when an off colour is given', () => {
    const on = '#111113';
    const off = '#d0d0c8';

    expect(markSvg({ grid: 3, on, off, px: 16 })).toBe(
      svg(16, 35, [
        circle(5, 5, off),
        circle(17.5, 5, on),
        circle(30, 5, off),
        circle(5, 17.5, on),
        circle(17.5, 17.5, on),
        circle(30, 17.5, on),
        circle(5, 30, off),
        circle(17.5, 30, on),
        circle(30, 30, off),
      ]),
    );
  });

  it('draws the 5x5 asterisk favicon exactly as the prototype does', () => {
    const lit = ASTERISK.flatMap((bit, index) =>
      bit ? [circle(AT[index % 5], AT[Math.floor(index / 5)], '#e4ff3e')] : [],
    );

    expect(markSvg({ grid: 5, on: '#e4ff3e', off: null, px: 32 })).toBe(svg(32, 60, lit));
    expect(lit).toHaveLength(17);
  });

  it('draws all 25 dots of the 5x5 grid with an off colour', () => {
    const result = markSvg({ grid: 5, on: '#111113', off: '#d0d0c8' });

    expect(
      result.startsWith(
        '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">',
      ),
    ).toBe(true);
    expect(result.match(/<circle /g)).toHaveLength(25);
    expect(result.match(/fill="#d0d0c8"/g)).toHaveLength(8);
  });

  it('treats an empty off colour as no off dots', () => {
    expect(markSvg({ grid: 3, on: '#fff', off: '' })).toBe(markSvg({ grid: 3, on: '#fff' }));
  });

  it('escapes colours so they cannot break out of the attribute', () => {
    const result = markSvg({ grid: 3, on: 'x"/><script>&', off: "o'" });

    expect(result).toContain('fill="x&quot;/&gt;&lt;script&gt;&amp;"');
    expect(result).toContain('fill="o&#39;"');
    expect(result).not.toContain('<script>');
  });

  it('rejects an off colour that is not text or null', () => {
    expect(() => markSvg({ grid: 3, on: '#fff', off: 5 as unknown as string })).toThrow(
      'flickering-dots markSvg: off must be a colour string or null, got 5',
    );
  });

  it('rejects a grid other than 5 or 3', () => {
    expect(() => markSvg({ grid: 4 as 5, on: '#fff' })).toThrow(
      'flickering-dots markSvg: grid must be 5 or 3, got 4',
    );
  });

  it('rejects a size that is not a positive number', () => {
    expect(() => markSvg({ grid: 5, on: '#fff', px: 0 })).toThrow(
      'flickering-dots markSvg: px must be a positive number, got 0',
    );
    expect(() => markSvg({ grid: 5, on: '#fff', px: Number.NaN })).toThrow(
      'px must be a positive number, got NaN',
    );
  });

  it('rejects an on colour that is not text', () => {
    expect(() => markSvg({ grid: 5, on: 7 as unknown as string })).toThrow(
      'flickering-dots markSvg: on must be a colour string, got 7',
    );
  });
});
