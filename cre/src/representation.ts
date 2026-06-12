// ============================================================
// INTERPRETATION LAYER — Re-Representation Engine
// Deterministic: same input + same state → same representation.
// Four views: symbolic, geometric, linguistic, procedural.
// ============================================================

import type {
  CRENode,
  GeometricRepresentation,
  LinguisticRepresentation,
  NodeRepresentations,
  ProceduralRepresentation,
  SymbolicRepresentation,
} from './types.js';

// ----------------------------------------------------------------
// Symbolic View — formal predicate logic
// ----------------------------------------------------------------

function computeSymbolic(node: CRENode, cycleDepth: number): SymbolicRepresentation {
  const visitTag = node.visitCount > 1 ? `v${node.visitCount}` : '';
  const predicate = visitTag ? `${node.id.toUpperCase()}_${visitTag}` : node.id.toUpperCase();
  return {
    predicate,
    args: [node.label, `act=${node.activation.toFixed(3)}`, `e=${node.energy.toFixed(3)}`],
    confidence: Math.min(1, node.activation + node.energy * 0.5),
  };
}

// ----------------------------------------------------------------
// Geometric View — conceptual vector field
// ----------------------------------------------------------------

function computeGeometric(node: CRENode, cycleDepth: number): GeometricRepresentation {
  // Phase evolves with each revisit — cyclic semantics in field space
  const phase = (node.visitCount * Math.PI * 2) / 3 + cycleDepth * 0.1;
  const magnitude = node.activation * node.energy;
  // 3D embedding: [activation, energy_decay_over_visits, phase_component]
  const vector = [
    node.activation,
    node.energy / Math.max(1, node.visitCount),
    Math.sin(phase) * magnitude,
  ];
  return { vector, magnitude, phase: phase % (2 * Math.PI) };
}

// ----------------------------------------------------------------
// Linguistic View — natural language + semantic drift metrics
// ----------------------------------------------------------------

function computeLinguistic(
  node: CRENode,
  cycleDepth: number,
  prior: LinguisticRepresentation
): LinguisticRepresentation {
  const suffix = node.visitCount > 1 ? `'`.repeat(Math.min(node.visitCount - 1, 4)) : '';
  const intensityWord =
    node.activation > 0.8 ? 'strongly'
    : node.activation > 0.5 ? 'moderately'
    : node.activation > 0.2 ? 'weakly'
    : 'dormantly';

  const summary = `${node.label}${suffix} [${intensityWord} activated, cycle ${cycleDepth}]`;

  // Surprise = how much the new summary diverges from the prior
  const surpriseScore = prior.summary === summary ? 0
    : Math.min(1, node.activation * (1 + cycleDepth * 0.1));

  // Semantic drift measures how much the node has changed across revisits
  const semanticDrift = Math.abs(node.activation - (node.stateHistory.at(-2)?.activation ?? node.activation));

  return { summary, semanticDrift, surpriseScore };
}

// ----------------------------------------------------------------
// Procedural View — action-rule encoding
// ----------------------------------------------------------------

function computeProcedural(node: CRENode, cycleDepth: number): ProceduralRepresentation {
  const revisitVariant = node.visitCount > 1 ? `_r${node.visitCount}` : '';
  const trigger = `on_${node.id}${revisitVariant}_cycle${cycleDepth}`;
  const actions: string[] = [`activate(${node.id})`];

  if (node.isAttractor) actions.push(`stabilize(${node.id})`);
  if (node.visitCount > 2) actions.push(`reinforce(${node.id})`);
  if (node.energy < 0.3) actions.push(`recharge(${node.id})`);

  return {
    trigger,
    actions,
    priority: Math.round(node.activation * 10 + (node.isAttractor ? 5 : 0)),
  };
}

// ----------------------------------------------------------------
// Main re-representation entry point
// ----------------------------------------------------------------

/**
 * Recompute all four representations for a node.
 * Deterministic given the same node state + cycleDepth.
 */
export function reRepresent(node: CRENode, cycleDepth: number): NodeRepresentations {
  const symbolic = computeSymbolic(node, cycleDepth);
  const geometric = computeGeometric(node, cycleDepth);
  const linguistic = computeLinguistic(node, cycleDepth, node.representations.linguistic);
  const procedural = computeProcedural(node, cycleDepth);
  const reps: NodeRepresentations = { symbolic, geometric, linguistic, procedural };
  node.representations = reps;
  return reps;
}
