// js/core/__tests__/gameReducer.test.ts
import { describe, it, expect } from 'vitest';
import { reducePhase } from '../gameReducer.js';
const idle = { status: 'idle' };
const summoning = { status: 'summoning', entityCardId: 'test_card' };
const expedition = { status: 'expedition', pathId: 'Warded', turnsRemaining: 5 };
describe('Game Reducer', () => {
    it('allows START_SUMMON from idle', () => {
        const event = { type: 'START_SUMMON', entityCardId: 'test_card' };
        const next = reducePhase(idle, event);
        expect(next).not.toBeNull();
        expect(next.status).toBe('summoning');
    });
    it('allows SUMMON_COMPLETE from summoning', () => {
        const event = { type: 'SUMMON_COMPLETE' };
        const next = reducePhase(summoning, event);
        expect(next).not.toBeNull();
        expect(next.status).toBe('idle');
    });
    it('blocks START_SUMMON during summoning (illegal transition)', () => {
        const event = { type: 'START_SUMMON', entityCardId: 'another' };
        const next = reducePhase(summoning, event);
        expect(next).toBeNull();
    });
    it('blocks START_EXPEDITION during summoning', () => {
        const event = { type: 'START_EXPEDITION', pathId: 'Warded', turns: 4 };
        const next = reducePhase(summoning, event);
        expect(next).toBeNull();
    });
    it('allows EXPEDITION_COMPLETE from expedition', () => {
        const event = { type: 'EXPEDITION_COMPLETE' };
        const next = reducePhase(expedition, event);
        expect(next).not.toBeNull();
        expect(next.status).toBe('idle');
    });
    it('blocks GAZE_START from idle (only gazeWarning → gazeActive allowed)', () => {
        const event = { type: 'GAZE_START', intensity: 50 };
        const next = reducePhase(idle, event);
        expect(next).toBeNull();
    });
    it('allows GAZE_WARNING then GAZE_START', () => {
        const warn = { type: 'GAZE_WARNING', intensity: 60 };
        const afterWarn = reducePhase(idle, warn);
        expect(afterWarn.status).toBe('gazeWarning');
        const start = { type: 'GAZE_START', intensity: 60 };
        const afterStart = reducePhase(afterWarn, start);
        expect(afterStart.status).toBe('gazeActive');
    });
    it('gameOver and victory are terminal states', () => {
        const over = { status: 'gameOver', cause: 'gaze' };
        const victory = { status: 'victory' };
        const event = { type: 'START_SUMMON', entityCardId: 'test' };
        expect(reducePhase(over, event)).toBeNull();
        expect(reducePhase(victory, event)).toBeNull();
    });
});
