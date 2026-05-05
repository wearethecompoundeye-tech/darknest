// js/systems/summoning.ts – Cinematic summoning with particle storms, overlays, and lore integration.
// Uses the centralised particle system and spatial audio. Braided rite references removed.
// Kalgoth’s AI now taunts the player on summon failure via battle-ai.

import { batch } from '@preact/signals-core';
import {
  health, will, maxWill, suspicion, crafted, selectedRunes,
  circleQuality, ingredients, discoveries, tutorial, totalSummons,
  orbexFragments, masteryLevel, runeSlots,
  updateState, addMasteryXP, addFamiliarXP, discover, reduceQuota,
  advanceAction, autoSave, kalgothsNoose, circlePower,
  circleMastery, ownedCards, addCard, getActiveEntity,
  empoweredCircle, braidedTracePhases, kalgothsPower,
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { addLedgerEntry } from '../ui/ledger.js';
import { playSfx, stopLoop } from '../audio/sfx.js';
import { resetCircleAfterSummon } from '../minigames/circle-trace.js';
import { el } from '../core/dom-helper.js';
import { allCards, getCardById, type Card, type CardRarity } from '../data/cards.js';
import { getBarterReward } from './card-acquisition.js';
import { getPresenceSummonBonus } from './familiar-manager.js';
import { currentPhase, transition } from '../core/gameReducer.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type SummonVictoryPayload } from '../core/events.js';
import { ritualEngine } from './ritual-engine.js';
import { runeData } from '../data/runes.js';
import { runClashSequence } from '../ui/clash-sequence.js';
import { emitParticles } from '../ui/particle-system.js';
import { playSpatialSfx } from '../audio/spatial.js';
import { getKalgothAction } from '../ai/battle-ai.js'; // for defeat taunts

// ═══════════════════════════════════════════════════════════════
// Haptic feedback helper
// ═══════════════════════════════════════════════════════════════
function triggerHaptic(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ═══════════════════════════════════════════════════════════════
// Inject summon-specific styles once (kept from original)
// ═══════════════════════════════════════════════════════════════
export function injectSummonStyles() {
  if (document.getElementById('summon-upgrade-styles')) return;
  const s = document.createElement('style');
  s.id = 'summon-upgrade-styles';
  s.textContent = `
    @keyframes circlePulse {
      0%, 100% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.05); opacity: 1; }
    }
    .ritualCircle.summoning {
      animation: circlePulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 20px rgba(255, 0, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.3);
    }
    #summonWinOverlay {
      position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      border-radius: 12px; padding: 20px 40px; z-index: 999;
      box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
      text-align: center;
    }
    .glow-gold { animation: goldPulse 3s infinite; }
    @keyframes goldPulse { 0%,100% { opacity: 0.8; } 50% { opacity: 1; } }
    .shake { animation: screenShake 0.5s linear; }
    @keyframes screenShake {
      0%,100% { transform: translateX(0); }
      20% { transform: translateX(-10px); }
      40% { transform: translateX(10px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(s);
}

// ═══════════════════════════════════════════════════════════════
// Helper: aspect-specific flavour text
// ═══════════════════════════════════════════════════════════════
function getVictoryFlavor(choice: string, card: Card): string {
  const map: Record<string, string> = {
    Void:   "The void sighs. The creature disappears—yet watches.",
    Fire:   "The flames are tamed, but not extinguished.",
    Earth:  "A grumble of stone settles as the creature bows.",
    Air:    "The winds calm, leaving only the echo of vows.",
    Water:  "Its essence flows into your circle like a captured tide.",
    Life:   "Thorns retract and the bloom pledges loyalty.",
    Death:  "Silence reclaims the dead; a debt remains unpaid.",
  };
  return map[card.aspect] ?? "The ritual holds.";
}

// ═══════════════════════════════════════════════════════════════
// Rarity helpers
// ═══════════════════════════════════════════════════════════════
function rarityValue(r: CardRarity): number {
  const o: Record<CardRarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  return o[r] ?? 0;
}

function getAspectFromMeaning(meaning: string): string {
  const map: Record<string, string> = {
    Wealth:'Void', Strength:'Fire', Defense:'Earth', Wisdom:'Air',
    Journey:'Air', Torch:'Fire', Gift:'Life', Joy:'Life',
    Hail:'Water', Need:'Earth', Ice:'Water', Harvest:'Life',
    Water:'Water', Seed:'Life', Heritage:'Earth', Dawn:'Void'
  };
  return map[meaning] || 'Void';
}

function getLegendaryRarityFloor(fragments: number): CardRarity {
  if (fragments >= 6) return 'legendary';
  if (fragments >= 5) return 'epic';
  if (fragments >= 4) return 'rare';
  return 'uncommon';
}

function getRandomEntityCardByMinRarity(aspect: string, minRarity: CardRarity): Card {
  const pool = allCards.filter(
    c => c.type === 'entity' &&
         (c.aspect === aspect || c.aspect === 'All') &&
         rarityValue(c.rarity) >= rarityValue(minRarity)
  );
  return pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : allCards.find(c => c.type === 'entity' && c.rarity === 'common')!;
}

function getRandomEntityCard(aspect: string, tier: number): Card {
  const rarities: Record<number, CardRarity[]> = {
    1: ['common'],
    2: ['common', 'uncommon'],
    3: ['uncommon', 'rare', 'epic']
  };
  const allowed = rarities[tier] || ['common'];
  const pool = allCards.filter(
    c => c.type === 'entity' &&
         (c.aspect === aspect || c.aspect === 'All') &&
         allowed.includes(c.rarity)
  );
  return pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : allCards.find(c => c.type === 'entity' && c.rarity === 'common')!;
}

// ═══════════════════════════════════════════════════════════════
// Main summon entry – layered visual triggers
// ═══════════════════════════════════════════════════════════════
export async function summonEntity(): Promise<void> {
  injectSummonStyles();

  if (currentPhase.value.status === 'summoning') {
    addLog('Already summoning.', true);
    return;
  }
  if (currentPhase.value.status !== 'idle') {
    addLog('Cannot summon now.', true);
    return;
  }
  if (health.value <= 0) return;
  if (crafted.value.powderOfWarding < 1 || crafted.value.phialOfSubjugation < 1) {
    addLog('Missing components – perform the ritual first.', true);
    return;
  }
  if (selectedRunes.value.length === 0) {
    addLog('No pattern selected!', true);
    return;
  }
  if (circleQuality.value === 0) {
    addLog('The circle is untraced!', true);
    return;
  }

  // Determine tier and aspect, using empowered circle for legendary potential
  const isLegendary = empoweredCircle.value && orbexFragments.value >= 3;
  let tier: 1 | 2 | 3 = 1;
  let aspect = 'Void';
  const firstRune = selectedRunes.value[0];
  if (firstRune) {
    const rune = runeData.find(r => r.name === firstRune);
    if (rune) aspect = getAspectFromMeaning(rune.meaning);
  }

  let entityCard: Card;
  if (isLegendary) {
    const minRarity = getLegendaryRarityFloor(orbexFragments.value);
    entityCard = getRandomEntityCardByMinRarity(aspect, minRarity);
    tier = 3;
  } else {
    if (circlePower.value > 70 && orbexFragments.value >= 3) tier = 3;
    else if (circlePower.value > 40 || orbexFragments.value >= 1) tier = 2;
    entityCard = getRandomEntityCard(aspect, tier);
  }

  // Visual feedback BEFORE consuming components
  const ritualCircle = el('ritualCircle');
  if (ritualCircle) {
    ritualCircle.classList.add('summoning');
    emitParticles(ritualCircle, {
      type: 'runic',
      count: 60,
      duration: 800,
      velocity: 2.5,
    });
    playSfx('circleBegin', { loop: true, volume: 0.7 });
    setTimeout(() => {
      ritualCircle.classList.remove('summoning');
      stopLoop('circleBegin');
    }, 500);
  }

  // Legendary special effects
  if (isLegendary) {
    emitParticles(ritualCircle!, {
      type: 'void rift',
      count: 200,
      duration: 1500,
      velocity: 5.0,
    });
    playSfx('ritualRift', { volume: 1.2 });
  }

  batch(() => {
    crafted.value = {
      ...crafted.value,
      powderOfWarding: crafted.value.powderOfWarding - 1,
      phialOfSubjugation: crafted.value.phialOfSubjugation - 1,
    };
  });

  if (ritualCircle) {
    ritualCircle.classList.add('summon-animation');
    setTimeout(() => ritualCircle.classList.remove('summon-animation'), 600);
  }

  transition({ type: 'START_SUMMON', entityCardId: entityCard.id });

  try {
    const result = await runClashSequence(entityCard);
    if (result === 'victory') {
      handleSummonVictory(entityCard, 'ensnare', tier, isLegendary);
    } else {
      handleSummonDefeat(entityCard, tier);
    }
  } catch (err) {
    addLog('The summoning ritual collapses...', true);
    handleSummonDefeat(entityCard, tier);
  }
}

// ═══════════════════════════════════════════════════════════════
// Victory – cinematic overlay, flavour, haptics
// ═══════════════════════════════════════════════════════════════
function handleSummonVictory(
  enemyCard: Card,
  choice: 'barter' | 'destroy' | 'ensnare',
  tier: number,
  isLegendary: boolean
): void {
  batch(() => {
    totalSummons.value++;
    addFamiliarXP(5 + tier * 2);
    addMasteryXP(10 + tier * 3);
    kalgothsNoose.value = Math.max(0, kalgothsNoose.value - (isLegendary ? 10 : 5));
  });

  let powerReduction = 0;

  if (choice === 'ensnare') {
    addCard(enemyCard.id, 1);
    addLog(`🔮 ${enemyCard.name} bound to Grimoire!`, false, 'player');
    playSfx('captureDemon');
    addLedgerEntry('summon', { entityName: enemyCard.name, ensnared: true });
    powerReduction = tier;
  } else if (choice === 'destroy') {
    const ichorGain = 3 + tier * 2;
    const boneGain = 2 + tier;
    ingredients.value.demonIchor += ichorGain;
    ingredients.value.boneDust = (ingredients.value.boneDust || 0) + boneGain;
    addLog(`${enemyCard.name} destroyed. +${ichorGain} Ichor, +${boneGain} Bone Dust.`, false, 'player');
    playSfx('destroyDemon');
    addLedgerEntry('destroy', { entityName: enemyCard.name, ichor: ichorGain, bone: boneGain });
    powerReduction = tier * 2;
  } else {
    const lootCard = getBarterReward(enemyCard);
    addCard(lootCard.id, 1);
    addLog(`${enemyCard.name} offers ${lootCard.name} (${lootCard.rarity}).`, false, 'player');
    ingredients.value.demonIchor += 2 + tier;
    playSfx('bargainSecret');
    addLedgerEntry('bargain', { entityName: enemyCard.name, reward: lootCard.name, rarity: lootCard.rarity });
    powerReduction = 1;
  }

  kalgothsPower.value = Math.max(0, kalgothsPower.value - powerReduction);
  addLog(`Kalgoth’s power diminishes by ${powerReduction}. (${kalgothsPower.value}/100)`, false, 'orbex');

  // ── LORE FLAVOUR ──
  addLog(getVictoryFlavor(choice, enemyCard), false, 'system');

  // ── VICTORY OVERLAY ──
  const winOverlay = document.createElement('div');
  winOverlay.id = 'summonWinOverlay';
  winOverlay.innerHTML = `
    <div class="glow-gold">
      <h3>Victory</h3>
      <p>${enemyCard.name} bound to your grimoire</p>
      <div class="xp-bar"><div class="xp-fill" style="width: ${masteryLevel.value * 10}%"></div></div>
    </div>
  `;
  document.body.appendChild(winOverlay);
  setTimeout(() => winOverlay.remove(), 3500);

  // Haptics
  triggerHaptic([50, 30, 50, 30, 100]);

  if (isLegendary) {
    empoweredCircle.value = false;
    braidedTracePhases.value = 0;
    ritualEngine.resetAfterSummon();
  }

  gameBus.emit<SummonVictoryPayload>(GameEvents.SUMMON_VICTORY, { entityCard: enemyCard, choice, tier });

  if (!tutorial.value.firstSummon) {
    tutorial.value = { ...tutorial.value, firstSummon: true };
    addLog('📖 Tome updated: Entity Summoning.', false, 'system');
  }

  reduceQuota();
  if (currentPhase.value.status === 'summoning') transition({ type: 'SUMMON_COMPLETE' });
  advanceAction();
  resetCircleAfterSummon();
  autoSave();
}

// ═══════════════════════════════════════════════════════════════
// Defeat – screen shake, red flash, haptics, and Kalgoth taunt
// ═══════════════════════════════════════════════════════════════
function handleSummonDefeat(enemyCard: Card, tier: number): void {
  batch(() => {
    health.value = Math.max(0, health.value - (5 + tier * 2));
    will.value = Math.max(0, will.value - 10);
    kalgothsNoose.value = Math.min(100, kalgothsNoose.value + 10);
  });
  addLog(`💀 Summon fails! ${enemyCard.name} overwhelms you.`, true);
  playSfx('summonFail');

  // Kalgoth taunts via AI
  getKalgothAction({
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
    battleLog: [`Summoning failed.`],
    playerAbilities: [],
    enemyAbilities: [],
    hand: [],
    turn: 'enemy',
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
  }, {} as any, enemyCard).then(({ banter }) => {
    if (banter) {
      addLog(`KALGOTH: ${banter}`, false, 'void');
    }
  }).catch(() => {
    addLog('KALGOTH: *A distant, mocking laugh echoes.*', false, 'void');
  });

  if (health.value <= 0) {
    addLog('You perish...', true);
    alert('Game Over');
    document.body.style.pointerEvents = 'none';
  }

  // Screen shake + red flash
  document.body.classList.add('shake');
  document.body.style.background = 'radial-gradient(circle, red, transparent 60%)';
  triggerHaptic(200);
  setTimeout(() => {
    document.body.classList.remove('shake');
    document.body.style.background = '';
  }, 800);

  advanceAction();
  if (currentPhase.value.status === 'summoning') transition({ type: 'SUMMON_COMPLETE' });
  resetCircleAfterSummon();
  autoSave();
}

// ═══════════════════════════════════════════════════════════════
// Legacy stubs (optional; kept for compatibility)
// ═══════════════════════════════════════════════════════════════
export const summonDemon = summonEntity;
export function captureDemon() { addLog('Use battle to ensnare.', true); }
export function banishDemon() { addLog('Use Grimoire.', true); }
export function releaseDemon() { addLog('Use Grimoire.', true); }
export function destroyDemon() { addLog('Destroy during battle.', true); }
export function releaseCapturedDemon() {}
export function collectAsh() {}