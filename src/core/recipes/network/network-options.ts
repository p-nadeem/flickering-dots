/** The seed every network variant uses when none is given. */
export const NETWORK_DEFAULT_SEED = 3;

/** Options shared by the network engine's variant builders. */
export interface NetworkOptions {
  seed: number;
  length?: number;
}
