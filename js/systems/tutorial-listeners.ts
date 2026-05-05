// js/systems/tutorial-listeners.ts
// Event-driven tutorial flag updates – final unified version.
// Duplicate imports removed. Whisp (Zilion) commentary dispatched on first events.

import { gameBus } from '../core/eventBus.js';
import {
  GameEvents,
  type TithePaidPayload,
  type SummonVictoryPayload,
  type GazeSurvivedPayload,
  type CircleTracedPayload,
  type WhispMessagePayload,
} from '../core/events.js';
import { tutorial } from '../core/state-signals.js';

export function initTutorialListeners(): void {
  // Tithe paid → firstTithePaid
  gameBus.on<TithePaidPayload>(GameEvents.TITHE_PAID, () => {
    if (!tutorial.value.firstTithePaid) {
      tutorial.value = { ...tutorial.value, firstTithePaid: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, {
        text: 'Good, you paid the tithe. That noose was getting tight.',
        speaker: 'zelion'
      });
    }
  });

  // Summon victory → firstSummon
  gameBus.on<SummonVictoryPayload>(GameEvents.SUMMON_VICTORY, () => {
    if (!tutorial.value.firstSummon) {
      tutorial.value = { ...tutorial.value, firstSummon: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, {
        text: 'Your first summon! That creature is ugly, but useful.',
        speaker: 'zelion'
      });
    }
  });

  // Gaze survived → firstGazeSurvived & guidedFirstDayComplete
  gameBus.on<GazeSurvivedPayload>(GameEvents.GAZE_SURVIVED, () => {
    let changed = false;
    const t = { ...tutorial.value };
    if (!t.firstGazeSurvived) {
      t.firstGazeSurvived = true;
      changed = true;
    }
    if (!t.guidedFirstDayComplete) {
      t.guidedFirstDayComplete = true;
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, {
        text: 'You survived the Gaze! I knew you had it in you. Probably.',
        speaker: 'zelion'
      });
      changed = true;
    }
    if (changed) {
      tutorial.value = t;
    }
  });

  // Circle traced → firstTrace
  gameBus.on<CircleTracedPayload>(GameEvents.CIRCLE_TRACED, (payload) => {
    if (!tutorial.value.firstTrace) {
      tutorial.value = { ...tutorial.value, firstTrace: true };
      gameBus.emit<WhispMessagePayload>(GameEvents.WHISP_MESSAGE, {
        text: 'The circle is traced. The Orbex fragment in your head is humming.',
        speaker: 'zelion'
      });
    }
  });
}