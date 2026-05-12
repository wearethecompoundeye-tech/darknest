// js/systems/gaze-event.ts – Full Gaze system with ward patterns, stress, confront hollow, tiered rewards
// Kalgoth’s AI now taunts at the start and end of each Gaze. Uses enhanced UI layer.

import { signal } from '@preact/signals-core';
import { batch } from '@preact/signals-core';
import {
  will, maxWill, health, kalgothsNoose, circlePower, orbexFragments,
  ingredients, crafted, runeSlots, familiar, gazeIntensity, gazeSurvivalCount,
  dailyConsumableSlots, isGazeActive, gazePhase, timerSeconds, tithePaidThisDay,
  updateState, autoSave, addMasteryXP, addFamiliarXP, addSeedResonance,
  CONSTANTS, circleMastery,
} from '../core/state-signals.js';
import { currentPhase, transition } from '../core/gameReducer.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type GazeSurvivedPayload, type GazeDefeatPayload } from '../core/events.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { showGazeUI, updateGazeUI, hideGazeUI } from '../ui/gaze-ui-enhanced.js';
import { el } from '../core/dom-helper.js';
import { applyWardNooseReduction } from './familiar-manager.js';
import { setGazeActive } from './day-cycle.js';
import { getKalgothAction } from '../ai/battle-ai.js';  // for Kalgoth’s taunts

// ── Signals ──
export const gazeWardCount = signal(0);                // kept for backward compatibility
export const gazeWardImageIds = signal<number[]>([]);  // legacy
export const gazeWardPattern = signal<number[]>([0, 0, 0]); // [top, right, bottom] ward types (0=none, 1,2,3)

const MAX_WARDS = 3;

let gazeInterval: number | null = null;
let gazeTimerSeconds = 0;
let currentDrainRate = 0;
let lastUpdateTime = 0;
let warningTimeout: number | null = null;
let consumableCooldowns: boolean[] = [false, false, false];

// Performance metrics for tiered rewards
let drainHistory: number[] = [];

// ═══════════════════════════════════════════════════════════════
// 1. WARNING PHASE
// ═══════════════════════════════════════════════════════════════
export function startGazeWarning(): void {
  if (currentPhase.value.status !== 'idle') return;
  if (isGazeActive.value) return;
  if (warningTimeout) clearTimeout(warningTimeout);

  gazePhase.value = 'warning';
  transition({ type: 'GAZE_WARNING', intensity: gazeIntensity.value });
  isGazeActive.value = true;
  setGazeActive(true);

  const gameContainer = el('gameContainer');
  if (gameContainer) gameContainer.style.pointerEvents = 'none';

  showGazeUI('warning');
  addLog('⚠️ Whisp: "Kalgoth’s eye turns this way! Return to the circle!"', true, 'whisp');
  playSfx('suspicionRise');
  startLoop('gazeWarningBg');

  // Kalgoth’s malevolent greeting
  getKalgothAction(
    createDummyBattleState(),
    createDummyPlayerCard(),
    createDummyEnemyCard()
  ).then(({ banter }) => {
    if (banter) addLog(`KALGOTH: ${banter}`, false, 'void');
  }).catch(() => {
    addLog('KALGOTH: *The walls tremble as the Gaze draws near.*', false, 'void');
  });

  warningTimeout = window.setTimeout(() => {
    startGazeEvent();
  }, 30000);
}

export function forceStartGazeEvent(): void {
  if (warningTimeout) {
    clearTimeout(warningTimeout);
    warningTimeout = null;
  }
  if (gazePhase.value === 'warning') startGazeEvent();
}

// ═══════════════════════════════════════════════════════════════
// 2. ACTIVE GAZE
// ═══════════════════════════════════════════════════════════════
function startGazeEvent(): void {
  if (warningTimeout) { clearTimeout(warningTimeout); warningTimeout = null; }
  stopLoop('gazeWarningBg');
  gazePhase.value = 'active';
  transition({ type: 'GAZE_START', intensity: gazeIntensity.value });

  // Reset ward state
  gazeWardCount.value = 0;
  gazeWardImageIds.value = [];
  gazeWardPattern.value = [0, 0, 0];

  drainHistory = [];
  currentDrainRate = calculateDrainRate();
  gazeTimerSeconds = CONSTANTS.GAZE_DURATION_SECONDS + (orbexFragments.value * 5);
  lastUpdateTime = performance.now();
  consumableCooldowns = [false, false, false];

  showGazeUI('active');
  startLoop('gazeEventBg');
  playSfx('demonSummonBg');
  addLog('🔥 The Gaze engulfs you! Hold the circle!', true, 'orbex');

  // Spawn Hollow Acolyte if fragments present
  if (orbexFragments.value >= 1 && Math.random() < 0.3 + orbexFragments.value * 0.1) {
    spawnHollowAcolyte();
  }

  gazeInterval = window.setInterval(() => {
    updateGazeTick();
  }, 100);
}

function calculateDrainRate(): number {
  let base = CONSTANTS.GAZE_BASE_DRAIN_RATE + (gazeIntensity.value * CONSTANTS.GAZE_DRAIN_PER_INTENSITY)
    - (circleMastery.value * 0.2);

  const activeWards = gazeWardPattern.value.filter(w => w > 0).length;
  base *= (1 - activeWards * 0.2);

  base *= (1 + orbexFragments.value * 0.05);

  return Math.max(1, base);
}

function updateGazeTick(): void {
  if (!isGazeActive.value || gazePhase.value !== 'active') return;
  const now = performance.now();
  const deltaSeconds = (now - lastUpdateTime) / 1000;
  lastUpdateTime = now;

  const drainAmount = currentDrainRate * deltaSeconds;
  will.value = Math.max(0, will.value - drainAmount);
  health.value = Math.max(0, health.value - drainAmount * 0.3);

  drainHistory.push(drainAmount / deltaSeconds);
  if (drainHistory.length > 60) drainHistory.shift();

  currentDrainRate = calculateDrainRate();
  gazeTimerSeconds -= deltaSeconds;

  const willPct = will.value / maxWill.value;
  const healthPct = health.value / 100;
  const stressLevel = Math.min(100, ((1 - willPct) * 80) + (drainAmount * 5));

  updateGazeUI({
    willPercent: willPct,
    healthPercent: healthPct,
    timerSeconds: Math.max(0, gazeTimerSeconds),
    drainRate: currentDrainRate,
    stressLevel: Math.round(stressLevel),
  });

  if (will.value <= 0 || health.value <= 0) {
    endGazeEvent(false);
  } else if (gazeTimerSeconds <= 0) {
    endGazeEvent(true);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. PLAYER ACTIONS DURING GAZE
// ═══════════════════════════════════════════════════════════════
export function useConsumable(slotIndex: number): boolean {
  if (!isGazeActive.value || gazePhase.value !== 'active') return false;
  if (consumableCooldowns[slotIndex]) return false;
  const slotId = dailyConsumableSlots.value[slotIndex];
  if (!slotId) return false;

  let success = false;
  if (slotId === 'restorativeDraught' && crafted.value.restorativeDraught > 0) {
    crafted.value.restorativeDraught--;
    will.value = Math.min(maxWill.value, will.value + 50);
    health.value = Math.min(100, health.value + 30);
    addLog('You drink a Restorative Draught. Vitality surges.', false, 'player');
    playSfx('useHealingRestore');
    success = true;
  } else if (slotId === 'powderOfWarding' && crafted.value.powderOfWarding > 0) {
    crafted.value.powderOfWarding--;
    gazeWardPattern.value = [1, 2, 3];
    gazeWardCount.value = 3;
    gazeWardImageIds.value = generateWardImages(3);
    currentDrainRate = calculateDrainRate();
    addLog('Powder of Warding materialises three rotating wards!', false, 'player');
    playSfx('powderSuccess');
    success = true;
  } else if (slotId === 'phialOfSubjugation' && crafted.value.phialOfSubjugation > 0) {
    crafted.value.phialOfSubjugation--;
    currentDrainRate *= 0.5;
    setTimeout(() => { currentDrainRate = calculateDrainRate(); }, 15000);
    addLog('The Phial slows the Gaze for 15 seconds.', false, 'player');
    playSfx('phialSuccess');
    success = true;
  }

  if (success) {
    consumableCooldowns[slotIndex] = true;
    setTimeout(() => { consumableCooldowns[slotIndex] = false; }, 1000);
    return true;
  }
  addLog('No consumable available!', true);
  return false;
}

export function attemptWardCast(): boolean {
  if (!isGazeActive.value || gazePhase.value !== 'active') return false;
  const activeWards = gazeWardPattern.value.filter(w => w > 0).length;
  if (activeWards >= MAX_WARDS) {
    addLog('Already at maximum wards.', true);
    return false;
  }
  if (ingredients.value.demonIchor < 2) {
    addLog('Need 2 Ichor to cast a ward.', true);
    return false;
  }

  ingredients.value.demonIchor -= 2;
  playSfx('runeReveal');
  addLog('Tracing new ward...', false, 'orbex');
  return true;
}

function generateWardImages(count: number): number[] {
  const images: number[] = [];
  for (let i = 0; i < count; i++) {
    images.push(Math.floor(Math.random() * 12) + 1);
  }
  return images;
}

function spawnHollowAcolyte(): void {
  addLog('💀 A Hollow Acolyte appears in the Gaze!', true, 'demon');
  playSfx('hollow_lair_discover');
}

// ═══════════════════════════════════════════════════════════════
// 4. CONFRONT HOLLOW (sole definition)
// ═══════════════════════════════════════════════════════════════
export function confrontHollow(): { success: boolean; effect: string } {
  const playerWill = will.value;
  const stress = 0; // placeholder for future trauma system

  const baseChance = 0.4 + (playerWill / 200) - (stress * 0.1);
  const successChance = Math.max(0.1, Math.min(0.9, baseChance));

  if (Math.random() < successChance) {
    will.value = Math.min(maxWill.value, will.value + 20);
    return { success: true, effect: 'insight' };
  } else {
    will.value = Math.max(0, will.value - 30);
    return { success: false, effect: 'corruption' };
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. ENDING THE GAZE (with tiered rewards and Kalgoth commentary)
// ═══════════════════════════════════════════════════════════════
function endGazeEvent(survived: boolean): void {
  if (warningTimeout) { clearTimeout(warningTimeout); warningTimeout = null; }
  if (gazeInterval) { clearInterval(gazeInterval); gazeInterval = null; }
  stopLoop('gazeEventBg');
  isGazeActive.value = false;
  gazePhase.value = 'inactive';
  setGazeActive(false);
  const gameContainer = el('gameContainer');
  if (gameContainer) gameContainer.style.pointerEvents = 'auto';
  hideGazeUI();

  if (survived) {
    const avgDrain = drainHistory.length > 0 ? drainHistory.reduce((a,b) => a + b, 0) / drainHistory.length : currentDrainRate;
    const wardsLeft = gazeWardPattern.value.filter(w => w > 0).length;
    const stress = Math.round((1 - will.value / maxWill.value) * 100);
    let tier = 'Scuffle';
    if (avgDrain < 8 && wardsLeft >= 1) tier = 'Solid';
    if (avgDrain < 4 && wardsLeft === 3 && stress < 30) tier = 'Masterful';

    const baseIchor = 5 + Math.floor(gazeIntensity.value / 2);
    const masteryXP = 25 + gazeIntensity.value * 2 + (tier === 'Masterful' ? 50 : 0);
    const familiarXP = 10 + gazeIntensity.value + (tier === 'Masterful' ? 10 : 0);

    batch(() => {
      ingredients.value.demonIchor += baseIchor + (tier === 'Masterful' ? 5 : 0);
      gazeSurvivalCount.value++;
      transition({ type: 'GAZE_SURVIVED' });
      const nooseReduction = applyWardNooseReduction(20);
      kalgothsNoose.value = Math.max(0, kalgothsNoose.value - nooseReduction);
      if (tier === 'Solid') {
        crafted.value.powderOfWarding = (crafted.value.powderOfWarding || 0) + 1;
      } else if (tier === 'Masterful') {
        crafted.value.phialOfSubjugation = (crafted.value.phialOfSubjugation || 0) + 1;
      }
    });
    addMasteryXP(masteryXP);
    addFamiliarXP(familiarXP);
    gameBus.emit<GazeSurvivedPayload>(GameEvents.GAZE_SURVIVED, { intensity: gazeIntensity.value, ichorReward: baseIchor });
    addLog(`✨ You survived the Gaze (${tier.toUpperCase()})! +${baseIchor} Ichor, +${masteryXP} Mastery XP`, false, 'orbex');
    playSfx(tier === 'Masterful' ? 'epic_victory' : 'gameWin');
    gazeIntensity.value = Math.min(100, gazeIntensity.value + 5);

    // Kalgoth grudging response
    getKalgothAction(
      createDummyBattleState(),
      createDummyPlayerCard(),
      createDummyEnemyCard()
    ).then(({ banter }) => {
      if (banter) addLog(`KALGOTH: ${banter}`, false, 'void');
    }).catch(() => {});

  } else {
    addLog('💀 The Gaze overwhelms you...', true);
    transition({ type: 'GAZE_DEFEAT' });
    playSfx('gameOver');
    if (orbexFragments.value > 0) {
      orbexFragments.value--;
      health.value = 50;
      will.value = maxWill.value;
      addLog('You awaken, but a fragment is lost...', true);

      // Kalgoth’s cruel delight
      getKalgothAction(
        createDummyBattleState(),
        createDummyPlayerCard(),
        createDummyEnemyCard()
      ).then(({ banter }) => {
        if (banter) addLog(`KALGOTH: ${banter}`, false, 'void');
      }).catch(() => {});
    } else {
      alert('GAME OVER - Kalgoth claims your soul.');
      document.body.style.pointerEvents = 'none';
      return;
    }
  }
  // Reset state
  timerSeconds.value = 600;
  tithePaidThisDay.value = false;
  gazeWardPattern.value = [0, 0, 0];
  gazeWardCount.value = 0;
  gazeWardImageIds.value = [];
  drainHistory = [];
  autoSave();
}

// ═══════════════════════════════════════════════════════════════
// Dummy data helpers for AI taunts
// ═══════════════════════════════════════════════════════════════
function createDummyBattleState() {
  return {
    playerHP: health.value,
    playerMaxHP: 100,
    playerAttack: 1,
    playerDefense: 0,
    playerResistance: 0,
    playerMomentum: 0,
    playerIsDefending: false,
    enemyHP: 100,
    enemyMaxHP: 100,
    enemyAttack: 1,
    enemyDefense: 0,
    enemyResistance: 0,
    enemyMomentum: 0,
    enemyIsDefending: false,
    battleLog: ['The Gaze intensifies.'],
    playerAbilities: [],
    enemyAbilities: [],
    hand: [],
    turn: 'player',
    advantage: 0,
    canFlee: false,
    fleeAttempts: 0,
    playerStatusEffects: [],
    enemyStatusEffects: [],
    turnCount: 0,
    enemyTelegraphed: false,
    playerIntent: null,
    enemyIntent: 'attack',
    telegraphEffect: 'none',
    playerActionHistory: [],
    enemyActionHistory: [],
    enemyDelayTurns: 0,
  } as any;
}

function createDummyPlayerCard() {
  return {
    id: 'umbral_mite',
    name: 'Acolyte',
    type: 'entity',
    rarity: 'common',
    aspect: 'Void',
    image: '',
    frame: '',
    stats: { hp: 20, atk: 3, def: 1, res: 10, spd: 3, cun: 2, init: 3, loyalty: 70 },
    abilities: [],
  } as any;
}

function createDummyEnemyCard() {
  return {
    id: 'kalgoth_echo',
    name: 'Kalgoths Echo',
    type: 'entity',
    rarity: 'legendary',
    aspect: 'Void',
    image: '',
    frame: '',
    stats: { hp: 200, atk: 15, def: 10, res: 30, spd: 5, cun: 5, init: 10, loyalty: 0 },
    abilities: [],
  } as any;
}

export function getCurrentGazeIntensity(): number { return gazeIntensity.value; }
export function isGazeEventActive(): boolean { return isGazeActive.value; }