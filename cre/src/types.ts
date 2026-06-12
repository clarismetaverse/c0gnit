// ============================================================
// CRE / CCG — Core Type System
// Layer 1: STRUCTURE LAYER  (deterministic, no randomness)
// Layer 2: STATE LAYER       (dynamic per-node runtime state)
// Layer 3: ROUTING LAYER     (semi-stochastic traversal)
// Layer 4: INTERPRETATION LAYER (multi-view re-representation)
// ============================================================

// ----------------------------------------------------------------
// STRUCTURE LAYER
// ----------------------------------------------------------------

/** A directed, weighted edge between two nodes. */
export interface CREEdge {
  from: string;
  to: string;
  /** Base affinity weight [0, 1]. Higher = stronger pull. */
  weight: number;
  /** Optional transform applied to activation during traversal. */
  transform?: (activation: number) => number;
  /** Semantic tag describing the relationship kind. */
  label?: string;
}

/** Static graph blueprint — no randomness. */
export interface CREGraph {
  nodes: Map<string, CRENode>;
  edges: CREEdge[];
  /** Adjacency index: nodeId → outgoing edges (built on init). */
  adjacency: Map<string, CREEdge[]>;
}

// ----------------------------------------------------------------
// INTERPRETATION LAYER — multi-view representations
// ----------------------------------------------------------------

/** Symbolic view: structured formal description. */
export interface SymbolicRepresentation {
  predicate: string;
  args: string[];
  confidence: number;
}

/** Geometric view: position in a conceptual vector field. */
export interface GeometricRepresentation {
  /** Embedding vector (dimension flexible). */
  vector: number[];
  /** Magnitude of activation in this representation space. */
  magnitude: number;
  /** Phase in the cyclic activation field [0, 2π]. */
  phase: number;
}

/** Linguistic view: natural-language surface form. */
export interface LinguisticRepresentation {
  summary: string;
  /** Semantic drift from prior cycle — higher = more changed. */
  semanticDrift: number;
  /** How surprising this label is given the prior state. */
  surpriseScore: number;
}

/** Procedural view: action-rule encoding. */
export interface ProceduralRepresentation {
  trigger: string;
  actions: string[];
  priority: number;
}

export interface NodeRepresentations {
  symbolic: SymbolicRepresentation;
  geometric: GeometricRepresentation;
  linguistic: LinguisticRepresentation;
  procedural: ProceduralRepresentation;
}

// ----------------------------------------------------------------
// STATE LAYER — dynamic runtime per-node state
// ----------------------------------------------------------------

/** Snapshot of a node's state at a given cycle tick. */
export interface StateSnapshot {
  tick: number;
  activation: number;
  energy: number;
  visitCount: number;
  representations: NodeRepresentations;
  incomingEdgeWeight: number;
}

/** Runtime node — combines static identity with dynamic state. */
export interface CRENode {
  // --- identity (static) ---
  id: string;
  /** Human-readable label for debugging and linguistic view. */
  label: string;
  /** Attractor nodes resist decay and pull routing toward them. */
  isAttractor?: boolean;

  // --- state (dynamic) ---
  /** Current activation intensity [0, 1]. */
  activation: number;
  /** Energy budget — drives routing probability. Decays over time. */
  energy: number;
  /** Total number of times this node has been visited. */
  visitCount: number;
  /** Tick of last visit. */
  lastVisitedAt: number;

  // --- representations (computed each re-representation pass) ---
  representations: NodeRepresentations;

  /** Full history of state snapshots for replay / observability. */
  stateHistory: StateSnapshot[];
}

// ----------------------------------------------------------------
// ROUTING LAYER
// ----------------------------------------------------------------

/** Scored candidate for routing at a given step. */
export interface RoutingCandidate {
  node: CRENode;
  edge: CREEdge;
  score: number;
  breakdown: RoutingScoreBreakdown;
}

export interface RoutingScoreBreakdown {
  edgeWeight: number;
  activationContrib: number;
  semanticAffinity: number;
  visitPenalty: number;
  surpriseFactor: number;
  temperatureAdjusted: number;
}

// ----------------------------------------------------------------
// EVENT SYSTEM
// ----------------------------------------------------------------

export type CREEventKind =
  | 'activate'        // inject activation into a node
  | 'perturb'         // add noise to a node's energy
  | 'reset'           // reset a node to baseline
  | 'tick'            // advance one runtime cycle
  | 'temperature_set' // externally override temperature
  | 'custom';

export interface CREEvent {
  kind: CREEventKind;
  targetNodeId?: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

// ----------------------------------------------------------------
// RUNTIME CONFIG
// ----------------------------------------------------------------

export interface CREConfig {
  /** Seed for reproducible stochastic routing. */
  seed: number;
  /** Top-K candidates considered at each routing step. */
  topK: number;
  /** Per-cycle activation decay factor (0 < d < 1). */
  decayFactor: number;
  /** Energy decay factor per tick. */
  energyDecayFactor: number;
  /** Visit penalty weight in routing score. */
  visitPenaltyWeight: number;
  /** Maximum cycles before the runtime stops. 0 = infinite. */
  maxCycles: number;
  /** Maximum steps per cycle (prevents infinite loops). */
  maxStepsPerCycle: number;
  /** Base temperature (exploration vs exploitation). */
  baseTemperature: number;
  /** Log level: 'silent' | 'info' | 'debug' | 'trace' */
  logLevel: 'silent' | 'info' | 'debug' | 'trace';
}

export const DEFAULT_CONFIG: CREConfig = {
  seed: 42,
  topK: 5,
  decayFactor: 0.85,
  energyDecayFactor: 0.9,
  visitPenaltyWeight: 0.3,
  maxCycles: 10,
  maxStepsPerCycle: 20,
  baseTemperature: 0.4,
  logLevel: 'debug',
};

// ----------------------------------------------------------------
// RUNTIME STATE
// ----------------------------------------------------------------

/** Full mutable runtime state — one instance per CRE session. */
export interface CRERuntimeState {
  tick: number;
  cycleDepth: number;
  currentNodeId: string;
  temperature: number;
  entropy: number;
  stability: number;
  /** Full traversal path for current cycle. */
  currentPath: string[];
  /** Full path across ALL cycles for observability. */
  globalPath: string[];
  eventQueue: CREEvent[];
}
