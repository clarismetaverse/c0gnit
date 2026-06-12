// ============================================================
// EXAMPLE: Cause → Effect → Context → Cause (cyclic)
//
// A (CAUSE) → B (EFFECT) → C (CONTEXT_SHIFT) → A (re-activated)
//
// Expected behavior:
//   Cycle 1: A → B → C → A
//   Cycle 2: A' → B2 → C → A''  (different routing via visit penalty)
//   Cycle 3: A'' → B3 → C2 → A'''
// ============================================================

import { GraphBuilder } from '../graph.js';
import { run } from '../runtime.js';
import { createEvent } from '../events.js';

// ----------------------------------------------------------------
// Build graph
// ----------------------------------------------------------------
const graph = new GraphBuilder()
  .addNode('A', 'CAUSE', { isAttractor: true, initialActivation: 1.0, initialEnergy: 1.0 })
  .addNode('B', 'EFFECT', { initialActivation: 0.2, initialEnergy: 0.9 })
  .addNode('B2', 'EFFECT_ALT', { initialActivation: 0.1, initialEnergy: 0.8 })
  .addNode('B3', 'EFFECT_DEEP', { initialActivation: 0.0, initialEnergy: 0.7 })
  .addNode('C', 'CONTEXT_SHIFT', { initialActivation: 0.1, initialEnergy: 0.9 })
  .addNode('C2', 'CONTEXT_SHIFT_EVOLVED', { initialActivation: 0.0, initialEnergy: 0.85 })
  // Main cyclic path
  .addEdge('A', 'B', 0.8, { label: 'causes' })
  .addEdge('A', 'B2', 0.6, { label: 'causes_alt' })
  .addEdge('A', 'B3', 0.4, { label: 'causes_deep' })
  .addEdge('B', 'C', 0.9, { label: 'shifts_context' })
  .addEdge('B2', 'C', 0.85, { label: 'shifts_context' })
  .addEdge('B3', 'C2', 0.8, { label: 'shifts_context_deep' })
  .addEdge('C', 'A', 0.7, { label: 'reactivates', transform: a => a * 0.9 })
  .addEdge('C2', 'A', 0.75, { label: 'reactivates_evolved', transform: a => a * 0.95 })
  .build();

// ----------------------------------------------------------------
// Initial events: perturb B2 to make it more competitive later
// ----------------------------------------------------------------
const initialEvents = [
  createEvent('perturb', { targetNodeId: 'B2' }),
];

// ----------------------------------------------------------------
// Run the cognitive runtime
// ----------------------------------------------------------------
console.log('\n' + '█'.repeat(60));
console.log('  CRE / CCG — Cause→Effect→Context Cycle Demo');
console.log('█'.repeat(60) + '\n');

const result = run(graph, 'A', initialEvents, {
  seed: 42,
  topK: 4,
  maxCycles: 5,
  maxStepsPerCycle: 15,
  decayFactor: 0.88,
  energyDecayFactor: 0.92,
  visitPenaltyWeight: 0.35,
  baseTemperature: 0.35,
  logLevel: 'trace',
});

// ----------------------------------------------------------------
// Summary output
// ----------------------------------------------------------------
console.log('\n' + '═'.repeat(60));
console.log('CYCLE SUMMARY');
console.log('═'.repeat(60));

for (const cycle of result.cycles) {
  console.log(`  Cycle ${cycle.cycleDepth}: ${cycle.path.join(' → ')}`);
}

console.log('\nGlobal path: ' + result.globalPath.join(' → '));
console.log('\nFinal node states:');

for (const [id, node] of graph.nodes.entries()) {
  console.log(
    `  ${id.padEnd(8)} | act=${node.activation.toFixed(3)} ` +
    `e=${node.energy.toFixed(3)} visits=${node.visitCount} ` +
    `sym="${node.representations.symbolic.predicate}" ` +
    `ling="${node.representations.linguistic.summary}"`
  );
}
