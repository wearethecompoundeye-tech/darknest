// js/core/gameReducer.ts
// Pure state-transition reducer using discriminated unions.
// Prevents illegal phase changes and centralises transition validation.
/**
 * Pure reducer: (currentPhase, event) → newPhase.
 * Returns null if the transition is illegal.
 */
export function reducePhase(current, event) {
    switch (current.status) {
        case 'idle':
            if (event.type === 'START_SUMMON')
                return { status: 'summoning', entityCardId: event.entityCardId };
            if (event.type === 'START_EXPEDITION')
                return { status: 'expedition', pathId: event.pathId, turnsRemaining: event.turns };
            if (event.type === 'GAZE_WARNING')
                return { status: 'gazeWarning', intensity: event.intensity };
            if (event.type === 'PLAYER_DIED')
                return { status: 'gameOver', cause: event.cause };
            if (event.type === 'ESCAPE_ACHIEVED')
                return { status: 'victory' };
            break;
        case 'summoning':
            if (event.type === 'SUMMON_COMPLETE')
                return { status: 'idle' };
            if (event.type === 'PLAYER_DIED')
                return { status: 'gameOver', cause: event.cause };
            break;
        case 'expedition':
            if (event.type === 'EXPEDITION_COMPLETE')
                return { status: 'idle' };
            if (event.type === 'PLAYER_DIED')
                return { status: 'gameOver', cause: event.cause };
            break;
        case 'gazeWarning':
            if (event.type === 'GAZE_START')
                return { status: 'gazeActive', intensity: current.intensity };
            if (event.type === 'PLAYER_DIED')
                return { status: 'gameOver', cause: event.cause };
            break;
        case 'gazeActive':
            if (event.type === 'GAZE_SURVIVED')
                return { status: 'idle' };
            if (event.type === 'GAZE_DEFEAT')
                return { status: 'gameOver', cause: 'gaze' };
            break;
        case 'gameOver':
        case 'victory':
            // Terminal states – no transitions allowed.
            break;
    }
    console.warn(`[GameReducer] Illegal transition: ${current.status} → ${event.type}`);
    return null;
}
// Reactive phase signal (to be imported by UI / systems).
import { signal } from '@preact/signals-core';
export const currentPhase = signal({ status: 'idle' });
export function transition(event) {
    const next = reducePhase(currentPhase.value, event);
    if (next) {
        currentPhase.value = next;
        // Also emit on the event bus for cross‑domain subscribers.
        const bus = window.gameBus;
        if (bus)
            bus.emit('phase:changed', { from: currentPhase.value, to: next, event });
        return true;
    }
    return false;
}
