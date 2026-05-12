// js/ai/battle-ai.ts – Kalgoth’s battle AI
// Uses the full BattleState to produce dynamic actions and atmospheric banter.
// Returns an object { action: string, banter?: string }.
// Action can be: "attack", "defend", "ability:AbilityName"

import type { Card, EntityAbility, EntityStats } from '../data/cards.js';

interface BattleStateForAI {
  playerHP: number;
  playerMaxHP: number;
  playerAttack: number;
  playerDefense: number;
  playerResistance: number;
  playerMomentum: number;
  playerIsDefending: boolean;
  enemyHP: number;
  enemyMaxHP: number;
  enemyAttack: number;
  enemyDefense: number;
  enemyResistance: number;
  enemyMomentum: number;
  enemyIsDefending: boolean;
  battleLog: string[];
  playerAbilities: EntityAbility[];
  enemyAbilities: EntityAbility[];
  hand: Card[];
  turn: 'player' | 'enemy';
  advantage: number;
  canFlee: boolean;
  fleeAttempts: number;
  playerStatusEffects: any[];
  enemyStatusEffects: any[];
  turnCount: number;
  enemyTelegraphed: boolean;
  playerIntent: string | null;
  enemyIntent: string;
  telegraphEffect: string;
  playerActionHistory: string[];
  enemyActionHistory: string[];
  enemyDelayTurns: number;
}

// Banter pools for different situations
const BANTER = {
  attack: [
    "You cannot hide from my gaze.",
    "Your flesh is weak, but your will is weaker.",
    "Strike! Rend!",
    "This world is mine.",
    "Feel the weight of the void.",
  ],
  defend: [
    "Even my shadow shields itself.",
    "You dare strike? I brace.",
    "Your blows are but echoes.",
  ],
  taunt: [
    "The circle trembles. Do you?",
    "I have broken greater souls than yours.",
    "The Sneeze still echoes here. Do you hear it?",
    "Your ancestors failed. So will you.",
  ],
  lowHealthEnemy: [
    "Impressive… but futile.",
    "You wound me? I shall remember this.",
    "Pain is a distant friend. It will return to you.",
  ],
  lowHealthPlayer: [
    "You stagger. Good.",
    "Your essence is almost mine.",
    "One more push, and you join the acolytes.",
  ],
  criticalIncoming: [
    "I will shatter you.",
    "Behold true darkness!",
    "This blow shall be legend.",
  ],
  victory: [
    "As expected.",
    "Another soul for the Gaze.",
    "The ritual grows stronger.",
  ],
  defeat: [
    "No! This cannot be!",
    "A temporary setback…",
    "The Gaze… falters?",
  ],
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Main AI function
export async function getKalgothAction(
  state: BattleStateForAI,
  playerCard: Card,
  enemyCard: Card,
): Promise<{ action: string; banter?: string }> {
  const hpPct = state.enemyHP / state.enemyMaxHP;
  const playerHpPct = state.playerHP / state.playerMaxHP;

  // Determine if we should banter (chance 30%)
  let banter: string | undefined;
  if (Math.random() < 0.3) {
    // Pick a banter based on situation
    if (hpPct < 0.3) {
      banter = pick(BANTER.lowHealthEnemy);
    } else if (playerHpPct < 0.3) {
      banter = pick(BANTER.lowHealthPlayer);
    } else {
      banter = pick(BANTER.taunt);
    }
  }

  // Tactical decision making
  // 1. If enemy has a combat ability not on cooldown and condition met, use it.
  const combatAbilities = state.enemyAbilities.filter(
    a => a.type === 'combat' && a.trigger !== 'passive' && (!a.cooldown || (a.cooldown && Math.random() < 0.4))
  );

  // Priority: if player is low and we have a high-damage ability, use it.
  if (playerHpPct < 0.4 && combatAbilities.length > 0) {
    const ability = combatAbilities[Math.floor(Math.random() * combatAbilities.length)];
    return { action: `ability:${ability.name}`, banter };
  }

  // 2. If player has high momentum, defend (to counter their upcoming big hit)
  if (state.playerMomentum >= 2 && !state.enemyIsDefending && Math.random() < 0.7) {
    return { action: 'defend', banter: banter || pick(BANTER.defend) };
  }

  // 3. If enemy is low HP, become more aggressive or self-preserve
  if (hpPct < 0.25) {
    // Try to heal via ability if available
    const healAbility = combatAbilities.find(a => a.name.toLowerCase().includes('heal') || a.name.toLowerCase().includes('drain'));
    if (healAbility) {
      return { action: `ability:${healAbility.name}`, banter: banter || pick(BANTER.lowHealthEnemy) };
    }
    // Otherwise, attack recklessly
    return { action: 'attack', banter: banter || pick(BANTER.lowHealthEnemy) };
  }

  // 4. Occasionally defend if not already, to build momentum or reduce damage
  if (!state.enemyIsDefending && Math.random() < 0.2) {
    return { action: 'defend', banter };
  }

  // 5. If we have a combat ability, sometimes use it
  if (combatAbilities.length > 0 && Math.random() < 0.35) {
    const ability = combatAbilities[Math.floor(Math.random() * combatAbilities.length)];
    return { action: `ability:${ability.name}`, banter };
  }

  // 6. Default: attack
  return { action: 'attack', banter: banter || pick(BANTER.attack) };
}