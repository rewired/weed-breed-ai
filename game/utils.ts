// A simple mulberry32 PRNG.
// It's simple, fast, and good enough for simulation purposes.
// It creates a function that, when called, returns the next pseudo-random number and updates its internal state.
export function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export interface RandomGenerator {
  /**
   * Returns a deterministic floating point number in the range [0, 1).
   */
  float(): number;
  /**
   * Returns an integer in the inclusive range [min, max].
   */
  int(min: number, max: number): number;
  /**
   * Returns true with the provided probability (0-1).
   */
  chance(probability: number): boolean;
}

export function createRandomGenerator(base: () => number): RandomGenerator {
  return {
    float: () => base(),
    int: (min: number, max: number) => {
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error('Random.int requires finite bounds');
      }
      const lower = Math.ceil(Math.min(min, max));
      const upper = Math.floor(Math.max(min, max));
      const range = upper - lower + 1;
      if (range <= 0) {
        return lower;
      }
      return lower + Math.floor(base() * range);
    },
    chance: (probability: number) => {
      if (probability <= 0) return false;
      if (probability >= 1) return true;
      return base() < probability;
    },
  };
}

export function createSeededRandom(seed: number): RandomGenerator {
  return createRandomGenerator(mulberry32(seed));
}
