// js/core/dev-mode.ts
// Developer sandbox: Ctrl+Shift+D toggles infinite resources and unlocks everything.

import { batch } from '@preact/signals-core';
import {
  ingredients, crafted, knownRunes, selectedRunes, runeSlots,
  will, health, maxWill, suspicion, seedResonance, maxSeedResonance,
  orbexFragments, maxOrbexFragments, corruptionLevel, kalgothsNoose,
  circlePower, circleMastery, gazeIntensity, wardIntegrities,
  tutorial, discoveries, ownedCards, equippedEntitySlots,
  equippedSpellSlots, equippedEnhancementSlots, equippedLandSlots,
  ownedRelics, equippedRelics, mazePathsUnlocked,
  timerSeconds, gazePhase, isGazeActive, gazeSurvivalCount,
  dailyConsumableSlots, itemUsageDaily, activeDemon,
} from './state-signals.js';
import { allCards } from '../data/cards.js';
import { relics } from '../data/relics.js';
import { runeData } from '../data/runes.js';

let devMode = false;
let panel: HTMLDivElement | null = null;

export function isDevMode(): boolean { return devMode; }

export function initDevMode(): void {
  // Keyboard shortcut: Ctrl+Shift+D
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleDevMode();
    }
  });

  // Console command
  (window as any).devMode = () => toggleDevMode();
}

function toggleDevMode(): void {
  devMode = !devMode;
  if (devMode) {
    grantAllResources();
    createDevPanel();
    console.log('🛠️ Developer mode ON');
  } else {
    destroyDevPanel();
    console.log('🛠️ Developer mode OFF (resources retained)');
  }
}

export function grantAllResources(): void {
  batch(() => {
    // Infinite resources
    ingredients.value = {
      nightshadeMoss: 999,
      cryptPhlegm: 999,
      bansheeSalts: 999,
      wyrmEye: 50,
      demonIchor: 999,
      boneDust: 999,
      shadowResin: 50,
    };
    crafted.value = {
      powderOfWarding: 99,
      phialOfSubjugation: 99,
      restorativeDraught: 50,
    };
    will.value = 999;
    health.value = 999;
    maxWill.value = 999;
    suspicion.value = 0;
    seedResonance.value = 5;
    maxSeedResonance.value = 5;
    kalgothsNoose.value = 0;
    circlePower.value = 100;
    circleMastery.value = 10;
    orbexFragments.value = 6;
    maxOrbexFragments.value = 6;
    corruptionLevel.value = 0;
    gazeIntensity.value = 0;
    wardIntegrities.value = [100, 100, 100];
    timerSeconds.value = 600;
    gazePhase.value = 'inactive';
    isGazeActive.value = false;
    gazeSurvivalCount.value = 0;
    dailyConsumableSlots.value = ['restorativeDraught', 'powderOfWarding', 'phialOfSubjugation'];
    itemUsageDaily.value = {};
    activeDemon.value = null;

    // Unlock all runes
    knownRunes.value = runeData.map(r => r.name);
    runeSlots.value = ['Dagaz', 'Fehu', 'Uruz'];
    selectedRunes.value = ['Dagaz', 'Fehu', 'Uruz'];

    // Unlock all tutorial
    tutorial.value = {
      firstForage: true, firstTrace: true, firstRuneStudied: true,
      firstRuneEtched: true, firstSummon: true, firstDominate: true,
      firstDestroy: true, firstRelicFound: true, firstTithePaid: true,
      firstMazeExplored: true, hasSeenSeedHint: true, currentStep: 'complete',
      firstGazeSurvived: true, guidedFirstDayComplete: true,
    };

    // Unlock discoveries
    discoveries.value = {
      runes: knownRunes.value,
      demons: ['Imp', 'Cunning', 'Feral', 'Ancient', 'Volatile', 'Shadow-touched'],
      ingredients: ['nightshadeMoss', 'cryptPhlegm', 'bansheeSalts', 'wyrmEye', 'demonIchor', 'boneDust', 'shadowResin'],
      rituals: ['summon', 'dominate', 'banish', 'destroy'],
      lore: ['orbex', 'kalgoth', 'undercrypt', 'acolytes'],
    };

    // Unlock all cards (one copy each)
    ownedCards.value = allCards.map(c => ({ cardId: c.id, quantity: 1, enhancementLevel: 0 }));
    equippedEntitySlots.value = ['umbral_mite', 'ember_hound', 'stone_warden'];
    equippedSpellSlots.value = ['void_gaze', 'ember_burst'];
    equippedEnhancementSlots.value = ['iron_will'];
    equippedLandSlots.value = ['void_spring'];

    // Unlock all relics
    ownedRelics.value = relics.map(r => r.id);
    equippedRelics.value = relics.slice(0, 3).map(r => r.id);

    // Unlock maze paths
    mazePathsUnlocked.value = ['Warded', 'Safe', 'Collapsed', 'Echoing'];
  });
}

function createDevPanel(): void {
  if (panel) return;
  panel = document.createElement('div');
  panel.id = 'devPanel';
  panel.style.cssText = `
    position: fixed; top: 10px; left: 10px; z-index: 99999;
    background: rgba(0,0,0,0.9); border: 1px solid #ffd700; border-radius: 12px;
    padding: 10px; font-family: 'Courier New', monospace; font-size: 0.8rem;
    color: #ffd700; max-width: 220px;
  `;
  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
      <span>🛠️ DEV MODE</span>
      <button id="devCloseBtn" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1rem;">✖</button>
    </div>
    <div style="display:flex; flex-direction:column; gap:6px;">
      <button class="dev-btn" data-action="grantAll">💰 Max Resources</button>
      <button class="dev-btn" data-action="unlockAllCards">🃏 All Cards</button>
      <button class="dev-btn" data-action="unlockAllRelics">💎 All Relics</button>
      <button class="dev-btn" data-action="unlockAllRunes">ᚠ All Runes</button>
      <button class="dev-btn" data-action="resetGaze">🌑 Reset Gaze</button>
      <button class="dev-btn" data-action="addTime">⏳ +5min Timer</button>
      <button class="dev-btn" data-action="zeroNoose">🧿 Zero Noose</button>
      <button class="dev-btn" data-action="openAllPaths">🗺️ All Maze Paths</button>
    </div>
  `;

  panel.querySelector('#devCloseBtn')?.addEventListener('click', () => toggleDevMode());
  panel.querySelectorAll('.dev-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).dataset.action;
      handleDevAction(action!);
    });
  });

  // Style for buttons
  const style = document.createElement('style');
  style.textContent = `
    .dev-btn {
      background: rgba(255,215,0,0.15); border: 1px solid #ffd700;
      color: #ffd700; padding: 4px 8px; border-radius: 6px;
      cursor: pointer; font-family: inherit; font-size: 0.7rem;
      transition: 0.2s;
    }
    .dev-btn:hover { background: rgba(255,215,0,0.3); }
  `;
  document.head.appendChild(style);

  document.body.appendChild(panel);
}

function destroyDevPanel(): void {
  if (panel) { panel.remove(); panel = null; }
}

function handleDevAction(action: string): void {
  switch (action) {
    case 'grantAll': grantAllResources(); break;
    case 'unlockAllCards':
      ownedCards.value = allCards.map(c => ({ cardId: c.id, quantity: 1, enhancementLevel: 0 }));
      break;
    case 'unlockAllRelics':
      ownedRelics.value = relics.map(r => r.id);
      break;
    case 'unlockAllRunes':
      knownRunes.value = runeData.map(r => r.name);
      break;
    case 'resetGaze':
      batch(() => {
        isGazeActive.value = false;
        gazePhase.value = 'inactive';
        timerSeconds.value = 300;
        wardIntegrities.value = [100, 100, 100];
      });
      break;
    case 'addTime':
      timerSeconds.value = Math.min(600, timerSeconds.value + 300);
      break;
    case 'zeroNoose':
      kalgothsNoose.value = 0;
      break;
    case 'openAllPaths':
      mazePathsUnlocked.value = ['Warded', 'Safe', 'Collapsed', 'Echoing'];
      break;
  }
}
