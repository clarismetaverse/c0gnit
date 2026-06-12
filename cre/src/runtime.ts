// ============================================================
// CRE CORE RUNTIME — main cognitive loop
//
// Loop:
//   EVENTS → STATE UPDATE → ROUTING → RE-REPRESENTATION
//   → DECAY + STABILIZATION → NEW EVENTS → REPEAT
// ============================================================

import type {
  CREConfig,
  CREEvent,
  CREGraph,
  CRERuntimeState,
} from './types.js';
import { DEFAULT_CONFIG } from './types.js';
import { getNode } from './graph.js';
import { applyActivation, injectActivation, snapshotNode } from './state.js';
import { applyGlobalDecay, computeEntropy, computeStability, reinforce } from './decay.js';
import { route } from './router.js';
import { reRepresent } from './representation.js';
import { computeTemperature } from './temperature.js';
import { drainEvents } from './events.js';
import { CRELogger } from './logger.js';
import { SeededRNG } from './rng.js';

// ----------------------------------------------------------------
// Runtime factory
// ----------------------------------------------------------------

export function createRuntimeState(startNodeId: string): CRERuntimeState {
  return {
    tick: 0,
    cycleDepth: 0,
    currentNodeId: startNodeId,
    temperature: 0.4,
    entropy: 0,
    stability: 1,
    currentPath: [],
    globalPath: [],
    eventQueue: [],
  };
}

// ----------------------------------------------------------------
// Event processor (deterministic)
// ----------------------------------------------------------------

function processEvents(
  events: CREEvent[],
  graph: CREGraph,
  runtimeState: CRERuntimeState,
  logger: CRELogger
): void {
  for (const event of events) {
    logger.eventProcessed(event.kind, event.targetNodeId);
    switch (event.kind) {
      case 'activate':
        if (event.targetNodeId) {
          const amount = (event.payload?.['amount'] as number | undefined) ?? 0.5;
          injectActivation(graph, event.targetNodeId, amount, runtimeState.tick);
        }
        break;
      case 'perturb':
        if (event.targetNodeId) {
          const node = graph.nodes.get(event.targetNodeId);
          if (node) {
            node.energy = Math.min(1, node.energy + 0.2);
          }
        }
        break;
      case 'reset':
        if (event.targetNodeId) {
          const node = graph.nodes.get(event.targetNodeId);
          if (node) {
            node.activation = 0;
            node.energy = 1.0;
          }
        }
        break;
      case 'temperature_set':
        if (event.payload?.['value'] !== undefined) {
          runtimeState.temperature = event.payload['value'] as number;
        }
        break;
      case 'tick':
      case 'custom':
        break;
    }
  }
}

// ----------------------------------------------------------------
// Single step within a cycle
// ----------------------------------------------------------------

function executeStep(
  graph: CREGraph,
  runtimeState: CRERuntimeState,
  config: CREConfig,
  rng: SeededRNG,
  logger: CRELogger
): boolean {
  const currentNode = getNode(graph, runtimeState.currentNodeId);

  // Route to next node
  const result = route(graph, runtimeState, config, rng);
  if (!result) {
    logger.deadEnd(runtimeState.currentNodeId);
    return false; // cycle ends
  }

  const { selected, topKCandidates } = result;
  logger.topKCandidates(topKCandidates, runtimeState.temperature);

  // Apply edge transform if defined
  const incomingActivation = selected.edge.transform
    ? selected.edge.transform(currentNode.activation)
    : currentNode.activation * selected.edge.weight;

  // Snapshot before mutation
  snapshotNode(selected.node, runtimeState.tick, selected.edge.weight);

  // STATE UPDATE: activate target node
  applyActivation(selected.node, incomingActivation, runtimeState.tick);

  // Reinforce source node for participating in a useful path
  reinforce(currentNode, selected.edge.weight);

  // RE-REPRESENTATION
  reRepresent(selected.node, runtimeState.cycleDepth);

  logger.step(runtimeState.tick, runtimeState.currentNodeId, selected.node.id, runtimeState.temperature);
  logger.nodeActivation(selected.node, runtimeState.tick);
  logger.reRepresent(selected.node, runtimeState.cycleDepth);

  // Advance runtime state
  runtimeState.tick += 1;
  runtimeState.currentPath.push(selected.node.id);
  runtimeState.globalPath.push(selected.node.id);
  runtimeState.currentNodeId = selected.node.id;

  return true;
}

// ----------------------------------------------------------------
// Full runtime loop
// ----------------------------------------------------------------

export interface CycleResult {
  cycleDepth: number;
  path: string[];
  startNodeId: string;
}

export interface RunResult {
  cycles: CycleResult[];
  globalPath: string[];
  finalState: CRERuntimeState;
  transcript: string;
}

export function run(
  graph: CREGraph,
  startNodeId: string,
  initialEvents: CREEvent[] = [],
  partialConfig: Partial<CREConfig> = {}
): RunResult {
  const config: CREConfig = { ...DEFAULT_CONFIG, ...partialConfig };
  const runtimeState = createRuntimeState(startNodeId);
  runtimeState.eventQueue.push(...initialEvents);

  const logger = new CRELogger(config);
  const rng = new SeededRNG(config.seed);
  const cycles: CycleResult[] = [];
  const nodeCount = graph.nodes.size;
  const maxEntropy = nodeCount > 1 ? Math.log2(nodeCount) : 1;

  // Inject initial activation into start node
  injectActivation(graph, startNodeId, 1.0, 0);
  reRepresent(getNode(graph, startNodeId), 0);

  for (let c = 0; c < config.maxCycles; c++) {
    runtimeState.cycleDepth = c;
    runtimeState.currentPath = [startNodeId];
    runtimeState.currentNodeId = startNodeId;

    // Update temperature at cycle start
    runtimeState.stability = computeStability(graph);
    runtimeState.entropy = computeEntropy(graph);
    runtimeState.temperature = computeTemperature(
      { cycleDepth: c, entropy: runtimeState.entropy, stability: runtimeState.stability, maxEntropy },
      config
    );

    logger.cycleStart(c + 1, startNodeId, runtimeState.temperature);
    logger.systemState(runtimeState);

    // Process queued events
    const events = drainEvents(runtimeState);
    processEvents(events, graph, runtimeState, logger);

    // Fork a per-cycle RNG to keep cycles independent
    const cycleRng = rng.fork(c * 1000 + config.seed);

    let steps = 0;
    let continueStep = true;
    let cycleComplete = false;

    while (continueStep && steps < config.maxStepsPerCycle) {
      continueStep = executeStep(graph, runtimeState, config, cycleRng, logger);
      steps++;

      // Detect cycle re-entry (current node == start node again)
      if (runtimeState.currentNodeId === startNodeId && steps > 1) {
        logger.cycleReEntry(startNodeId, c + 1);
        cycleComplete = true;
        break;
      }
    }

    const cycleResult: CycleResult = {
      cycleDepth: c + 1,
      path: [...runtimeState.currentPath],
      startNodeId,
    };
    cycles.push(cycleResult);
    logger.cycleEnd(c + 1, cycleResult.path);

    // DECAY + STABILIZATION after each cycle
    applyGlobalDecay(graph, config);

    // Re-inject start node for next cycle
    if (c < config.maxCycles - 1) {
      injectActivation(graph, startNodeId, 0.8, runtimeState.tick);
      reRepresent(getNode(graph, startNodeId), c + 1);
    }
  }

  return {
    cycles,
    globalPath: runtimeState.globalPath,
    finalState: runtimeState,
    transcript: logger.transcript(),
  };
}
