// ============================================================
// CRE / CCG — Public API
// ============================================================

// Types
export type {
  CRENode,
  CREEdge,
  CREGraph,
  CREConfig,
  CREEvent,
  CREEventKind,
  CRERuntimeState,
  NodeRepresentations,
  SymbolicRepresentation,
  GeometricRepresentation,
  LinguisticRepresentation,
  ProceduralRepresentation,
  StateSnapshot,
  RoutingCandidate,
  RoutingScoreBreakdown,
} from './types.js';
export { DEFAULT_CONFIG } from './types.js';

// Structure layer
export { GraphBuilder, getOutgoingEdges, getNode } from './graph.js';

// State layer
export { applyActivation, injectActivation, snapshotNode, resetNode } from './state.js';

// Decay + stabilization
export { applyGlobalDecay, computeStability, computeEntropy, reinforce } from './decay.js';

// Routing layer
export { route } from './router.js';
export type { RouterResult } from './router.js';

// Temperature system
export { computeTemperature, temperatureScale } from './temperature.js';

// Interpretation layer
export { reRepresent } from './representation.js';

// Event system
export { createEvent, enqueueEvent, drainEvents } from './events.js';

// Logger
export { CRELogger } from './logger.js';

// Seeded RNG
export { SeededRNG } from './rng.js';

// Runtime
export { run, createRuntimeState } from './runtime.js';
export type { RunResult, CycleResult } from './runtime.js';
