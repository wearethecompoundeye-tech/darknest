// js/core/__tests__/eventBus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { gameBus } from '../eventBus.js';
describe('EventBus', () => {
    it('should call listener when event is emitted', () => {
        const listener = vi.fn();
        gameBus.on('test:event', listener);
        gameBus.emit('test:event', { data: 42 });
        expect(listener).toHaveBeenCalledWith({ data: 42 });
        gameBus.off('test:event', listener);
    });
    it('should not call listener after off', () => {
        const listener = vi.fn();
        gameBus.on('test:event2', listener);
        gameBus.off('test:event2', listener);
        gameBus.emit('test:event2', {});
        expect(listener).not.toHaveBeenCalled();
    });
    it('should call wildcard listener', () => {
        const listener = vi.fn();
        gameBus.on('*', listener);
        gameBus.emit('any:event', { x: 1 });
        expect(listener).toHaveBeenCalledWith({ event: 'any:event', payload: { x: 1 } });
        gameBus.off('*', listener);
    });
});
