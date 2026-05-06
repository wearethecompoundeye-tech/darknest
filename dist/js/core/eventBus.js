// js/core/eventBus.ts
// Tiny typed event bus for inter-domain communication.
class EventBus {
    listeners = new Map();
    on(event, fn) {
        if (!this.listeners.has(event))
            this.listeners.set(event, new Set());
        this.listeners.get(event).add(fn);
    }
    off(event, fn) {
        this.listeners.get(event)?.delete(fn);
    }
    emit(event, payload) {
        this.listeners.get(event)?.forEach(fn => fn(payload));
        // wildcard listeners
        this.listeners.get('*')?.forEach(fn => fn({ event, payload }));
    }
}
export const gameBus = new EventBus();
