// js/audio/ambience-manager.ts
import { suspicion, demonWrath, corruptionLevel } from '../core/state-signals.js';
import { fadeInLoop, fadeOutLoop, stopLoop } from './sfx.js';
let currentSuspicion = 0;
let currentWrath = 0;
let currentCorruption = 0;
export function updateAmbience() {
    // Suspicion layer
    if (suspicion.value > 50 && currentSuspicion <= 50) {
        fadeInLoop('suspicionRise', 2000);
        currentSuspicion = suspicion.value;
    }
    else if (suspicion.value <= 50 && currentSuspicion > 50) {
        fadeOutLoop('suspicionRise', 2000);
        currentSuspicion = suspicion.value;
    }
    // Demon Wrath layer
    if (demonWrath.value > 50 && currentWrath <= 50) {
        fadeInLoop('demonWrathAmbience', 2000);
        currentWrath = demonWrath.value;
    }
    else if (demonWrath.value <= 50 && currentWrath > 50) {
        fadeOutLoop('demonWrathAmbience', 2000);
        currentWrath = demonWrath.value;
    }
    // Corruption layer
    if (corruptionLevel.value > 50 && currentCorruption <= 50) {
        fadeInLoop('corruptionAmbience', 3000);
        currentCorruption = corruptionLevel.value;
    }
    else if (corruptionLevel.value <= 50 && currentCorruption > 50) {
        fadeOutLoop('corruptionAmbience', 3000);
        currentCorruption = corruptionLevel.value;
    }
}
export function stopAllAmbience() {
    stopLoop('suspicionRise');
    stopLoop('demonWrathAmbience');
    stopLoop('corruptionAmbience');
    currentSuspicion = 0;
    currentWrath = 0;
    currentCorruption = 0;
}
