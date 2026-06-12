// ============================================================
// STRUCTURE LAYER — deterministic graph primitives
// No randomness, no dynamic state. Pure topology.
// ============================================================

import type { CREEdge, CREGraph, CRENode, NodeRepresentations } from './types.js';

// ----------------------------------------------------------------
// Default representations (used when building a node from scratch)
// ----------------------------------------------------------------

function defaultRepresentations(id: string, label: string): NodeRepresentations {
  return {
    symbolic: {
      predicate: id.toUpperCase(),
      args: [label],
      confidence: 1.0,
    },
    geometric: {
      vector: [0, 0, 0],
      magnitude: 0,
      phase: 0,
    },
    linguistic: {
      summary: label,
      semanticDrift: 0,
      surpriseScore: 0,
    },
    procedural: {
      trigger: `on_activate_${id}`,
      actions: [`process(${id})`],
      priority: 1,
    },
  };
}

// ----------------------------------------------------------------
// Graph builder — fluent API, fully deterministic
// ----------------------------------------------------------------

export class GraphBuilder {
  private nodes: Map<string, CRENode> = new Map();
  private edges: CREEdge[] = [];

  addNode(
    id: string,
    label: string,
    options: { isAttractor?: boolean; initialActivation?: number; initialEnergy?: number } = {}
  ): this {
    const node: CRENode = {
      id,
      label,
      isAttractor: options.isAttractor ?? false,
      activation: options.initialActivation ?? 0,
      energy: options.initialEnergy ?? 1.0,
      visitCount: 0,
      lastVisitedAt: -1,
      representations: defaultRepresentations(id, label),
      stateHistory: [],
    };
    this.nodes.set(id, node);
    return this;
  }

  addEdge(
    from: string,
    to: string,
    weight: number,
    options: { label?: string; transform?: (a: number) => number } = {}
  ): this {
    if (!this.nodes.has(from)) throw new Error(`Unknown source node: ${from}`);
    if (!this.nodes.has(to)) throw new Error(`Unknown target node: ${to}`);
    this.edges.push({ from, to, weight, label: options.label, transform: options.transform });
    return this;
  }

  build(): CREGraph {
    const adjacency = new Map<string, CREEdge[]>();
    for (const id of this.nodes.keys()) adjacency.set(id, []);
    for (const edge of this.edges) {
      adjacency.get(edge.from)!.push(edge);
    }
    return { nodes: new Map(this.nodes), edges: this.edges, adjacency };
  }
}

// ----------------------------------------------------------------
// Graph utilities
// ----------------------------------------------------------------

export function getOutgoingEdges(graph: CREGraph, nodeId: string): CREEdge[] {
  return graph.adjacency.get(nodeId) ?? [];
}

export function getNode(graph: CREGraph, nodeId: string): CRENode {
  const node = graph.nodes.get(nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return node;
}
