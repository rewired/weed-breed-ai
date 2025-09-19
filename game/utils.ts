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

export type RandomAdapter = {
  /** Returns a float between 0 (inclusive) and 1 (exclusive). */
  float(): number;
  /** Returns an integer between min (inclusive) and max (inclusive). */
  int(min: number, max: number): number;
  /** Returns true with a probability of p. */
  chance(p: number): boolean;
};

export function createRandomAdapter(rng: () => number): RandomAdapter {
  return {
    float(): number {
      return rng();
    },
    int(min: number, max: number): number {
      if (max < min) {
        throw new Error('max must be greater than or equal to min');
      }
      return Math.floor(rng() * (max - min + 1)) + min;
    },
    chance(p: number): boolean {
      if (p <= 0) {
        return false;
      }
      if (p >= 1) {
        return true;
      }
      return rng() < p;
    },
  };
}

export function createSeededRandomAdapter(seed: number): RandomAdapter {
  return createRandomAdapter(mulberry32(seed));
}

/**
 * Yields control back to the main thread, allowing the browser to process
 * UI updates, user input, and other tasks. Useful for breaking up long-running
 * synchronous computations to prevent the UI from freezing.
 */
export function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
