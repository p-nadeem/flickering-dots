import { createFrameFromPattern } from './recipes/helpers';
import type { Frame, GridSize, IndicatorSet, MarkSvgOptions } from './types';

interface StaticMark extends GridSize {
  frame: Frame;
}

const ERROR_PREFIX = 'flickering-dots markSvg:';
const MARK_GRID: GridSize = { cols: 5, rows: 5 };
const CELL = 10;
const GAP_RATIO = 0.25;
const SVG_NS = 'http://www.w3.org/2000/svg';

const ATTRIBUTE_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const DOT = createFrameFromPattern(['00000', '00000', '00100', '00000', '00000'], MARK_GRID);
const PLUS = createFrameFromPattern(['00000', '00100', '01110', '00100', '00000'], MARK_GRID);
const ASTERISK = createFrameFromPattern(['10101', '01110', '11111', '01110', '10101'], MARK_GRID);
const PLUS_SMALL = createFrameFromPattern(['010', '111', '010'], { cols: 3, rows: 3 });

/** The static marks: the 5x5 asterisk and the 3x3 plus used at 16px. */
export const MARK_STATIC: Readonly<Record<MarkSvgOptions['grid'], StaticMark>> = {
  5: { ...MARK_GRID, frame: ASTERISK },
  3: { cols: 3, rows: 3, frame: PLUS_SMALL },
};

/** The live logo: idle is the centre dot, thinking pulses through the plus to the asterisk. */
export const MARK: IndicatorSet = {
  id: 'mark',
  name: 'Flickering Dots mark',
  ...MARK_GRID,
  states: {
    idle: { kind: 'frames', frames: [DOT], durations: [1000] },
    thinking: { kind: 'frames', frames: [DOT, PLUS, ASTERISK, PLUS], durations: [320, 90, 520, 90] },
  },
  transition: 'cut',
  tags: [],
  author: 'Flickering Dots',
  source: 'builtin',
  contexts: [],
  collections: [],
};

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ATTRIBUTE_ESCAPES[character]);
}

function getStaticMark(grid: unknown): StaticMark {
  if (grid === 5 || grid === 3) return MARK_STATIC[grid];
  throw new Error(`${ERROR_PREFIX} grid must be 5 or 3, got ${String(grid)}`);
}

function assertOptions({ on, off, px }: MarkSvgOptions): void {
  if (typeof on !== 'string' || on === '') {
    throw new Error(`${ERROR_PREFIX} on must be a colour string, got ${String(on)}`);
  }
  if (off !== undefined && off !== null && typeof off !== 'string') {
    throw new Error(`${ERROR_PREFIX} off must be a colour string or null, got ${String(off)}`);
  }
  if (px !== undefined && !(typeof px === 'number' && Number.isFinite(px) && px > 0)) {
    throw new Error(`${ERROR_PREFIX} px must be a positive number, got ${String(px)}`);
  }
}

function toCircle(mark: StaticMark, index: number, fill: string): string {
  const pitch = CELL * (1 + GAP_RATIO);
  const cx = (index % mark.cols) * pitch + CELL / 2;
  const cy = Math.floor(index / mark.cols) * pitch + CELL / 2;
  return `<circle cx="${cx}" cy="${cy}" r="${CELL / 2}" fill="${escapeAttribute(fill)}"/>`;
}

/** Static mark as an SVG string (favicon, social image). */
export function markSvg(options: MarkSvgOptions): string {
  const mark = getStaticMark(options.grid);
  assertOptions(options);
  const offFill = options.off ? options.off : null;
  const width = mark.cols * CELL + (mark.cols - 1) * CELL * GAP_RATIO;
  const size = options.px ?? width;
  const circles = mark.frame.flatMap((bit, index) => {
    const fill = bit ? options.on : offFill;
    return fill === null ? [] : [toCircle(mark, index, fill)];
  });
  return `<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="0 0 ${width} ${width}">${circles.join('')}</svg>`;
}
