// js/systems/gaze-resonance-engine.ts – Ward resonance, casting, reinforcing, fracture mechanics
import { signal, batch } from '@preact/signals-core';
import { gazeWardPattern } from './gaze-event.js';
import { ingredients, isGazeActive, gazeIntensity, will, maxWill, gazePhase } from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx } from '../audio/sfx.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents } from '../core/events.js';

export const wardResonance = signal<number[]>([0, 0, 0]);
export const wardRotation = signal<number[]>([0, 0, 0]);
export const wardFracture = signal<number[]>([0, 0, 0]);

export const WARD_TYPES: Record<number, { name: string; color: string; trace: string; sound: string }> = {
  1: { name: 'Obliteration', color: '#ff4444', trace: 'dashed', sound: 'wardObliteration' },
  2: { name: 'Subjugation',   color: '#a0d07a', trace: 'solid',  sound: 'wardSubjugation' },
  3: { name: 'Sublimation',   color: '#88ccff', trace: 'zigzag', sound: 'wardSublimation' },
};

export function castWard(): boolean {
  if (!isGazeActive.value || gazePhase.value !== 'active') return false;
  const activeWards = gazeWardPattern.value.filter(w => w > 0).length;
  if (activeWards >= 3) {
    addLog('Ward slots are full!', true);
    return false;
  }
  if (ingredients.value.demonIchor < 2) {
    addLog('Need 2 Ichor to cast a ward.', true);
    return false;
  }
  ingredients.value.demonIchor -= 2;
  const emptyIndex = gazeWardPattern.value.findIndex(w => w === 0);
  if (emptyIndex === -1) return false;
  const wardType = (gazeWardPattern.value[0] || 1) % 3 + 1;
  const wardTypeData = WARD_TYPES[wardType];
  batch(() => {
    const pattern = [...gazeWardPattern.value];
    pattern[emptyIndex] = wardType;
    gazeWardPattern.value = pattern;
    wardResonance.value[emptyIndex] = 100;
    wardRotation.value[emptyIndex] = 0;
    wardFracture.value[emptyIndex] = 0;
    gameBus.emit(GameEvents.WARD_CAST, { index: emptyIndex, type: wardType, rotation: 0 });
  });
  addLog(`Tracing ${wardTypeData.name} ward...`, false, 'orbex');
  playSfx(wardTypeData.sound);
  return true;
}

export function reinforceWard(slotIndex: number): boolean {
  if (!isGazeActive.value || gazePhase.value !== 'active') return false;
  if (wardFracture.value[slotIndex] > 0.3) return false;
  const current = gazeWardPattern.value[slotIndex];
  if (!current) return false;
  if (wardResonance.value[slotIndex] >= 100) {
    addLog('Ward is at full resonance!', true);
    return false;
  }
  const cost = Math.floor((100 - wardResonance.value[slotIndex]) / 10);
  if (ingredients.value.demonIchor < cost) {
    addLog(`Need ${cost} Ichor to reinforce.`, true);
    return false;
  }
  batch(() => {
    ingredients.value.demonIchor -= cost;
    wardResonance.value[slotIndex] = 100;
  });
  const wardEl = document.querySelector(`[data-ward-index="${slotIndex}"]`);
  if (wardEl) {
    (wardEl as HTMLElement).style.transform = 'scale(1.2) rotate(360deg)';
    setTimeout(() => {
      if (wardEl) (wardEl as HTMLElement).style.transform = '';
    }, 400);
  }
  addLog(`Ward reinforced!`, false, 'orbex');
  return true;
}

export function updateWardResonance(dt: number): void {
  if (!isGazeActive.value) return;
  const baseDrain = 5 + (gazeIntensity.value * 0.2);
  const activeCount = gazeWardPattern.value.filter(w => w > 0).length;
  const drainPerSlot = activeCount > 0 ? baseDrain / activeCount : baseDrain;
  gazeWardPattern.value.forEach((wardType, i) => {
    if (!wardType) return;
    wardResonance.value[i] = Math.max(0, wardResonance.value[i] - (drainPerSlot * dt));
    wardRotation.value[i] = (wardRotation.value[i] + (1 + (100 - wardResonance.value[i]) / 20) * 10) % 360;
    if (wardResonance.value[i] < 20 && Math.random() < 0.05 * dt) {
      wardFracture.value[i] = Math.min(1, wardFracture.value[i] + 0.05 * dt);
    }
    if (wardFracture.value[i] >= 1) {
      wardFracture.value[i] = 0;
      const pattern = [...gazeWardPattern.value];
      pattern[i] = 0;
      gazeWardPattern.value = pattern;
      wardResonance.value[i] = 0;
      wardRotation.value[i] = 0;
      const wardEl = document.querySelector(`[data-ward-index="${i}"]`);
      if (wardEl) {
        wardEl.classList.add('ward-fracture');
        playSfx('wardShatter');
        document.body.style.transform = `translate(${Math.random()*10-5}px, ${Math.random()*10-5}px)`;
        setTimeout(() => document.body.style.transform = '', 300);
      }
    }
  });
}

// Zilion stress response
will.subscribe(val => {
  if (!isGazeActive.value) return;
  const stress = 1 - val / maxWill.value;
  if (stress > 0.7) {
    gameBus.emit(GameEvents.ZILION_STRESS, { level: stress });
  }
  if (stress > 0.3) {
    gazeWardPattern.value.forEach((_, i) => {
      if (gazeWardPattern.value[i]) {
        wardResonance.value[i] = Math.min(100, wardResonance.value[i] + 0.5);
      }
    });
  }
});

// Zilion panic when wards failing
wardResonance.subscribe(val => {
  if (!isGazeActive.value) return;
  const lowResonance = val.filter(r => r < 30).length;
  if (lowResonance >= 2) {
    gameBus.emit(GameEvents.ZILION_PANIC, { panicLevel: lowResonance / 3 });
  }
});