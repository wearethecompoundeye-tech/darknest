// js/audio/ambience-manager.ts
// Ambient audio and visual mood manager – demon references removed.

import { suspicion, corruptionLevel, isGazeActive, gazePhase } from '../core/state-signals.js';
import { playSfx, startLoop, stopLoop } from './sfx.js';

let lastSuspicion = suspicion.value;
let lastCorruption = corruptionLevel.value;
let lastGazeActive = isGazeActive.value;

export function updateAmbience(): void {
  const currentSuspicion = suspicion.value;
  const currentCorruption = corruptionLevel.value;
  const gazeNow = isGazeActive.value;

  // Suspicion rise
  if (currentSuspicion > lastSuspicion + 5) {
    playSfx('suspicionRise');
    startLoop('suspicionRise');
  } else if (currentSuspicion <= lastSuspicion) {
    stopLoop('suspicionRise');
  }

  // Corruption deepens
  if (currentCorruption > 60 && lastCorruption <= 60) {
    startLoop('corruptionAmbience');
  } else if (currentCorruption <= 60 && lastCorruption > 60) {
    stopLoop('corruptionAmbience');
  }

  // Gaze warning / active
  if (gazeNow && !lastGazeActive) {
    startLoop('gazeWarningBg');
  } else if (!gazeNow && lastGazeActive) {
    stopLoop('gazeWarningBg');
  }

  lastSuspicion = currentSuspicion;
  lastCorruption = currentCorruption;
  lastGazeActive = gazeNow;
}

export function stopAllAmbience(): void {
  stopLoop('suspicionRise');
  stopLoop('corruptionAmbience');
  stopLoop('gazeWarningBg');
}