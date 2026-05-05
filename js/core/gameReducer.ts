// js/core/gameReducer.ts
// Pure state-transition reducer using discriminated unions.
// Prevents illegal phase changes and centralises transition validation.

export type GamePhase =
  | { status: 'idle' }
  | { status: 'summoning'; entityCardId: string }
  | { status: 'expedition'; pathId: string; turnsRemaining: number }
  | { status: 'gazeWarning'; intensity: number }
  | { status: 'gazeActive'; intensity: number }
  | { status: 'gameOver'; cause: string }
  | { status: 'victory' };

export type GameEvent =
  | { type: 'START_SUMMON'; entityCardId: string }
  | { type: 'SUMMON_COMPLETE' }
  | { type: 'START_EXPEDITION'; pathId: string; turns: number }
  | { type: 'EXPEDITION_COMPLETE' }
  | { type: 'GAZE_WARNING'; intensity: number }
  | { type: 'GAZE_START'; intensity: number }
  | { type: 'GAZE_SURVIVED' }
  | { type: 'GAZE_DEFEAT' }
  | { type: 'PLAYER_DIED'; cause: string }
  | { type: 'ESCAPE_ACHIEVED' };

/**
 * Pure reducer: (currentPhase, event) → newPhase.
 * Returns null if the transition is illegal.
 */
export function reducePhase(current: GamePhase, event: GameEvent): GamePhase | null {
  switch (current.status) {
    case 'idle':
      if (event.type === 'START_SUMMON')   return { status: 'summoning', entityCardId: event.entityCardId };
      if (event.type === 'START_EXPEDITION')return { status: 'expedition', pathId: event.pathId, turnsRemaining: event.turns };
      if (event.type === 'GAZE_WARNING')    return { status: 'gazeWarning', intensity: event.intensity };
      if (event.type === 'PLAYER_DIED')     return { status: 'gameOver', cause: event.cause };
      if (event.type === 'ESCAPE_ACHIEVED') return { status: 'victory' };
      break;

    case 'summoning':
      if (event.type === 'SUMMON_COMPLETE') return { status: 'idle' };
      if (event.type === 'PLAYER_DIED')     return { status: 'gameOver', cause: event.cause };
      break;

    case 'expedition':
      if (event.type === 'EXPEDITION_COMPLETE') return { status: 'idle' };
      if (event.type === 'PLAYER_DIED')         return { status: 'gameOver', cause: event.cause };
      break;

    case 'gazeWarning':
      if (event.type === 'GAZE_START')     return { status: 'gazeActive', intensity: current.intensity };
      if (event.type === 'PLAYER_DIED')    return { status: 'gameOver', cause: event.cause };
      break;

    case 'gazeActive':
      if (event.type === 'GAZE_SURVIVED')  return { status: 'idle' };
      if (event.type === 'GAZE_DEFEAT')    return { status: 'gameOver', cause: 'gaze' };
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
export const currentPhase = signal<GamePhase>({ status: 'idle' });

export function transition(event: GameEvent): boolean {
  const prev = currentPhase.value;
  const next = reducePhase(prev, event);
  if (next) {
    currentPhase.value = next;
    // Also emit on the event bus for cross‑domain subscribers.
    const bus = (window as any).gameBus;
    if (bus) bus.emit('phase:changed', { from: prev, to: next, event });
    return true;
  }
  return false;
}
