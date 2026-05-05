// js/systems/tutorial-listeners.ts
// Event-driven tutorial flag updates.
// These will eventually replace the in‑line flag sets.

import { logger } from '../core/logger.js';
import { gameBus } from '../core/eventBus.js';
import {
  GameEvents,
  type TithePaidPayload,
  type SummonVictoryPayload,
  type GazeSurvivedPayload,
  type CircleTracedPayload,
} from '../core/events.js';
import { tutorial } from '../core/state-signals.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type WhispMessagePayload } from '../core/events.js';

export function initTutorialListeners(): void {
  // Tithe paid → firstTithePaid
  gameBus.on<TithePaidPayload>(GameEvents.TITHE_PAID, () => {
    if (!tutorial.value.firstTithePaid) {
      tutorial.value = { ...tutorial.value, firstTithePaid: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, { text: 'Good, you paid the tithe. That noose was getting tight.', speaker: 'zelion' });
      logger.debug('[Tutorial Listener] firstTithePaid set');
    }
  });

  // Summon victory → firstSummon
  gameBus.on<SummonVictoryPayload>(GameEvents.SUMMON_VICTORY, () => {
    if (!tutorial.value.firstSummon) {
      tutorial.value = { ...tutorial.value, firstSummon: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, { text: 'Your first summon! That creature is ugly, but useful.', speaker: 'zelion' });
      logger.debug('[Tutorial Listener] firstSummon set');
    }
  });

  // Gaze survived → firstGazeSurvived & guidedFirstDayComplete
  gameBus.on<GazeSurvivedPayload>(GameEvents.GAZE_SURVIVED, () => {
    let changed = false;
    let t = { ...tutorial.value };
    if (!t.firstGazeSurvived) {
      t.firstGazeSurvived = true; changed = true;
    }
    if (!t.guidedFirstDayComplete) {
      t.guidedFirstDayComplete = true;
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, { text: 'You survived the Gaze! I knew you had it in you. Probably.', speaker: 'zelion' }); changed = true;
    }
    if (changed) {
      tutorial.value = t;
      logger.debug('[Tutorial Listener] Gaze tutorial flags set');
    }
  });

  // Circle traced → firstTrace
  gameBus.on<CircleTracedPayload>(GameEvents.CIRCLE_TRACED, (payload) => {
    if (!tutorial.value.firstTrace) {
      tutorial.value = { ...tutorial.value, firstTrace: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, { text: 'The circle is traced. The Orbex fragment in your head is humming.', speaker: 'zelion' });
      logger.debug('[Tutorial Listener] firstTrace set', payload.quality);
    }
  });
}
