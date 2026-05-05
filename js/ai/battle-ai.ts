// js/ai/battle-ai.ts – Kalgoth Enemy AI (LLM + deterministic fallback)
// Enhanced prompt to give Kalgoth a stronger, more personal presence.
// The AI is now aware of the player's will, noose, fragments, and phase,
// and generates taunts that feel appropriate to the context.

import { askOllama } from './ai-engine.js';
import type { BattleState } from '../ui/battle-config.js';
import type { Card, EntityStats } from '../data/cards.js';
import { will, maxWill, kalgothsNoose, circleMastery, orbexFragments, getActiveEntity } from '../core/state-signals.js';

export interface AIResponse {
  action: string;   // "attack", "defend", "ability:name", "spell:name"
  banter: string;
}

/**
 * Build a prompt that injects the player’s current ritual state and Kalgoth’s cruel personality.
 * The model is instructed to respond with a JSON object.
 */
function buildPrompt(state: BattleState, playerCard: Card, enemyCard: Card): string {
  const playerName = getActiveEntity()?.name ?? 'worm';
  const noose = kalgothsNoose.value;
  const fragments = orbexFragments.value;
  const mastery = circleMastery.value;

  // Make Kalgoth aware of the larger game context
  const contextLines = [
    `The player has ${will.value}/${maxWill.value} Will remaining.`,
    `Kalgoth's Noose is at ${noose}%.`,
    `They have reclaimed ${fragments}/${6} Orbex fragments.`,
    `Their Circle Mastery is level ${mastery}.`,
  ].join(' ');

  return `You are Kalgoth, the insane demigod that rules the Undercrypt. You speak with cruel delight, ancient weariness, and utter contempt for the pathetic acolyte known as "${playerName}". You control the entity "${enemyCard.name}" (${enemyCard.aspect}, ${enemyCard.rarity}) in a card duel against the Seventh Vowkeeper.

### Duel State
- Player Entity: ${playerCard.name} (${playerCard.aspect})
  HP: ${state.playerHP}/${state.playerMaxHP}  ATK: ${state.playerAttack}  DEF: ${state.playerDefense}
  Momentum: ${state.playerMomentum}/3  Defending: ${state.playerIsDefending ? 'Yes' : 'No'}
- Your Entity: ${enemyCard.name}
  HP: ${state.enemyHP}/${state.enemyMaxHP}  ATK: ${state.enemyAttack}  DEF: ${state.enemyDefense}
  Momentum: ${state.enemyMomentum}/3  Defending: ${state.enemyIsDefending ? 'Yes' : 'No'}
  Abilities: ${enemyCard.abilities?.map(a => a.name).join(', ') || 'none'}

### Greater Undercrypt
${contextLines}

### Recent Events (last 3 turns)
${state.battleLog.slice(-3).join('\n')}

### Rules (follow strictly)
1. Choose ONE action: "attack", "defend", or "ability:AbilityName". Use an ability only if it exists in the list above.
2. If the player has full momentum, you SHOULD defend to mock their overconfidence.
3. If your HP is low and you have a combat ability, use it.
4. Include a short, personal banter (max 80 characters). Address the acolyte by name, mention their failures, the Noose, the fragments, or your eternal gaze. Be vulgar, cruel, and pompous.
5. Respond ONLY with a JSON object: { "action": "...", "banter": "..." }

Your move, Kalgoth.`;
}

/**
 * Tries the LLM; if it fails, falls back to a deterministic AI.
 */
export async function getKalgothAction(
  state: BattleState,
  playerCard: Card,
  enemyCard: Card
): Promise<AIResponse> {
  try {
    const messages = [{ role: 'user', content: buildPrompt(state, playerCard, enemyCard) }];
    const raw = await askOllama(messages);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action: parsed.action || 'attack',
      banter: parsed.banter || '',
    };
  } catch (err) {
    // Fallback deterministic AI
    return {
      action: getFallbackAction(state, enemyCard),
      banter: getFallbackBanter(state, playerCard, enemyCard),
    };
  }
}

/* ── Fallback deterministic AI (now fully context‑aware) ─────── */
function getFallbackAction(state: BattleState, enemyCard: Card): string {
  // Defend if player has high momentum
  if (state.playerMomentum >= 2 && !state.enemyIsDefending) {
    return 'defend';
  }
  // Low HP and has a combat ability → use it
  if (state.enemyHP < state.enemyMaxHP * 0.3 && enemyCard.abilities && enemyCard.abilities.length > 0) {
    const combatAbility = enemyCard.abilities.find(a => a.type === 'combat');
    if (combatAbility) return `ability:${combatAbility.name}`;
  }
  // Otherwise defend 40% of the time
  if (Math.random() < 0.4) return 'defend';
  return 'attack';
}

/**
 * Generate a deterministic banter that references the game state.
 */
function getFallbackBanter(state: BattleState, playerCard: Card, enemyCard: Card): string {
  const playerName = getActiveEntity()?.name ?? 'worm';
  const noose = kalgothsNoose.value;
  const fragments = orbexFragments.value;

  const pool: string[] = [];

  // Noose‑themed taunts
  if (noose > 70) {
    pool.push(`"The Noose tightens, ${playerName}. Soon it will snap."`);
    pool.push(`"Can you feel the rope, little acolyte? ${noose}% and climbing."`);
  }
  if (noose < 20) {
    pool.push(`"You think a loose Noose means safety? I am patient."`);
  }

  // Fragment‑themed taunts
  if (fragments === 0) {
    pool.push(`"You have no fragments, ${playerName}. You are nothing."`);
  } else if (fragments < 3) {
    pool.push(`"Those scraps of Orbex won't save you."`);
  } else if (fragments < 6) {
    pool.push(`"You cling to fragments as if they matter. ${6 - fragments} remain, and I will reclaim them."`);
  }

  // Combat‑context taunts
  if (state.enemyHP < state.enemyMaxHP * 0.3) {
    pool.push(`"You've wounded ${enemyCard.name}… but I am eternal."`);
  }
  if (state.playerHP < state.playerMaxHP * 0.3) {
    pool.push(`"Your life flickers, ${playerName}. Soon I'll drink your soul."`);
  }
  if (state.playerMomentum >= 2) {
    pool.push(`"Overconfidence is a slow poison. Let me administer the cure."`);
  }

  // Generic cruel lines
  pool.push(`"I have broken stronger souls than yours, ${playerName}."`);
  pool.push(`"The Gaze will feast on your failure."`);
  pool.push(`"You are unworthy of the Spire."`);
  pool.push(`"${enemyCard.name} shows you true power."`);
  pool.push(`"Kneel, and I might let you keep a finger."`);

  return pool[Math.floor(Math.random() * pool.length)];
}