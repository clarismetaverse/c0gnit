// ============================================================
// Seeded RNG — Mulberry32 PRNG
// Fully deterministic, replayable. No hidden state.
// ============================================================

export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Returns float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000;
  }

  /** Returns integer in [min, max). */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  /** Weighted random selection from items with corresponding weights. */
  weightedSelect<T>(items: T[], weights: number[]): T {
    if (items.length === 0) throw new Error('weightedSelect: empty items');
    const total = weights.reduce((a, b) => a + b, 0);
    let cursor = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      cursor -= weights[i] ?? 0;
      if (cursor <= 0) return items[i] as T;
    }
    return items[items.length - 1] as T;
  }

  /** Fork a child RNG from current state (deterministic child seed). */
  fork(salt: number): SeededRNG {
    return new SeededRNG((this.state ^ salt) >>> 0);
  }
}
