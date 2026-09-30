import type { GridSize } from '../../../../src/core/types';

import type { VariantCase } from './clip-checks';

const ELEVEN: GridSize = { cols: 11, rows: 11 };
const THIRTEEN: GridSize = { cols: 13, rows: 13 };
const TEN: GridSize = { cols: 10, rows: 10 };
const NINE: GridSize = { cols: 9, rows: 9 };

export const VARIANT_CASES: readonly VariantCase[] = [
  { label: 'ember', params: { variant: 'ember' }, setGrid: ELEVEN, minSide: 3, isLoop: true },
  { label: 'fuse', params: { variant: 'fuse' }, setGrid: ELEVEN, minSide: 5, isLoop: true },
  { label: 'burst', params: { variant: 'burst' }, setGrid: ELEVEN, minSide: 9, isLoop: false },
  { label: 'burst x3', params: { variant: 'burst', length: 3 }, setGrid: THIRTEEN, minSide: 9, isLoop: true },
  { label: 'dud', params: { variant: 'dud' }, setGrid: ELEVEN, minSide: 5, isLoop: false },
  { label: 'jet', params: { variant: 'jet' }, setGrid: ELEVEN, minSide: 9, isLoop: true },
  { label: 'jet low', params: { variant: 'jet', density: 0.3 }, setGrid: ELEVEN, minSide: 9, isLoop: true },
  { label: 'jet-progress', params: { variant: 'jet-progress' }, setGrid: ELEVEN, minSide: 9, isLoop: true },
  { label: 'jet-burst', params: { variant: 'jet-burst' }, setGrid: ELEVEN, minSide: 9, isLoop: false },
  { label: 'jet-sputter', params: { variant: 'jet-sputter' }, setGrid: ELEVEN, minSide: 9, isLoop: false },
  { label: 'warp', params: { variant: 'warp' }, setGrid: ELEVEN, minSide: 9, isLoop: true },
  { label: 'warp-drift', params: { variant: 'warp-drift' }, setGrid: ELEVEN, minSide: 9, isLoop: true },
  { label: 'warp-arrive', params: { variant: 'warp-arrive' }, setGrid: ELEVEN, minSide: 9, isLoop: false },
  { label: 'warp-stall', params: { variant: 'warp-stall' }, setGrid: ELEVEN, minSide: 9, isLoop: false },
  { label: 'fireflies', params: { variant: 'fireflies' }, setGrid: TEN, minSide: 6, isLoop: true },
  {
    label: 'fireflies free',
    params: { variant: 'fireflies', density: 0 },
    setGrid: TEN,
    minSide: 6,
    isLoop: true,
  },
  { label: 'fireflies-beat', params: { variant: 'fireflies-beat' }, setGrid: TEN, minSide: 6, isLoop: true },
  { label: 'fireflies-sync', params: { variant: 'fireflies-sync' }, setGrid: TEN, minSide: 6, isLoop: false },
  {
    label: 'fireflies-scatter',
    params: { variant: 'fireflies-scatter' },
    setGrid: TEN,
    minSide: 6,
    isLoop: false,
  },
  { label: 'drip', params: { variant: 'drip' }, setGrid: NINE, minSide: 7, isLoop: true },
  { label: 'drip-form', params: { variant: 'drip-form' }, setGrid: NINE, minSide: 7, isLoop: true },
  { label: 'drip-fill', params: { variant: 'drip-fill' }, setGrid: NINE, minSide: 7, isLoop: false },
  { label: 'drip-miss', params: { variant: 'drip-miss' }, setGrid: NINE, minSide: 7, isLoop: false },
];
