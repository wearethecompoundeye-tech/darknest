// js/systems/ritual-engine.ts – Complete ritual engine with reactive score.
// Braided rite references removed; only the actions that are actually used remain.
// Flow multiplier, combo detection, and affinity bonuses feed into summoning advantage.

import { signal } from '@preact/signals-core';

export type RitualAction = 'grind' | 'brew' | 'study' | 'etch' | 'trace';

interface RitualEntry {
  action: RitualAction;
  quality: number;          // 0‑1
  timestamp: number;
  rune?: string;
}

// Combo chains: if the last N actions match one of these sequences, a bonus multiplier is applied.
const COMBO_CHAINS: { sequence: RitualAction[]; bonus: string; multiplier: number }[] = [
  { sequence: ['grind', 'brew', 'trace'],              bonus: 'Standard Preparation',    multiplier: 1.2 },
  { sequence: ['grind', 'brew', 'study', 'etch', 'trace'], bonus: "Scholar's Rite",    multiplier: 1.4 },
  { sequence: ['trace', 'etch', 'study'],               bonus: 'Runic Insight',          multiplier: 1.15 },
  { sequence: ['brew', 'grind', 'trace'],               bonus: "Alchemist's Flow",       multiplier: 1.25 },
  { sequence: ['study', 'etch', 'trace'],               bonus: 'Quickened Invocation',   multiplier: 1.1 },
];

// Rune affinities: each known rune contributes a flat bonus to summon chance and will reduction.
const RUNE_AFFINITIES: Record<string, { summonChance: number; willRegen: number }> = {
  Fehu:     { summonChance: 2, willRegen: 0 },
  Uruz:     { summonChance: 0, willRegen: 1 },
  Thurisaz: { summonChance: 1, willRegen: 1 },
  Ansuz:    { summonChance: 0, willRegen: 2 },
  Dagaz:    { summonChance: 3, willRegen: 0 },
};

export class RitualEngine {
  history: RitualEntry[] = [];
  combosAchieved: string[] = [];
  affinityCounts: Record<string, number> = {};
  lastActionTime = 0;
  flowMultiplier = 1.0;

  // A signal‑based score used by the Gem Meter and summon bonuses.
  score = signal(0);

  /**
   * Record a ritual action. Updates history, flow multiplier, combo detection,
   * rune affinity tracking, and recalculates the score.
   *
   * @param action    The type of ritual action.
   * @param quality   A number 0‑1 indicating how well the action was performed.
   * @param runeName  (Optional) The rune used in an etching action.
   */
  recordAction(action: RitualAction, quality: number, runeName?: string): void {
    const now = Date.now();
    const entry: RitualEntry = { action, quality, timestamp: now, rune: runeName };

    this.history.push(entry);
    // Keep only the last 10 actions for combo detection.
    if (this.history.length > 10) this.history.shift();

    // Flow multiplier: increases if actions happen quickly, decays otherwise.
    if (now - this.lastActionTime < 8000) {
      this.flowMultiplier = Math.min(2.0, this.flowMultiplier + 0.1);
    } else {
      this.flowMultiplier = Math.max(1.0, this.flowMultiplier - 0.15);
    }
    this.lastActionTime = now;

    // Rune affinity tracking (for etched runes).
    if (runeName) {
      this.affinityCounts[runeName] = (this.affinityCounts[runeName] || 0) + 1;
    }

    // Combo detection: check if the last actions match any known sequence.
    const recentActions = this.history.map(e => e.action);
    for (const chain of COMBO_CHAINS) {
      if (this.combosAchieved.includes(chain.bonus)) continue; // already earned
      if (recentActions.length >= chain.sequence.length) {
        const tail = recentActions.slice(-chain.sequence.length);
        if (tail.every((a, i) => a === chain.sequence[i])) {
          this.combosAchieved.push(chain.bonus);
          console.log(`[Ritual] Combo achieved: ${chain.bonus}`);
        }
      }
    }

    this.recalcScore();
  }

  private recalcScore(): void {
    let s = 0;

    // Base score from the last 5 actions' quality.
    const recent = this.history.slice(-5);
    s += recent.reduce((sum, e) => sum + e.quality * 12, 0);

    // Combo multiplier: multiply all achieved combo multipliers.
    const comboMults = this.combosAchieved
      .map(c => COMBO_CHAINS.find(ch => ch.bonus === c)?.multiplier ?? 1.0);
    const comboMult = comboMults.reduce((a, b) => a * b, 1.0);

    // Rune affinity bonuses.
    for (const rune of Object.keys(this.affinityCounts)) {
      const aff = RUNE_AFFINITIES[rune];
      if (aff) s += this.affinityCounts[rune] * 2;
    }

    // Apply flow and combo multipliers, cap at 100.
    s *= this.flowMultiplier * comboMult;
    this.score.value = Math.min(100, Math.floor(s));
  }

  /**
   * Calculate the summon advantage and will reduction based on the current ritual state.
   */
  getSummonBonus(): { advantage: number; willReduction: number } {
    let advantage = 0;
    let willReduction = 0;

    // Score contributes to advantage.
    advantage += Math.floor(this.score.value / 4);

    // Rune‑based will reduction.
    const willRunes = ['Uruz', 'Ansuz'];
    for (const r of willRunes) {
      if (this.affinityCounts[r]) willReduction += this.affinityCounts[r];
    }

    return {
      advantage,
      willReduction: Math.min(10, willReduction),
    };
  }

  /**
   * Reset combo state after a successful summon or rite.
   */
  resetAfterSummon(): void {
    this.combosAchieved = [];
    this.flowMultiplier = 1.0;
    this.lastActionTime = 0;
    // Keep affinity counts (they represent permanent knowledge).
    this.recalcScore();
  }
}

export const ritualEngine = new RitualEngine();