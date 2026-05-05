// js/ui/battle-config.ts – Shared battle types and enums used by the unified battle system.
// This is the rich BattleState that supports intents, telegraphing, combos, delays, and momentum.

import type { Card, EntityStats, EntityAbility } from '../data/cards.js';
import type { StatusEffect } from './battle-effects.js';  // re-using the same StatusEffect type

// Re‑export StatusEffect from battle‑effects for convenience
export type { StatusEffect } from './battle-effects.js';

export interface CardBattleConfig {
  enemyCard: Card;
  playerCard?: Card;
  advantage?: number;                     // positive = easier, negative = harder
  onVictory?: (choice: 'barter' | 'destroy' | 'ensnare') => void;
  onDefeat?: () => void;
  onFlee?: () => void;
  isMazeMinion?: boolean;                 // true if this is a maze minion encounter
}

/**
 * Complete state of a card battle.
 * Used by card-battle.ts and the AI (battle-ai.ts).
 */
export interface BattleState {
  // ── Core HP & Stats ────────────────────────────────────────────
  playerHP: number;
  playerMaxHP: number;
  playerAttack: number;
  playerDefense: number;
  playerResistance: number;
  playerInitiative: number;

  enemyHP: number;
  enemyMaxHP: number;
  enemyAttack: number;
  enemyDefense: number;
  enemyResistance: number;
  enemyInitiative: number;

  // ── Cards & Turn ───────────────────────────────────────────────
  hand: Card[];                           // spell cards available to cast
  turn: 'player' | 'enemy';              // whose turn it is
  battleLog: string[];                    // messages displayed in the log

  // ── Advantage & Fleeing ────────────────────────────────────────
  advantage: number;
  canFlee: boolean;
  fleeAttempts: number;

  // ── Abilities ──────────────────────────────────────────────────
  playerAbilities: EntityAbility[];
  enemyAbilities: EntityAbility[];

  // ── Status Effects ─────────────────────────────────────────────
  playerStatusEffects: StatusEffect[];
  enemyStatusEffects: StatusEffect[];

  // ── Turn Count ─────────────────────────────────────────────────
  turnCount: number;

  // ── Telegraphing (enemy behaviour hints) ───────────────────────
  enemyTelegraphed: boolean;              // whether a telegraph has been shown

  // ── Momentum (0‑3) ─────────────────────────────────────────────
  playerMomentum: number;
  enemyMomentum: number;

  // ── Defending state ────────────────────────────────────────────
  playerIsDefending: boolean;
  enemyIsDefending: boolean;

  // ── Tactical depth fields ──────────────────────────────────────
  playerIntent: 'attack' | 'defend' | 'skill' | 'feint' | null;
  enemyIntent:  'attack' | 'defend' | 'skill' | 'feint';
  telegraphEffect: 'none' | 'wind-up' | 'rune-glow' | 'stagger' | 'counter-ready';

  // ── Combo tracking (last 3 actions) ────────────────────────────
  playerActionHistory: ('attack' | 'defend' | 'skill' | 'spell')[];
  enemyActionHistory: ('attack' | 'defend' | 'skill' | 'spell')[];

  // ── Tempo control (delay turns for the enemy) ─────────────────
  enemyDelayTurns: number;
}