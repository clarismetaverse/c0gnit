// ============================================================
// DEBUG / OBSERVABILITY LOGGER
// Structured, leveled logging for full runtime introspection.
// ============================================================

import type { CREConfig, CRENode, CRERuntimeState, RoutingCandidate } from './types.js';

type LogLevel = 'silent' | 'info' | 'debug' | 'trace';

const LEVELS: Record<LogLevel, number> = { silent: 0, info: 1, debug: 2, trace: 3 };

function shouldLog(configured: LogLevel, required: LogLevel): boolean {
  return LEVELS[configured] >= LEVELS[required];
}

function fmt(n: number, decimals = 3): string {
  return n.toFixed(decimals);
}

export class CRELogger {
  private lines: string[] = [];

  constructor(private config: CREConfig) {}

  private emit(level: LogLevel, msg: string): void {
    if (!shouldLog(this.config.logLevel, level)) return;
    const prefix = `[${level.toUpperCase().padEnd(5)}]`;
    const line = `${prefix} ${msg}`;
    this.lines.push(line);
    console.log(line);
  }

  cycleStart(cycleDepth: number, startNodeId: string, temperature: number): void {
    this.emit('info', `\n${'═'.repeat(60)}`);
    this.emit('info', `CYCLE ${cycleDepth} START → node="${startNodeId}" temp=${fmt(temperature)}`);
    this.emit('info', `${'═'.repeat(60)}`);
  }

  cycleEnd(cycleDepth: number, path: string[]): void {
    this.emit('info', `CYCLE ${cycleDepth} END   → path: ${path.join(' → ')}`);
  }

  step(tick: number, fromId: string, toId: string, temperature: number): void {
    this.emit('debug', `  tick=${tick}  ${fromId} ──→ ${toId}  temp=${fmt(temperature)}`);
  }

  topKCandidates(candidates: RoutingCandidate[], temperature: number): void {
    if (!shouldLog(this.config.logLevel, 'trace')) return;
    this.emit('trace', `  top-K candidates (temp=${fmt(temperature)}):`);
    candidates.forEach((c, i) => {
      const b = c.breakdown;
      this.emit(
        'trace',
        `    [${i + 1}] "${c.node.id}" score=${fmt(c.score)} ` +
          `(w=${fmt(b.edgeWeight)} act=${fmt(b.activationContrib)} ` +
          `aff=${fmt(b.semanticAffinity)} pen=${fmt(b.visitPenalty)} ` +
          `surp=${fmt(b.surpriseFactor)} tAdj=${fmt(b.temperatureAdjusted)})`
      );
    });
  }

  nodeActivation(node: CRENode, tick: number): void {
    this.emit(
      'debug',
      `  node "${node.id}" → act=${fmt(node.activation)} e=${fmt(node.energy)} ` +
        `visits=${node.visitCount} drift=${fmt(node.representations.linguistic.semanticDrift)} ` +
        `surprise=${fmt(node.representations.linguistic.surpriseScore)}`
    );
  }

  reRepresent(node: CRENode, cycleDepth: number): void {
    this.emit(
      'trace',
      `  re-repr "${node.id}" [cycle ${cycleDepth}] → ` +
        `sym="${node.representations.symbolic.predicate}" ` +
        `ling="${node.representations.linguistic.summary}" ` +
        `phase=${fmt(node.representations.geometric.phase)}`
    );
  }

  systemState(state: CRERuntimeState): void {
    this.emit(
      'debug',
      `  [system] tick=${state.tick} temp=${fmt(state.temperature)} ` +
        `entropy=${fmt(state.entropy)} stability=${fmt(state.stability)}`
    );
  }

  cycleReEntry(nodeId: string, cycleDepth: number): void {
    this.emit('info', `  ↻ CYCLE RE-ENTRY: "${nodeId}" at cycle ${cycleDepth}`);
  }

  deadEnd(nodeId: string): void {
    this.emit('info', `  ✗ DEAD END at "${nodeId}" — no outgoing edges, cycle ends.`);
  }

  eventProcessed(kind: string, targetNodeId?: string): void {
    this.emit('trace', `  [event] ${kind}${targetNodeId ? ` → "${targetNodeId}"` : ''}`);
  }

  /** Return full log transcript. */
  transcript(): string {
    return this.lines.join('\n');
  }
}
