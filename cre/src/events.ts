// ============================================================
// EVENT SYSTEM — lightweight synchronous event bus
// Events are queued and drained at the top of each tick.
// ============================================================

import type { CREEvent, CREEventKind, CRERuntimeState } from './types.js';

export function createEvent(
  kind: CREEventKind,
  options: { targetNodeId?: string; payload?: Record<string, unknown> } = {}
): CREEvent {
  return { kind, targetNodeId: options.targetNodeId, payload: options.payload, timestamp: Date.now() };
}

export function enqueueEvent(state: CRERuntimeState, event: CREEvent): void {
  state.eventQueue.push(event);
}

/** Drain and return all queued events (clears queue). */
export function drainEvents(state: CRERuntimeState): CREEvent[] {
  const events = [...state.eventQueue];
  state.eventQueue = [];
  return events;
}
