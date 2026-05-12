// js/systems/summoning.ts – Refined summoning with ritual integration
// Uses circle trace quality, invoked runes, and offering result to compute advantage and will reduction.
// High‑quality visual particles, empowered circle support, and proper game‑state integration.

import { batch } from '@preact/signals-core';
import {
  health, will, maxWill, crafted, selectedRunes,
  circleQuality, ingredients, tutorial, totalSummons,
  orbexFragments, masteryLevel, runeSlots,
  addMasteryXP, addFamiliarXP, discover, reduceQuota,
  advanceAction, autoSave, kalgothsNoose, circlePower,
  circleMastery, ownedCards, addCard, getActiveEntity,
  empoweredCircle, braidedTracePhases, kalgothsPower,
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { addLedgerEntry } from '../ui/ledger.js';
import { playSfx, stopLoop } from '../audio/sfx.js';
import { resetCircleAfterSummon } from '../minigames/circle-trace.js';
import { allCards, getCardById, type Card, type CardRarity } from '../data/cards.js';
import { getBarterReward } from './card-acquisition.js';
import { currentPhase, transition } from '../core/gameReducer.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type SummonVictoryPayload } from '../core/events.js';
import { runeData } from '../data/runes.js';
import { openCardBattleModal } from '../ui/card-battle.js';
import { getKalgothAction } from '../ai/battle-ai.js';
import { emitParticles } from '../ui/particle-system.js';
import { setOfferingResult } from '../ritual/ritual-session.js';

// Re‑export injectSummonStyles for game.ts
export { injectSummonStyles };

// ═══════════════════════════════════════════════════════════════
// Inject summon‑specific styles (unchanged)
// ═══════════════════════════════════════════════════════════════
function injectSummonStyles() {
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
// Helpers
// ═══════════════════════════════════════════════════════════════
function getAspectFromMeaning(meaning: string): string {
  const map: Record<string, string> = {
    Wealth: 'Void', Strength: 'Fire', Defense: 'Earth', Wisdom: 'Air',
    Journey: 'Air', Torch: 'Fire', Gift: 'Life', Joy: 'Life',
    Hail: 'Water', Need: 'Earth', Ice: 'Water', Harvest: 'Life',
    Water: 'Water', Seed: 'Life', Heritage: 'Earth', Dawn: 'Void'
  };
  return map[meaning] || 'Void';
}

function rarityValue(r: CardRarity): number {
  const map: Record<CardRarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
  return map[r];
}

function pickEntityByRarity(aspect: string, minRarity: CardRarity): Card {
  const pool = allCards.filter(
    c => c.type === 'entity' && (c.aspect === aspect || c.aspect === 'All') &&
         rarityValue(c.rarity) >= rarityValue(minRarity)
  );
  return pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : allCards.find(c => c.type === 'entity' && c.rarity === 'common')!;
}

// ═══════════════════════════════════════════════════════════════
// Compute summon advantage from current ritual state
// ═══════════════════════════════════════════════════════════════
function computeSummonAdvantage(): { advantage: number; willReduction: number } {
  // Base from circle power (0‑100)
  const circleAdv = Math.floor(circlePower.value / 10); // 0‑10

  // Rune bonuses: each etched rune contributes its summonChance or dominationChance
  const etched = runeSlots.value.filter(r => r !== '');
  let runeAdv = 0;
  let willRed = 0;
  for (const runeName of etched) {
    const rune = runeData.find(r => r.name === runeName);
    if (!rune) continue;
    // The rune's effect is a general bonus string but we can extract numeric values
    // We'll use the rune's `bonus` function with count 1, assuming full quality for now
    const bonuses = rune.bonus(1); // count=1
    // Use summonChance and dominationChance as advantage
    if (bonuses.summonChance) runeAdv += bonuses.summonChance * 100; // convert to points
    if (bonuses.dominationChance) runeAdv += bonuses.dominationChance * 100;
    // Will reduction from some runes (e.g., Uruz has willRegen? but not directly)
    // For simplicity, use the rune's dominationChance as will reduction factor
    if (bonuses.dominationChance) willRed += bonuses.dominationChance * 5;
  }

  // Offering result (0‑1) gives up to 5 advantage
  const offeringAdv = Math.floor((window as any).__offeringQuality ?? 0.5 * 5);

  // Empowered circle grants extra
  const empoweredBonus = empoweredCircle.value ? 5 : 0;

  return {
    advantage: circleAdv + runeAdv + offeringAdv + empoweredBonus,
    willReduction: Math.min(10, willRed),
  };
}

// ═══════════════════════════════════════════════════════════════
// Main summon entry
// ═══════════════════════════════════════════════════════════════
export async function summonEntity(): Promise<void> {
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

  // Determine tier and aspect
  const isLegendary = empoweredCircle.value && orbexFragments.value >= 3;
  let aspect = 'Void';
  const firstRune = selectedRunes.value[0];
  if (firstRune) {
    const rune = runeData.find(r => r.name === firstRune);
    if (rune) aspect = getAspectFromMeaning(rune.meaning);
  }

  // Choose an entity to summon
  let entityCard: Card;
  if (isLegendary) {
    const minRarity = orbexFragments.value >= 6 ? 'legendary' : 'epic';
    entityCard = pickEntityByRarity(aspect, minRarity);
  } else {
    const rarityTier = circlePower.value > 70 ? 'rare' : (circlePower.value > 40 ? 'uncommon' : 'common');
    entityCard = pickEntityByRarity(aspect, rarityTier);
  }

  // Consume components
  batch(() => {
    crafted.value = {
      ...crafted.value,
      powderOfWarding: crafted.value.powderOfWarding - 1,
      phialOfSubjugation: crafted.value.phialOfSubjugation - 1,
    };
  });

  // Compute advantage from ritual
  const { advantage, willReduction } = computeSummonAdvantage();
  if (willReduction > 0) {
    will.value = Math.min(maxWill.value, will.value + willReduction);
  }

  // Visual feedback before battle
  const ritualCircle = document.getElementById('ritualCircle');
  if (ritualCircle) {
    emitParticles(ritualCircle, {
      type: 'runic',
      count: 60,
      duration: 800,
      velocity: 2.5,
    });
    playSfx('circleBegin', 0.4);
  }

  transition({ type: 'START_SUMMON', entityCardId: entityCard.id });

  // Open the unified battle modal (clash runs inside automatically)
  try {
    openCardBattleModal({
      enemyCard: entityCard,
      playerCard: getActiveEntity(),
      advantage, // pass the computed advantage
      isMazeMinion: false,
      onVictory: (choice) => handleSummonVictory(entityCard, choice, advantage),
      onDefeat: () => handleSummonDefeat(entityCard),
      onFlee: () => handleSummonDefeat(entityCard),
    });
  } catch (err) {
    addLog('The summoning ritual collapses...', true);
    handleSummonDefeat(entityCard);
  }
}

// ═══════════════════════════════════════════════════════════════
// Victory – distinct outcomes + tiered rewards
// ═══════════════════════════════════════════════════════════════
function handleSummonVictory(enemyCard: Card, choice: 'barter' | 'destroy' | 'ensnare', advantage: number): void {
  const isLegendary = enemyCard.rarity === 'legendary' || enemyCard.rarity === 'epic';
  const tier = isLegendary ? 3 : (enemyCard.rarity === 'rare' ? 2 : 1);

  batch(() => {
    totalSummons.value++;
    addFamiliarXP(5 + tier * 2);
    addMasteryXP(10 + tier * 3);
    kalgothsNoose.value = Math.max(0, kalgothsNoose.value - (isLegendary ? 10 : 5));
  });

  let powerReduction = 0;

  if (choice === 'ensnare') {
    // Add the entity card to owned cards (quantity 1)
    addCard(enemyCard.id, 1);
    addLog(`🔮 ${enemyCard.name} (${enemyCard.rarity}) bound to Grimoire!`, false, 'player');
    playSfx('captureDemon');
    addLedgerEntry('summon', { entityName: enemyCard.name, rarity: enemyCard.rarity, ensnared: true });
    powerReduction = tier;
  } else if (choice === 'destroy') {
    // Resource rewards: Ichor, Bone Dust, chance for rare mats
    const ichorGain = 3 + tier * 2;
    const boneGain = 2 + tier;
    ingredients.value.demonIchor += ichorGain;
    ingredients.value.boneDust = (ingredients.value.boneDust || 0) + boneGain;
    addLog(`${enemyCard.name} destroyed. +${ichorGain} Ichor, +${boneGain} Bone Dust.`, false, 'player');
    playSfx('destroyDemon');
    addLedgerEntry('destroy', { entityName: enemyCard.name, ichor: ichorGain, bone: boneGain });
    if (Math.random() < 0.4) {
      ingredients.value.bansheeSalts += 1;
      addLog(`The destruction leaves behind Banshee Salts.`, false, 'player');
    }
    powerReduction = tier * 2;
  } else if (choice === 'barter') {
    // Barter: enemy offers a card of its aspect, normally a spell or enhancement
    const lootCard = getBarterReward(enemyCard);
    if (lootCard) {
      addCard(lootCard.id, 1);
      addLog(`${enemyCard.name} offers ${lootCard.name} (${lootCard.rarity}).`, false, 'player');
      playSfx('bargainSecret');
      addLedgerEntry('bargain', { entityName: enemyCard.name, reward: lootCard.name, rarity: lootCard.rarity });
    } else {
      // Fallback: give ichor
      ingredients.value.demonIchor += 3;
      addLog(`${enemyCard.name} leaves behind Ichor.`, false, 'player');
    }
    powerReduction = 1;
  }

  kalgothsPower.value = Math.max(0, kalgothsPower.value - powerReduction);
  addLog(`Kalgoth's power diminishes by ${powerReduction}. (${kalgothsPower.value}/100)`, false, 'orbex');

  // Lore flavour
  const flavorText = getVictoryFlavor(choice, enemyCard);
  addLog(flavorText, false, 'system');

  // Tutorial
  if (!tutorial.value.firstSummon) {
    tutorial.value = { ...tutorial.value, firstSummon: true };
    addLog('📖 Tome updated: Entity Summoning.', false, 'system');
  }

  // Cleanup
  reduceQuota();
  if (currentPhase.value.status === 'summoning') transition({ type: 'SUMMON_COMPLETE' });
  advanceAction();
  // Reset offering result (global)
  setOfferingResult(0);
  resetCircleAfterSummon();
  autoSave();

  // Legendary summon resets empowerment
  if (isLegendary) {
    empoweredCircle.value = false;
    braidedTracePhases.value = 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// Defeat – heavy penalties
// ═══════════════════════════════════════════════════════════════
function handleSummonDefeat(enemyCard: Card): void {
  batch(() => {
    health.value = Math.max(0, health.value - 8);
    will.value = Math.max(0, will.value - 15);
    kalgothsNoose.value = Math.min(100, kalgothsNoose.value + 12);
  });
  addLog(`💀 Summon fails! ${enemyCard.name} overwhelms you.`, true);
  playSfx('summonFail');

  // Kalgoth taunt via AI (best effort)
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
    battleLog: ['Summoning failed.'],
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
  } as any, {} as any, enemyCard)
    .then(({ banter }) => {
      if (banter) addLog(`KALGOTH: ${banter}`, false, 'void');
    })
    .catch(() => {
      addLog('KALGOTH: *A distant, mocking laugh echoes.*', false, 'void');
    });

  if (health.value <= 0) {
    addLog('You perish...', true);
    alert('Game Over');
    document.body.style.pointerEvents = 'none';
  }

  // Screen shake visual
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 600);

  advanceAction();
  if (currentPhase.value.status === 'summoning') transition({ type: 'SUMMON_COMPLETE' });
  resetCircleAfterSummon();
  setOfferingResult(0);
  autoSave();
}

// ═══════════════════════════════════════════════════════════════
// Flavour text
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

// Keep legacy stubs for compatibility
export const summonDemon = summonEntity;
export function captureDemon() { addLog('Use battle to ensnare.', true); }
export function banishDemon() { addLog('Use Grimoire.', true); }
export function releaseDemon() { addLog('Use Grimoire.', true); }
export function destroyDemon() { addLog('Destroy during battle.', true); }
export function releaseCapturedDemon() {}
export function collectAsh() {}