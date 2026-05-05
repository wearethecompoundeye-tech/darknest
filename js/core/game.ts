// js/core/game.ts
// Central Game class – reduces window pollution, improves testability.

import { effect } from '@preact/signals-core';
import {
  state,
  updateState,
  autoSave,
  loadSaveData,
  CONSTANTS,
  circleQuality,
  tutorial,
  playerName,
  lastForageTime,
  health,
  will,
  maxWill,
  orbexFragments,
  orbexBoons,
  maxWill as maxWillSignal,
  mazePathsUnlocked,
  setAddLog,
  ownedCards,
  equippedEntitySlots,
  kalgothsNoose,
  circlePower,
  circleMastery,
  ingredients,
  activeDemon,
  addCard,
} from './state-signals.js';
import { setupUIEffects, updateUI, updateRuneSlots, initOrbitAnimation, triggerScreenPulse } from '../ui/ui-renderer.js';
import { initTutorial, checkTutorialProgress, getContextualHint, showTutorialPopup, openWhispStats, setTutorialEnabled, isTutorialEnabled } from '../ui/tutorial.js';
import { addLog, clearLog } from '../ui/log-manager.js';
import { openTome } from '../ui/tome.js';
import { openSatchel } from '../ui/satchel.js';
import { openGrimoire } from '../ui/grimoire.js';
import { initCircleTracing } from '../minigames/circle-trace.js';
import { startRuneTracing } from '../minigames/rune-etch.js';
import { craftPowder, craftPotion, craftRestorative, studyRune, quickCraftPowder, quickCraftPhial } from '../systems/crafting.js';
import { summonEntity, captureDemon, banishDemon, collectAsh, releaseCapturedDemon } from '../systems/summoning.js';
import { showPathSelectionModal, setUnlockBoonCallback } from '../systems/maze-system.js';
import { payTithe, attemptEscape, initDayCycle } from '../systems/day-cycle.js';
import { petFamiliar, forage } from '../systems/familiar-manager.js';
import { talkToDemon } from '../ui/demon-modal.js';
import { initAudio, playSfx, startLoop, stopAllLoops, toggleSfx, updateVolumes, toggleMusic, getSound } from '../audio/sfx.js';
import { updateAmbience, stopAllAmbience } from '../audio/ambience-manager.js';
import { whispSay, setupWhispReactions, setWhispEnabled, isWhispEnabled } from '../ui/whisp-commentary.js';
import { testOllamaConnection } from '../ai/ai-engine.js';
import { el } from './dom-helper.js';
import { logger } from './logger.js';
import { renderSettingsContent } from '../ui/settings-panel.js';
import { gameBus } from './eventBus.js';
import { GameEvents, type SummonVictoryPayload, type TithePaidPayload, type GazeSurvivedPayload, type GazeDefeatPayload, type FragmentCollectedPayload } from './events.js';
import { ModalManager } from '../ui/modal-manager.js';
import { initTutorialListeners } from '../systems/tutorial-listeners.js';
import { currentPhase, transition, type GameEvent } from './gameReducer.js';
import { initLocale, t } from './localisation.js';
import { initPlugins } from '../plugins/plugin-interface.js';
import { initSaveSystem, getSlotList, setCurrentSlot } from './persistence.js';
import { showSaveSlots } from '../ui/save-slots.js';
import { initWhispChat, showBubble } from '../ui/whisp-chat.js';
import { setClashEnabled } from '../ui/battle-clash.js';
import { initDevMode } from './dev-mode.js';
import { getZilionMemory } from '../ai/zelionMemory.js';

export class Game {
  modalManager: ModalManager;
  private willRegenInterval: number | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private masterVol = 0.7;
  private sfxVol = 0.7;
  private musicVol = 0.4;
  private lastFragmentCount = 0;

  constructor() {
    this.modalManager = new ModalManager();
    // Expose necessary globals for legacy code (will be removed later)
    (window as any).state = state;
    (window as any).modalManager = this.modalManager;
    (window as any).gameBus = gameBus;
    (window as any).currentPhase = currentPhase;
    (window as any).transition = transition;
    // Public API (old window assignments)
    (window as any).payTithe = payTithe;
    (window as any).escapeGame = attemptEscape;
    (window as any).openTome = openTome;
    (window as any).openSatchel = openSatchel;
    (window as any).openGrimoire = openGrimoire;
    (window as any).saveGame = () => autoSave();
    (window as any).loadGame = async () => {
      const data = localStorage.getItem("kalgothGazeOrbitSave");
      if (data) {
        loadSaveData(JSON.parse(data));
        addLog("Game loaded.", false, 'system');
        if (activeDemon.value && !activeDemon.value.name) {
          activeDemon.value = null;
        }
        updateUI();
      } else {
        addLog("No save found.", true);
      }
    };
    (window as any).talkToDemon = talkToDemon;
    (window as any).showCaptureJar = openGrimoire;
    (window as any).openWhispStats = openWhispStats;
  }

  start(): void {
    setAddLog(addLog as any);
    setupUIEffects();
    setupWhispReactions();

    // Phase display
    effect(() => {
      const el = document.getElementById('phaseDisplay');
      if (el) el.textContent = `Status: ${currentPhase.value.status}`;
    });

    initTutorialListeners();

    effect(() => {
      checkTutorialProgress();
      updateAmbience();
    });

    document.addEventListener("DOMContentLoaded", () => this.onReady());
  }

  private onReady(): void {
    const splash = el('splashScreen');
    const gameContainer = el('gameContainer');
    const splashLogo = el('splashLogo') as HTMLImageElement | null;
    let musicStarted = false;

    if (splash) {
      splash.addEventListener('click', () => {
        if (splashLogo) splashLogo.style.transform = 'scale(1.1)';
        if (!musicStarted) {
          try {
            const splashMusic = getSound('splashMusic');
            if (splashMusic) {
              splashMusic.play();
              splashMusic.fade(0, splashMusic.volume(), 0);
              splashMusic.fade(splashMusic.volume(), 0, 3000);
            }
          } catch (e) {}
          musicStarted = true;
        }
        splash.style.transition = 'opacity 3s ease';
        splash.style.opacity = '0';
        if (gameContainer) {
          gameContainer.style.display = 'block';
          gameContainer.style.opacity = '0';
          setTimeout(() => {
            gameContainer.style.transition = 'opacity 3s ease';
            gameContainer.style.opacity = '1';
            initDayCycle();
          // Show Zilion after a brief delay, once the game is fully visible
          setTimeout(() => initWhispChat(), 1000);
          }, 50);
        }
        setTimeout(() => {
          splash.style.display = 'none';
          if (musicStarted) {
            const sm = getSound('splashMusic');
            if (sm) sm.stop();
          }
          whispSay("Finally. I thought you'd stare at that forever.");
        }, 3000);
      });
    }

    // Tutorial replaced by Zilion
    // initTutorial(); // commented out
    setUnlockBoonCallback(this.handleBoonUnlock.bind(this));
    this.lastFragmentCount = orbexFragments.value;

    if (ownedCards.value.length === 0) {
      addCard('umbral_mite', 1);
      addCard('ember_hound', 1);
      addCard('stone_warden', 1);
      addCard('void_gaze', 1);
      addCard('ember_burst', 1);
      addCard('iron_will', 1);
      addCard('void_spring', 1);
    }

    // Wiring buttons
    this.safeAttach("craftPowderBtn", "click", () => { playSfx('uiClick'); craftPowder(); });
    this.safeAttach("craftPotionBtn", "click", () => { playSfx('uiClick'); craftPotion(true); });
    this.safeAttach("craftRestorativeBtn", "click", () => { playSfx('uiClick'); craftRestorative(); });
    this.safeAttach("studyRuneBtn", "click", () => { playSfx('uiClick'); studyRune(); });
    this.safeAttach("traceRuneBtn", "click", () => { playSfx('uiClick'); startRuneTracing(); });
    this.safeAttach("quickCraftPowderBtn", "click", () => { playSfx('uiClick'); quickCraftPowder(); });
    this.safeAttach("quickCraftPhialBtn", "click", () => { playSfx('uiClick'); quickCraftPhial(); });
    this.safeAttach("summonBtn", "click", summonEntity);
    this.safeAttach("titheBtn", "click", payTithe);
    this.safeAttach("escapeBtn", "click", attemptEscape);
    this.safeAttach("ashPileArea", "click", collectAsh);
    this.safeAttach("mazeEntranceBtn", "click", () => this.enterMaze());
    this.safeAttach("petFamiliarBtn", "click", petFamiliar);
    this.safeAttach("forageBtn", "click", forage);
    this.safeAttach("tutorialBtn", "click", () => showTutorialPopup(tutorial.value.currentStep));
    this.safeAttach("talkToDemonBtn", "click", talkToDemon);
    this.safeAttach("tomeIcon", "click", openTome);
    this.safeAttach("satchelIcon", "click", openSatchel);
    this.safeAttach("settingsIcon", "click", () => {
      this.updateSettingsUI();
      renderSettingsContent();
      const modal = el("settingsModal");
      if (modal) this.modalManager.open(modal);
    });
    this.safeAttach("captureJar", "click", openGrimoire);
    this.safeAttach("hintButton", "click", () => addLog(getContextualHint(), false, 'whisp'));
    this.safeAttach("masterVolumeSlider", "input", e => this.masterVol = parseFloat((e.target as HTMLInputElement).value));
    this.safeAttach("sfxVolumeSlider", "input", e => this.sfxVol = parseFloat((e.target as HTMLInputElement).value));
    this.safeAttach("musicVolumeSlider", "input", e => this.musicVol = parseFloat((e.target as HTMLInputElement).value));
    this.safeAttach("muteSfxBtn", "click", () => this.toggleSfxMute());
    this.safeAttach("muteMusicBtn", "click", () => this.toggleMusicMute());
    this.safeAttach("toggleWhispBtn", "click", () => this.toggleWhisp());
    this.safeAttach("toggleTutorialBtn", "click", () => this.toggleTutorial());
    this.safeAttach("settingsSaveBtn", "click", () => { autoSave(); addLog("Game saved.", false, 'system'); playSfx('uiClick'); });
    this.safeAttach("settingsLoadBtn", "click", () => {
      const data = localStorage.getItem("kalgothGazeOrbitSave");
      if (data) { loadSaveData(JSON.parse(data)); addLog("Game loaded.", false, 'system'); updateUI(); playSfx('uiClick'); }
      else addLog("No save found.", true);
    });
    this.safeAttach("traceCircleBtn", "click", () => { initCircleTracing(); playSfx('uiClick'); });

    // Collapsibles
    const toggleCrafting = el("toggleCraftingBtn");
    const craftingContent = el("craftingContent");
    if (toggleCrafting && craftingContent) toggleCrafting.addEventListener("click", () => { craftingContent.classList.toggle("collapsed"); toggleCrafting.classList.toggle("collapsed"); });
    const toggleRitual = el("toggleRitualBtn");
    const ritualContent = el("ritualContent");
    if (toggleRitual && ritualContent) toggleRitual.addEventListener("click", () => { ritualContent.classList.toggle("collapsed"); toggleRitual.classList.toggle("collapsed"); });
    const toggleStats = el("toggleStatsBtn");
    const statsContent = el("playerStatsContent");
    if (toggleStats && statsContent) toggleStats.addEventListener("click", () => { statsContent.classList.toggle("collapsed"); toggleStats.classList.toggle("collapsed"); });
    const toggleBandolier = el("toggleBandolierBtn");
    const bandolierContent = el("bandolierContent");
    if (toggleBandolier && bandolierContent) toggleBandolier.addEventListener("click", () => { bandolierContent.classList.toggle("collapsed"); toggleBandolier.classList.toggle("collapsed"); });

    this.setupModalClosers();

    const playerNameDisplay = el("playerNameDisplay");
    if (playerNameDisplay) playerNameDisplay.innerText = playerName.value;
    addLog(`The acolytes call you "${playerName.value}". The Seed of Orbex pulses.`, false, 'orbex');

    testOllamaConnection().then(c => addLog(c ? "🔮 Orbex whispers... (AI connected)" : "🌑 Orbex is silent. (AI offline)", false, 'orbex'));

    if (activeDemon.value && typeof activeDemon.value === 'object' && !activeDemon.value.name) {
      activeDemon.value = null;
    }

    updateUI();
    initCircleTracing();
    initOrbitAnimation();
    // initDayCycle() is called after splash click
    this.startWillRegen();
    setInterval(() => this.updateForageCooldown(), 1000);

    if (circleQuality.value > 0) startLoop('circleTraceLoop');

    // Zilion chat setup

    // Check for existing saves
    getSlotList().then(slots => {
      if (slots.length > 0) {
        showSaveSlots(() => { logger.debug('Game started from save slot'); });
      } else {
        logger.debug('No saves found – starting new game');
        setCurrentSlot('autosave');
      }
    });

    initSaveSystem().then(() => logger.debug('Save system ready'));
    initLocale('en');
  setClashEnabled(localStorage.getItem('clashEnabled') !== 'false');
    initPlugins().then(() => logger.debug('Plugins ready'));
  initDevMode();

    // W key listener for Zilion
    window.addEventListener('keydown', function(e) {
      if (e.key === 'w' || e.key === 'W') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        // toggleWhispChat removed
      }
    }, true);

    // Event bus listeners (temporary in main)
    gameBus.on<SummonVictoryPayload>(GameEvents.SUMMON_VICTORY, (payload) => {
      kalgothsNoose.value = Math.max(0, kalgothsNoose.value - 5);
    });

    console.log("✅ Game ready with Card System");
  }

  private safeAttach(id: string, event: string, handler: EventListener): void {
    const element = el(id);
    if (element) element.addEventListener(event, handler);
  }

  private setupModalClosers(): void {
    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        const modal = (btn as HTMLElement).closest('.modal') as HTMLElement;
        if (modal) modal.style.display = "none";
        stopAllLoops();
      });
    });
    window.addEventListener("click", e => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('modal')) {
        target.style.display = "none";
        stopAllLoops();
      }
    });
  }

  private updateForageCooldown(): void {
    const remaining = Math.max(0, CONSTANTS.FORAGE_COOLDOWN - (Date.now() - lastForageTime.value));
    const cd = el("forageCooldown");
    const btn = el("forageBtn") as HTMLButtonElement | null;
    if (cd) cd.innerText = remaining > 0 ? `Cooldown: ${Math.ceil(remaining / 1000)}s` : "";
    if (btn) btn.disabled = remaining > 0;
  }

  private updateSettingsUI(): void {
    const masterSlider = el("masterVolumeSlider") as HTMLInputElement;
    const sfxSlider = el("sfxVolumeSlider") as HTMLInputElement;
    const musicSlider = el("musicVolumeSlider") as HTMLInputElement;
    if (masterSlider) masterSlider.value = this.masterVol.toString();
    if (sfxSlider) sfxSlider.value = this.sfxVol.toString();
    if (musicSlider) musicSlider.value = this.musicVol.toString();
    const masterLabel = el("masterVolLabel");
    if (masterLabel) masterLabel.innerText = Math.round(this.masterVol * 100) + "%";
    const sfxLabel = el("sfxVolLabel");
    if (sfxLabel) sfxLabel.innerText = Math.round(this.sfxVol * 100) + "%";
    const musicLabel = el("musicVolLabel");
    if (musicLabel) musicLabel.innerText = Math.round(this.musicVol * 100) + "%";
    const muteSfxBtn = el("muteSfxBtn");
    if (muteSfxBtn) muteSfxBtn.textContent = this.sfxEnabled ? "🔊 SFX ON" : "🔇 SFX OFF";
    const muteMusicBtn = el("muteMusicBtn");
    if (muteMusicBtn) muteMusicBtn.textContent = this.musicEnabled ? "🎵 MUSIC ON" : "🔇 MUSIC OFF";
    const whispBtn = el("toggleWhispBtn");
    if (whispBtn) whispBtn.textContent = isWhispEnabled() ? "👁️ Whisp ON" : "👁️ Whisp OFF";
    const tutorialBtn = el("toggleTutorialBtn");
    if (tutorialBtn) tutorialBtn.textContent = isTutorialEnabled() ? "📖 Tutorial ON" : "📖 Tutorial OFF";
  }

  private toggleSfxMute(): void { this.sfxEnabled = !this.sfxEnabled; toggleSfx(this.sfxEnabled); this.updateSettingsUI(); }
  private toggleMusicMute(): void { this.musicEnabled = !this.musicEnabled; toggleMusic(this.musicEnabled); this.updateSettingsUI(); }
  private toggleWhisp(): void { const enabled = !isWhispEnabled(); setWhispEnabled(enabled); this.updateSettingsUI(); }
  private toggleTutorial(): void {
    const enabled = !isTutorialEnabled();
    setTutorialEnabled(enabled);
    this.updateSettingsUI();
    if (enabled) showTutorialPopup(tutorial.value.currentStep);
  }

  private startWillRegen(): void {
    if (this.willRegenInterval) clearInterval(this.willRegenInterval);
    this.willRegenInterval = window.setInterval(() => {
      if (will.value < maxWill.value && health.value > 0) {
        updateState(() => { will.value = Math.min(maxWill.value, will.value + 1); });
      }
    }, 8000);
  }

  private handleBoonUnlock(): void {
    const boons = [
      { id: 'will', name: 'Orbex Vitality', effect: '+10 max Will' },
      { id: 'synthesis', name: 'Essence Synthesis', effect: 'Passive Moss generation' },
      { id: 'vision', name: 'Orbex Vision', effect: 'Reveals hidden paths' },
      { id: 'resistance', name: 'Ward Resistance', effect: '-20% ward chance' }
    ];
    const fragmentCount = orbexFragments.value;
    if (fragmentCount > 0 && fragmentCount <= boons.length) {
      const newBoon = boons[fragmentCount - 1];
      if (!orbexBoons.value.includes(newBoon.id)) {
        updateState(() => {
          orbexBoons.value = [...orbexBoons.value, newBoon.id];
          if (newBoon.id === 'will') maxWillSignal.value += 10;
          if (newBoon.id === 'resistance') mazePathsUnlocked.value = [...mazePathsUnlocked.value, 'Collapsed'];
        });
        addLog(`🌟 Orbex Boon Unlocked: ${newBoon.name} - ${newBoon.effect}`, false, 'orbex');
        playSfx('Boon_Unlock');
        whispSay(`I feel new power. ${newBoon.effect}. Don't waste it.`);
        triggerScreenPulse('#d4af37');
      }
    }
  }

  private enterMaze(): void {
    if (will.value < 5) {
      addLog("Not enough Will (5 required).", true);
      return;
    }
    if (ingredients.value.demonIchor < 2) {
      addLog("Not enough Ichor (2 required).", true);
      return;
    }
    updateState(() => {
      will.value -= 5;
      ingredients.value = { ...ingredients.value, demonIchor: ingredients.value.demonIchor - 2 };
    });
    showPathSelectionModal();
  }
}
