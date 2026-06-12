// ============================================================
// MEMORY + DECAY SYSTEM — Control Theory feedback stabilization
// Decay prevents infinite accumulation.
// Attractors resist decay. Stabilization damps oscillations.
// ============================================================

import type { CREConfig, CREGraph, CRENode } from './types.js';

/** Apply exponential activation decay to a single node. */
function decayNode(node: CRENode, config: CREConfig): void {
  const factor = node.isAttractor
    ? Math.sqrt(config.decayFactor)       // attractors decay slower
    : config.decayFactor;
  node.activation *= factor;
  node.energy *= config.energyDecayFactor;

  // Floor to zero to avoid floating-point noise
  if (node.activation < 1e-6) node.activation = 0;
  if (node.energy < 1e-6) node.energy = 0;
}

/** Global decay pass — applied to ALL nodes each tick. */
export function applyGlobalDecay(graph: CREGraph, config: CREConfig): void {
  for (const node of graph.nodes.values()) {
    decayNode(node, config);
  }
}

/** Reinforce a visited node — useful cycles grow stronger. */
export function reinforce(node: CRENode, amount: number): void {
  node.activation = Math.min(1, node.activation + amount * 0.1);
  node.energy = Math.min(1, node.energy + amount * 0.05);
}

/**
 * Compute system stability: low variance in node activations = stable.
 * Returns [0, 1] where 1 = perfectly stable (all equal activation).
 */
export function computeStability(graph: CREGraph): number {
  const values = [...graph.nodes.values()].map(n => n.activation);
  if (values.length === 0) return 1;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  // Stability = 1 - normalized_variance (variance in [0, 0.25] for values in [0,1])
  return Math.max(0, 1 - variance / 0.25);
}

/**
 * Compute entropy: spread of activation across nodes.
 * High entropy = activation spread evenly (chaotic).
 * Low entropy = activation concentrated (focused).
 */
export function computeEntropy(graph: CREGraph): number {
  const activations = [...graph.nodes.values()].map(n => n.activation);
  const total = activations.reduce((a, b) => a + b, 0);
  if (total < 1e-9) return 0;
  return activations.reduce((h, a) => {
    if (a < 1e-9) return h;
    const p = a / total;
    return h - p * Math.log2(p);
  }, 0);
}
