// A simple mulberry32 PRNG.
// It's simple, fast, and good enough for simulation purposes.
// It creates a function that, when called, returns the next pseudo-random number and updates its internal state.
export function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Yields control back to the main thread, allowing the browser to process
 * UI updates, user input, and other tasks. Useful for breaking up long-running
 * synchronous computations to prevent the UI from freezing.
 */
export function yieldToMainThread(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export class RandomAdapter {
  private rng: () => number;

  constructor(rng: () => number) {
    this.rng = rng;
  }

  /** Returns a float between 0 (inclusive) and 1 (exclusive). */
  float(): number {
    return this.rng();
  }

  /** Returns an integer between min (inclusive) and max (inclusive). */
  int(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  /** Returns true with a probability of p. */
  chance(p: number): boolean {
    return this.rng() < p;
  }
}