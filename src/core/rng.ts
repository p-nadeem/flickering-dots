const SEED_MULTIPLIER = 2654435761;
const UINT32_RANGE = 4294967296;

/** Deterministic xorshift generator returning values in [0, 1). */
export function createRng(seed: number): () => number {
  if (!Number.isFinite(seed)) {
    throw new Error(`flickering-dots createRng: seed must be a finite number, got ${seed}`);
  }
  let state = ((seed | 0) * SEED_MULTIPLIER) >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / UINT32_RANGE;
  };
}
