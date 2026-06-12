// ============================================================
// ROUTING LAYER — semi-stochastic core intelligence
// Step 1: deterministic scoring of all outgoing edges
// Step 2: top-K filtering
// Step 3: temperature-controlled stochastic selection
// ============================================================

import type {
  CREEdge,
  CREGraph,
  CRENode,
  CRERuntimeState,
  CREConfig,
  RoutingCandidate,
} from './types.js';
import { getOutgoingEdges, getNode } from './graph.js';
import { temperatureScale } from './temperature.js';
import type { SeededRNG } from './rng.js';

// ----------------------------------------------------------------
// Step 1 — Deterministic Scoring
// ----------------------------------------------------------------

/**
 * score(candidate) = edgeWeight × activationContrib × semanticAffinity
 *                    / (visitPenalty) × surpriseFactor
 */
function scoreCandidate(
  edge: CREEdge,
  target: CRENode,
  currentNode: CRENode,
  config: CREConfig
): RoutingCandidate {
  const edgeWeight = edge.weight;
  const activationContrib = target.activation * 0.5 + target.energy * 0.5;

  // Semantic affinity: linguistic surprise score of target acts as a pull
  const semanticAffinity = target.representations.linguistic.surpriseScore * 0.4 + 0.6;

  // Visit penalty: inverse of visit count — discourages ruts
  const visitPenalty = 1 / (1 + target.visitCount * config.visitPenaltyWeight);

  // Surprise factor: nodes not recently visited are more surprising
  const timeSinceVisit = Math.max(0, currentNode.lastVisitedAt - target.lastVisitedAt);
  const surpriseFactor = 1 + Math.min(1, timeSinceVisit * 0.1);

  const rawScore = edgeWeight * activationContrib * semanticAffinity * visitPenalty * surpriseFactor;

  // Will be temperature-adjusted after top-K selection
  const breakdown = {
    edgeWeight,
    activationContrib,
    semanticAffinity,
    visitPenalty,
    surpriseFactor,
    temperatureAdjusted: rawScore, // updated in step 3
  };

  return { node: target, edge, score: rawScore, breakdown };
}

// ----------------------------------------------------------------
// Step 2 — Top-K filtering
// ----------------------------------------------------------------

function topK(candidates: RoutingCandidate[], k: number): RoutingCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score).slice(0, k);
}

// ----------------------------------------------------------------
// Step 3 — Temperature-controlled stochastic selection
// ----------------------------------------------------------------

function stochasticSelect(
  candidates: RoutingCandidate[],
  temperature: number,
  rng: SeededRNG
): RoutingCandidate {
  if (candidates.length === 1) return candidates[0]!;
  const rawScores = candidates.map(c => c.score);
  const probs = temperatureScale(rawScores, temperature);
  // Update breakdown with temperature-adjusted probabilities
  candidates.forEach((c, i) => {
    c.breakdown.temperatureAdjusted = probs[i] ?? 0;
  });
  const selected = rng.weightedSelect(candidates, probs);
  return selected;
}

// ----------------------------------------------------------------
// Public routing entry point
// ----------------------------------------------------------------

export interface RouterResult {
  selected: RoutingCandidate;
  allCandidates: RoutingCandidate[];
  topKCandidates: RoutingCandidate[];
}

/**
 * From the current node, compute routing to the next node.
 * Returns null if no outgoing edges (dead-end / terminal).
 */
export function route(
  graph: CREGraph,
  runtimeState: CRERuntimeState,
  config: CREConfig,
  rng: SeededRNG
): RouterResult | null {
  const currentNode = getNode(graph, runtimeState.currentNodeId);
  const outgoing = getOutgoingEdges(graph, runtimeState.currentNodeId);

  if (outgoing.length === 0) return null;

  // Step 1: score all candidates
  const allCandidates: RoutingCandidate[] = outgoing.map(edge => {
    const target = getNode(graph, edge.to);
    return scoreCandidate(edge, target, currentNode, config);
  });

  // Step 2: top-K
  const topKCandidates = topK(allCandidates, config.topK);

  // Step 3: stochastic select
  const selected = stochasticSelect(topKCandidates, runtimeState.temperature, rng);

  return { selected, allCandidates, topKCandidates };
}
