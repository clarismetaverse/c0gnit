// ============================================================
// STATE LAYER — dynamic node state management
// Deterministic updates. All mutations go through here.
// ============================================================

import type { CREGraph, CRENode, StateSnapshot } from './types.js';

/** Apply incoming activation to a node (deterministic). */
export function applyActivation(node: CRENode, incomingActivation: number, tick: number): void {
  // Blend: existing activation dampens, incoming adds. Clamped to [0,1].
  node.activation = Math.min(1, node.activation * 0.5 + incomingActivation * 0.5);
  node.visitCount += 1;
  node.lastVisitedAt = tick;
}

/** Boost an attractor node — attractors resist decay more strongly. */
export function boostAttractor(node: CRENode): void {
  if (node.isAttractor) {
    node.activation = Math.min(1, node.activation + 0.1);
    node.energy = Math.min(1, node.energy + 0.05);
  }
}

/** Save current state into history for replay / observability. */
export function snapshotNode(node: CRENode, tick: number, incomingEdgeWeight: number): void {
  const snap: StateSnapshot = {
    tick,
    activation: node.activation,
    energy: node.energy,
    visitCount: node.visitCount,
    incomingEdgeWeight,
    representations: JSON.parse(JSON.stringify(node.representations)) as typeof node.representations,
  };
  node.stateHistory.push(snap);
}

/** Reset a node to a clean baseline state. */
export function resetNode(node: CRENode): void {
  node.activation = 0;
  node.energy = 1.0;
  node.visitCount = 0;
  node.lastVisitedAt = -1;
  node.stateHistory = [];
}

/** Inject a raw activation pulse into a named node. */
export function injectActivation(graph: CREGraph, nodeId: string, amount: number, tick: number): void {
  const node = graph.nodes.get(nodeId);
  if (!node) throw new Error(`injectActivation: unknown node "${nodeId}"`);
  applyActivation(node, amount, tick);
}
