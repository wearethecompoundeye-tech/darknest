// ================================================================
// js/systems/battle-depth.ts
// ================================================================
// Rage system, Loyalty shifts, Binding Ritual, enhanced rewards
// Designed to deepen lore without rewriting the battle flow.

import { ingredients, orbexFragments, maxOrbexFragments, kalgothsNoose, addTrueNameFragment } from '../core/state-signals.js';
import { type Card, type EntityStats } from '../data/cards.js';
import { addLog } from '../ui/log-manager.js';

/** Accumulated power during Undercrypt battles; at max charges the next Strike is a critical hit. */
export class BattleRage {
  current = 0;
  max = 5;
  generate(amount: number): void { this.current = Math.min(this.max, this.current + amount); }
  /** Returns true if max rage was consumed (triggers critical). */
  consume(): boolean { if (this.current >= this.max) { this.current = 0; return true; } return false; }
  reset(): void { this.current = 0; }
}

/**
 * Calculates how much loyalty changes after taking damage or performing an action.
 * Returns a delta (positive or negative).
 */
export function calculateLoyaltyShift(entity: Card, damageTaken: number, isPlayerAction: boolean): number {
  const stats = entity.stats as EntityStats;
  let shift = 0;
  if (damageTaken > 10) shift -= 2;
  if (damageTaken > 20) shift -= 3;
  if (isPlayerAction) shift += 1; // entity trusts more when you fight
  return shift;
}

/**
 * Used for summoning battles: the enemy has Resistance instead of HP.
 * Reduce it to 0 to bind the entity.
 */
export class BindingRitual {
  resistance: number;
  maxResistance: number;
  constructor(baseResistance: number) {
    this.resistance = baseResistance;
    this.maxResistance = baseResistance;
  }
  reduce(amount: number): void { this.resistance = Math.max(0, this.resistance - amount); }
  isBound(): boolean { return this.resistance <= 0; }
}

/**
 * Grants resources and Orbex fragments after a battle, scaled by enemy tier and trait.
 * Call this when the player wins a battle (before victory options).
 */
export function grantBattleRewards(tier: number, enemyTrait: string, isSummoning: boolean): void {
  // Ichor
  let ichorGain = 3 + tier * 2;
  if (isSummoning) ichorGain += 2;
  ingredients.value = { ...ingredients.value, demonIchor: ingredients.value.demonIchor + ichorGain };

  // Bone dust
  ingredients.value = { ...ingredients.value, boneDust: (ingredients.value.boneDust || 0) + (2 + tier) };

  // Rare resources
  if (Math.random() < 0.2 + tier * 0.1) {
    ingredients.value = { ...ingredients.value, bansheeSalts: ingredients.value.bansheeSalts + 1 };
    addLog('The entity left behind a trace of banshee salts.', false, 'player');
  }

  // Orbex fragment from Shadow-touched enemies (Hollow Acolytes)
  if (enemyTrait === 'Shadow-touched' && Math.random() < 0.3) {
    orbexFragments.value = Math.min(maxOrbexFragments.value, orbexFragments.value + 1);
    addLog('A fragment of Orbex is reclaimed from the shattered Acolyte!', false, 'orbex');
  }

  // Noose reduction
  kalgothsNoose.value = Math.max(0, kalgothsNoose.value - 5);
}