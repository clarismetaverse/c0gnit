// ============================================================
// TEMPERATURE SYSTEM — Control Theory feedback
// Temperature governs exploration vs exploitation in routing.
// Stable systems → low temperature (exploit known paths).
// Unstable / repeated cycles → high temperature (explore).
// ============================================================

import type { CREConfig } from './types.js';

export interface TemperatureInputs {
  cycleDepth: number;
  entropy: number;    // [0, log2(N)]
  stability: number;  // [0, 1], 1 = stable
  maxEntropy: number; // log2(nodeCount) — normalizer
}

/**
 * Compute temperature in [0, 1].
 * temperature = base + (instability_contrib + entropy_contrib + cycle_contrib) * scaling
 */
export function computeTemperature(inputs: TemperatureInputs, config: CREConfig): number {
  const { cycleDepth, entropy, stability, maxEntropy } = inputs;

  const instabilityContrib = (1 - stability) * 0.4;
  const entropyContrib = (maxEntropy > 0 ? entropy / maxEntropy : 0) * 0.3;
  // Repeated cycles increase exploration to avoid ruts
  const cycleContrib = Math.min(0.3, cycleDepth * 0.03);

  const raw = config.baseTemperature + instabilityContrib + entropyContrib + cycleContrib;
  return Math.min(1, Math.max(0.05, raw));
}

/**
 * Apply temperature-based softmax scaling to an array of scores.
 * Higher temperature → flatter distribution (more random).
 * Lower temperature → spikier distribution (more greedy).
 */
export function temperatureScale(scores: number[], temperature: number): number[] {
  const t = Math.max(0.01, temperature);
  const scaled = scores.map(s => Math.exp(s / t));
  const total = scaled.reduce((a, b) => a + b, 0);
  return total === 0 ? scaled.map(() => 1 / scores.length) : scaled.map(s => s / total);
}
