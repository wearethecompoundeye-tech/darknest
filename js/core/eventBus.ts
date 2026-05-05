// js/core/eventBus.ts
// Tiny typed event bus for inter-domain communication.

type Listener<Payload> = (payload: Payload) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<Payload>(event: string, fn: Listener<Payload>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }

  off<Payload>(event: string, fn: Listener<Payload>): void {
    this.listeners.get(event)?.delete(fn);
  }

  emit<Payload>(event: string, payload: Payload): void {
    this.listeners.get(event)?.forEach(fn => fn(payload));
    // wildcard listeners
    this.listeners.get('*')?.forEach(fn => fn({ event, payload }));
  }
}

export const gameBus = new EventBus();
