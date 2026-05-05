// js/systems/familiar-manager.ts
// Balanced Whisp foraging with cooldown and strategic limitations
// Complete file - all Whisp abilities fully implemented

import { batch } from '@preact/signals-core';
import {
  lastForageTime,
  ingredients,
  familiar,
  totalExplorations,
  discoveries,
  tutorial,
  health,
  lastPetTime,
  maxWill,
  updateState,
  addFamiliarXP,
  modifyWhispMood,
  CONSTANTS,
  kalgothsNoose,
  circlePower,
  will
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { addLedgerEntry } from '../ui/ledger.js';
import { playSfx } from '../audio/sfx.js';

// === WHISP ABILITY BONUSES ===
export function getScoutBonus(): number {
  if (familiar.value.abilities.includes('scout')) {
    return 0.2; // +20% find bonus
  }
  return 0;
}

export function getWardBonus(): number {
  if (familiar.value.abilities.includes('ward')) {
    return 0.15; // -15% Noose gain
  }
  return 0;
}

export function getGuidanceBonus(): number {
  if (familiar.value.abilities.includes('guidance')) {
    return 0.2; // +20% trace success (larger hit zones)
  }
  return 0;
}

export function getPresenceBonus(): number {
  if (familiar.value.abilities.includes('presence')) {
    return 0.1; // +10% domination/summon chance
  }
  return 0;
}

// === FORAGE (primary safe resource method, with cooldown and Will cost) ===
export function forage(): void {
  const now = Date.now();
  if (now - lastForageTime.value < CONSTANTS.FORAGE_COOLDOWN) {
    const remaining = Math.ceil((CONSTANTS.FORAGE_COOLDOWN - (now - lastForageTime.value)) / 1000);
    addLog(`Whisp is tired. Cooldown: ${remaining}s`, true);
    return;
  }

  const willCost = 2;
  if (will.value < willCost) {
    addLog(`Not enough Will to focus Whisp (need ${willCost}).`, true);
    return;
  }

  batch(() => {
    will.value -= willCost;
    lastForageTime.value = now;

    const moodModifier = 0.5 + (familiar.value.mood / 200);
    const levelModifier = 1 + (familiar.value.level - 1) * 0.2;
    const scarcityModifier = Math.max(0.4, 1 - (totalExplorations.value * 0.01));
    const scoutBonus = 1 + getScoutBonus();

    const items = ["nightshadeMoss", "cryptPhlegm", "bansheeSalts"] as const;
    const weights = [0.5, 0.35, 0.15];
    const random = Math.random();
    let cum = 0;
    let reward: typeof items[number] = 'nightshadeMoss';
    for (let i = 0; i < items.length; i++) {
      cum += weights[i];
      if (random < cum) {
        reward = items[i];
        break;
      }
    }

    let amount = Math.floor((2 + Math.floor(Math.random() * 3)) * moodModifier * levelModifier * scarcityModifier * scoutBonus);
    amount = Math.max(1, amount);

    ingredients.value = {
      ...ingredients.value,
      [reward]: (ingredients.value[reward] || 0) + amount
    };

    if (!discoveries.value.ingredients.includes(reward)) {
      discoveries.value = {
        ...discoveries.value,
        ingredients: [...discoveries.value.ingredients, reward]
      };
    }

    let bonusText = '';
    if (getScoutBonus() > 0 && amount > 2) {
      bonusText = ' (Scout bonus applied)';
    }
    addLog(`Whisp returns with ${amount}x ${reward}!${bonusText}`, false, 'whisp');
    addFamiliarXP(2);
    modifyWhispMood(5);

    addLedgerEntry('explore', { items: `${amount}x ${reward}` });

    if (!tutorial.value.firstForage) {
      tutorial.value = { ...tutorial.value, firstForage: true };
      addLog('📖 Tome updated: Foraging.', false, 'system');
    }

    playSfx('wispForage');
  });
}

// === PET FAMILIAR ===
export function petFamiliar(): void {
  const now = Date.now();
  if (now - lastPetTime.value < 3600000) {
    addLog("Whisp is content and doesn't need more attention right now.", true);
    return;
  }

  batch(() => {
    lastPetTime.value = now;
    const oldLevel = familiar.value.level;
    addFamiliarXP(5);

    if (familiar.value.level >= 3) {
      const heal = 5 + familiar.value.level * 2;
      health.value = Math.min(100, health.value + heal);
      addLog(`Whisp nuzzles you affectionately, restoring ${heal} health.`, false, 'whisp');
    } else {
      addLog(`🐾 You pet Whisp. It chirps happily. +5 XP`, false, 'player');
    }

    if (familiar.value.level > oldLevel) {
      playSfx('wispLevelUp');
      addLog(`Whisp grew to level ${familiar.value.level}!`, false, 'whisp');
      if (familiar.value.level === 2) {
        addLog(`Whisp learned Ward: -15% Noose gain.`, false, 'whisp');
      } else if (familiar.value.level === 3) {
        addLog(`Whisp learned Guidance: +20% trace success.`, false, 'whisp');
      } else if (familiar.value.level === 4) {
        addLog(`Whisp learned Presence: +10% summon chance.`, false, 'whisp');
      }
    } else {
      playSfx('petWisp');
    }

    modifyWhispMood(10);
  });
}

// === APPLY WARD BONUS TO NOOSE INCREASES ===
export function applyWardNooseReduction(baseIncrease: number): number {
  const reduction = getWardBonus();
  return Math.max(1, Math.floor(baseIncrease * (1 - reduction)));
}

// === GET GUIDANCE BONUS FOR CIRCLE TRACE ===
export function getGuidanceHitZoneMultiplier(): number {
  return 1 + getGuidanceBonus();
}

// === GET PRESENCE BONUS FOR SUMMONING ===
export function getPresenceSummonBonus(): number {
  return getPresenceBonus();
}

export function getForageCooldownText(): string {
  const now = Date.now();
  const remaining = Math.max(0, CONSTANTS.FORAGE_COOLDOWN - (now - lastForageTime.value));
  if (remaining <= 0) return '';
  return `Cooldown: ${Math.ceil(remaining / 1000)}s`;
}

export function applyWhispDailyUpkeep(): void {
  const level = familiar.value.level;
  const mossNeeded = level * CONSTANTS.WHISP_MOSS_COST_PER_LEVEL;

  if (ingredients.value.nightshadeMoss >= mossNeeded) {
    ingredients.value = {
      ...ingredients.value,
      nightshadeMoss: ingredients.value.nightshadeMoss - mossNeeded
    };
    familiar.value = { ...familiar.value, mossConsumedToday: true };
    const healthRegen = level * CONSTANTS.WHISP_HEALTH_REGEN_PER_LEVEL;
    health.value = Math.min(100, health.value + healthRegen);
    addLog(`Whisp consumes ${mossNeeded} moss and restores ${healthRegen} health.`, false, 'whisp');
    modifyWhispMood(5);
  } else {
    familiar.value = { ...familiar.value, mossConsumedToday: false };
    modifyWhispMood(-20);
    addLog(`Whisp is hungry! Not enough moss. Mood -20.`, true);
  }
}