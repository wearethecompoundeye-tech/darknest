// js/core/game.ts – Central game orchestrator, demon‑free.
// Kalgoth’s taunts and modal manager are integrated.
// All button bindings are present and correct.

import {
  state, health, will, maxWill, ingredients, crafted,
  timerSeconds, initSaveSystem, loadSaveData, autoSave,
  applyDailyPassives, resetDailyItemUsage, initializeState,
  setAddLog, kalgothsNoose, circlePower, circleMastery,
  orbexFragments, ownedCards, equippedEntitySlots,
  familiar, discoveries, tutorial, isGazeActive, gazePhase,
  dailyConsumableSlots, getActiveEntity
} from './state-signals.js';
import { initAudio, startCaveDrips, stopAllAudioProcesses, updateVolumes } from '../audio/sfx.js';
import { initCircleTracing } from '../minigames/circle-trace.js';
import { setupUIEffects, initOrbitAnimation, updateUI, triggerScreenPulse } from '../ui/ui-renderer.js';
import { openGrimoire } from '../ui/grimoire.js';
import { openSatchel } from '../ui/satchel.js';
import { openTome } from '../ui/tome.js';
import { initWhispChat, destroyWhispChat } from '../ui/whisp-chat.js';
import { showPathSelectionModal } from '../systems/maze-system.js';
import { summonEntity } from '../systems/summoning.js';
import { initPlugins, destroyPlugins } from '../plugins/plugin-interface.js';
import { addLog } from '../ui/log-manager.js';
import { initDayCycle, stopDayCycle, payTithe, attemptEscape } from '../systems/day-cycle.js';
import { initRitualMeter, destroyGemMeter } from '../ui/ritual-meter.js';
import { initTutorialListeners } from '../systems/tutorial-listeners.js';
import { initGemMeter } from '../ui/ritual-meter.js';
import { applyWardNooseReduction } from '../systems/familiar-manager.js';
import { startGazeWarning } from '../systems/gaze-event.js';
import { clearAllParticles } from '../ui/particle-system.js';
import { injectSummonStyles } from '../systems/summoning.js';
import { ModalManager } from '../ui/modal-manager.js';
import { renderSettingsContent } from '../ui/settings-panel.js';
import { getKalgothAction } from '../ai/battle-ai.js';

export class Game {
  private started = false;
  private kalgothTauntInterval: number | null = null;

  constructor() {
    this.start = this.start.bind(this);
  }

  public async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    initializeState();
    applyDailyPassives(addLog);
    setAddLog(addLog);

    const loaded = await initSaveSystem();
    if (!loaded) autoSave();

    (window as any).modalManager = new ModalManager();

    initAudio();
    startCaveDrips();

    setupUIEffects();
    initOrbitAnimation();
    updateUI();

    initCircleTracing();
    initGemMeter();
    initRitualMeter();
    initTutorialListeners();

    setTimeout(() => initWhispChat(), 600);

    initDayCycle();
    initPlugins().then(() => console.log('[Game] Plug‑ins ready'));

    injectSummonStyles();
    this.startKalgothTaunts();

    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) gameContainer.classList.add('altar-active');

    this.bindUIButtons();

    window.addEventListener('beforeunload', () => this.shutdown());

    console.log('✅ Game ready with Altar of the Seed');
  }

  private startKalgothTaunts(): void {
    const minInterval = 120_000;
    const maxInterval = 180_000;
    const schedule = () => {
      const delay = minInterval + Math.random() * (maxInterval - minInterval);
      this.kalgothTauntInterval = window.setTimeout(async () => {
        try {
          const dummyState = {
            playerHP: health.value, playerMaxHP: 100, playerAttack: 10, playerDefense: 0,
            playerResistance: 0, playerMomentum: 0, playerIsDefending: false,
            enemyHP: 100, enemyMaxHP: 100, enemyAttack: 10, enemyDefense: 0,
            enemyResistance: 0, enemyMomentum: 0, enemyIsDefending: false,
            battleLog: ['Acolyte wanders the Undercrypt.'],
            playerAbilities: [], enemyAbilities: [], hand: [], turn: 'player',
            advantage: 0, canFlee: false, fleeAttempts: 0,
            playerStatusEffects: [], enemyStatusEffects: [],
            turnCount: 0, enemyTelegraphed: false,
            playerIntent: null, enemyIntent: 'attack', telegraphEffect: 'none',
            playerActionHistory: [], enemyActionHistory: [], enemyDelayTurns: 0,
          };
          const dummyEnemy = {
            id: 'kalgoth_echo', name: 'Kalgoths Echo', type: 'entity', rarity: 'legendary',
            aspect: 'Void', image: '', frame: '',
            stats: { hp: 999, atk: 20, def: 10, res: 30, spd: 5, cun: 5, init: 10, loyalty: 0 },
            abilities: [],
          };
          const dummyPlayer = {
            id: 'umbral_mite', name: 'Acolyte', type: 'entity', rarity: 'common',
            aspect: 'Void', image: '', frame: '',
            stats: { hp: 20, atk: 3, def: 1, res: 10, spd: 3, cun: 2, init: 3, loyalty: 70 },
            abilities: [],
          };
          const { banter } = await getKalgothAction(dummyState as any, dummyPlayer as any, dummyEnemy as any);
          if (banter) addLog(`KALGOTH: ${banter}`, false, 'void');
        } catch {
          addLog('KALGOTH: *A distant, mocking laugh echoes.*', false, 'void');
        }
        schedule();
      }, delay);
    };
    schedule();
  }

  private bindUIButtons(): void {
    document.getElementById('satchelIcon')?.addEventListener('click', openSatchel);
    document.getElementById('tomeIcon')?.addEventListener('click', openTome);
    document.getElementById('captureJar')?.addEventListener('click', openGrimoire);
    document.getElementById('settingsIcon')?.addEventListener('click', () => {
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal) {
        renderSettingsContent();
        (window as any).modalManager.open(settingsModal);
      }
    });

    document.getElementById('mazeEntranceBtn')?.addEventListener('click', () => showPathSelectionModal());

    document.getElementById('craftPowderBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.craftPowder()));
    document.getElementById('craftPotionBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.craftPotion(true)));
    document.getElementById('craftRestorativeBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.craftRestorative()));
    document.getElementById('studyRuneBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.studyRune()));
    document.getElementById('traceRuneBtn')?.addEventListener('click', () => import('../minigames/rune-etch.js').then(m => m.startRuneTracing()));

    document.getElementById('quickCraftPowderBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.quickCraftPowder()));
    document.getElementById('quickCraftPhialBtn')?.addEventListener('click', () => import('../systems/crafting.js').then(m => m.quickCraftPhial()));
    document.getElementById('titheBtn')?.addEventListener('click', payTithe);
    document.getElementById('escapeBtn')?.addEventListener('click', attemptEscape);

    document.getElementById('summonBtn')?.addEventListener('click', summonEntity);

    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById(`bandolierSlot${i}`);
      if (slot) slot.addEventListener('click', () => { /* gaze-ui handles this */ });
    }

    document.getElementById('whispSpriteClick')?.addEventListener('click', () => import('../ui/tutorial.js').then(m => m.openWhispStats()));

    document.getElementById('petFamiliarBtn')?.addEventListener('click', () => import('../systems/familiar-manager.js').then(m => m.petFamiliar()));
    document.getElementById('forageBtn')?.addEventListener('click', () => import('../systems/familiar-manager.js').then(m => m.forage()));
  }

  private shutdown(): void {
    if (this.kalgothTauntInterval) {
      clearTimeout(this.kalgothTauntInterval);
      this.kalgothTauntInterval = null;
    }
    stopAllAudioProcesses();
    clearAllParticles();
    destroyWhispChat();
    destroyGemMeter();
    destroyPlugins();
    stopDayCycle();
    autoSave();
  }
}