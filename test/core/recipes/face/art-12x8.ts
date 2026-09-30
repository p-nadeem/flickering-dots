const BLANK = '............';

function stack(top: number, rows: readonly string[]): string[] {
  const filled = [...Array.from({ length: top }, () => BLANK), ...rows];
  return [...filled, ...Array.from({ length: 8 - filled.length }, () => BLANK)];
}

function eyes(top: number, cap: string, body: string, bodyRows: number): string[] {
  return stack(top, [cap, ...Array.from({ length: bodyRows }, () => body), cap]);
}

export const CENTRE = eyes(1, '..##....##..', '.####..####.', 4);
export const LEFT_1 = eyes(1, '.##....##...', '####..####..', 4);
export const LEFT_2 = eyes(1, '.##...##....', '####.####...', 4);
export const RIGHT_1 = eyes(1, '...##....##.', '..####..####', 4);
export const RIGHT_2 = eyes(1, '....##...##.', '...####.####', 4);
export const UP_CENTRE = eyes(0, '..##....##..', '.####..####.', 4);
export const UP_LEFT = eyes(0, '.##...##....', '####.####...', 4);
export const UP_RIGHT = eyes(0, '....##...##.', '...####.####', 4);
export const BLINK_3 = stack(2, ['..##....##..', '.####..####.', '..##....##..']);
export const BLINK_1 = stack(3, ['.####..####.']);
