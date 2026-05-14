// js/core/game.ts – Stable base with all minigames, summon, rune study, rune etch, circle trace, and maze entrance
import { effect } from '@preact/signals-core';
import {
  state, health, will, maxWill, ingredients, crafted,
  timerSeconds, loadSaveData, initSaveSystem,
  initializeState, resetDailyItemUsage, advanceAction, reduceQuota,
  kalgothsNoose, circlePower, circleMastery,
  orbexFragments, ownedCards, equippedEntitySlots,
  familiar, discoveries, tutorial, isGazeActive, gazePhase,
  dailyConsumableSlots, getActiveEntity,
  getStorage, setCurrentSlot, deleteSlot, autoSave,
  updateState, notifyStateChange,
  addLog
} from './state-signals.js';
import { ModalManager } from '../ui/modal-manager.js';
import { initAudio, toggleSfx, toggleMusic, updateVolumes } from '../audio/sfx.js';
import { setupUIEffects, triggerScreenPulse, updateUI, initOrbitAnimation } from '../ui/ui-renderer.js';
import { gameBus } from './eventBus.js';
import { GameEvents } from './events.js';
import { transition, currentPhase } from './gameReducer.js';
import { startGazeWarning } from '../systems/gaze-event.js';
import { openGrimoire } from '../ui/grimoire.js';
import { openSatchel } from '../ui/satchel.js';
import { openTome } from '../ui/tome.js';
import { initWhispChat, destroyWhispChat } from '../ui/whisp-chat.js';
import { summonEntity } from '../systems/summoning.js';
import { initPlugins, destroyPlugins } from '../plugins/plugin-interface.js';
import { applyWardNooseReduction } from '../systems/familiar-manager.js';
import { initCircleTracing } from '../minigames/circle-trace.js';
import { el } from '../core/dom-helper.js';
import { initRitualMeter } from '../ui/ritual-meter.js';

export class Game {
  private gameLoop: number | null = null;

  async start(): Promise<void> {
    initSaveSystem();
    initAudio();
    setupUIEffects();
    updateUI();
    initWhispChat();
    initPlugins();
    (window as any).modalManager = new ModalManager();
    initRitualMeter();
    initOrbitAnimation();

    // ── Original UI bindings (all working) ─────────────
    document.getElementById('satchelIcon')?.addEventListener('click', openSatchel);
    document.getElementById('tomeIcon')?.addEventListener('click', openTome);
    document.getElementById('settingsIcon')?.addEventListener('click', () => {
      const modal = document.getElementById('settingsModal');
      if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '10000';
      }
      import('../ui/settings-panel.js').then(m => m.renderSettingsContent());
    });
    document.getElementById('captureJar')?.addEventListener('click', openGrimoire);

    // Circle trace (canvas click)
    const circleCanvas = document.getElementById('circleCanvas');
    if (circleCanvas) circleCanvas.addEventListener('click', () => initCircleTracing());

    // Summon button (the large "Invoke" button)
    const summonBtn = document.getElementById('invokeBtn');
    if (summonBtn) summonBtn.addEventListener('click', () => summonEntity());

    // Crafting tiles (powder, restorative, phial/potion)
    document.getElementById('craftPowderBtn')?.addEventListener('click', () => {
      import('../systems/crafting.js').then(m => m.craftPowder());
    });
    document.getElementById('craftRestorativeBtn')?.addEventListener('click', () => {
      import('../systems/crafting.js').then(m => m.craftRestorative());
    });
    // Phial brewing – interactive cauldron minigame
    document.getElementById('craftPotionBtn')?.addEventListener('click', () => {
      import('../minigames/phial-brew.js').then(m => m.startPhialBrewing());
    });

    // Rune Study button
    const studyBtn = document.getElementById('studyRuneBtn');
    if (studyBtn) studyBtn.addEventListener('click', () => {
      import('../systems/crafting.js').then(m => m.studyRune());
    });

    // Rune Etch button
    const etchBtn = document.getElementById('etchRuneBtn');
    if (etchBtn) etchBtn.addEventListener('click', () => {
      import('../minigames/rune-etch.js').then(m => m.startRuneTracing());
    });

    // Maze entrance button (NEW – only addition)
    const mazeBtn = document.getElementById('mazeEntranceBtn');
    if (mazeBtn) mazeBtn.addEventListener('click', () => {
      import('../systems/maze-system.js').then(m => m.showPathSelectionModal());
    });

    // Day cycle
    this.gameLoop = window.setInterval(() => {
      if (timerSeconds.value > 0) {
        timerSeconds.value = Math.max(0, timerSeconds.value - 1);
      } else {
        advanceAction();
        autoSave();
        timerSeconds.value = 600;
      }
    }, 1000);

    // Gaze warning
    effect(() => {
      if (kalgothsNoose.value >= 50 && !isGazeActive.value) {
        startGazeWarning();
      }
    });

    const container = document.getElementById('gameContainer');
    if (container) container.classList.add('altar-active');

    // toggleChat provided globally for inline HTML
    (window as any).toggleChat = () => {
      const chat = document.getElementById('whispChat');
      if (chat) {
        chat.style.display = (chat.style.display === 'none' || chat.style.display === '') ? 'flex' : 'none';
      }
    };

    console.log('[Game] Plugins ready');
  }

  resetGame(): Promise<void> {
    if (this.gameLoop) clearInterval(this.gameLoop);
    destroyPlugins();
    destroyWhispChat();
    initializeState();
    return this.start();
  }
}