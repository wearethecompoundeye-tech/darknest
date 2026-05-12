// js/ui/gaze-ui-enhanced.ts – Enhanced Gaze UI that combines base UI, stress overlay, whisp dynamics, resonance
import { showGazeUI as baseShowGazeUI, updateGazeUI as baseUpdateGazeUI, hideGazeUI as baseHideGazeUI } from './gaze-ui.js';
import { initStressOverlay, updateStressVisuals, clearStressOverlay } from './gaze-stress-overlay.js';
// Zilion combat dynamics now handled automatically by the new zone‑docking system (whisp-chat.ts)
import { reinforceWard, updateWardResonance } from '../systems/gaze-resonance-engine.js';
import { will, maxWill, isGazeActive, gazeIntensity } from '../core/state-signals.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents } from '../core/events.js';

export function showGazeUI(phase: 'warning' | 'active'): void {
  initStressOverlay();
  // Zilion is already initialized by game.ts; the new zone system will automatically move him to 'edge-warning' when gaze is active.

  baseShowGazeUI(phase);

  if (phase === 'active') {
    document.querySelectorAll('.reinforce-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = parseInt(btn.getAttribute('data-slot') || '-1');
        if (slot >= 0) reinforceWard(slot);
      });
    });

    let lastTime = performance.now();
    const loop = (now: number) => {
      if (!isGazeActive.value) return;
      const dt = (now - lastTime) / 1000;
      updateWardResonance(dt);
      updateStressVisuals(calculateStressLevel());
      lastTime = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

export function updateGazeUI(data: {
  willPercent?: number;
  healthPercent?: number;
  timerSeconds?: number;
  drainRate?: number;
  stressLevel?: number;
}): void {
  if (data.stressLevel !== undefined) {
    updateStressVisuals(data.stressLevel);
    gameBus.emit(GameEvents.GAZE_UPDATE, { stressLevel: data.stressLevel });
    const zilionEl = document.getElementById('zelion-avatar');
    if (zilionEl) {
      zilionEl.classList.toggle('zelion-alert', data.stressLevel > 70);
    }
  }
  baseUpdateGazeUI(data);
}

export function hideGazeUI(): void {
  baseHideGazeUI();
  clearStressOverlay();
  document.querySelectorAll('.reinforce-btn').forEach(btn => btn.removeEventListener('click', () => {}));
}

function calculateStressLevel(): number {
  return Math.min(100, ((1 - will.value / maxWill.value) * 80) + (gazeIntensity.value * 2));
}