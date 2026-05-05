// js/ui/clash-sequence.ts – Cinematic clash → turn‑based battle sequence
// Used by summoning rituals to reveal the enemy and resolve the encounter.
// Orchestrates: loading the player card, clashing, opening the battle modal,
// and returning the final outcome.

import type { Card } from '../data/cards.js';
import { openCardBattleModal } from './card-battle.js';
import { stopLoop } from '../audio/sfx.js';
import { addLog } from './log-manager.js';

/**
 * Plays the full card‑clash cinematic and then launches the turn‑based battle.
 * Returns a promise that resolves with `'victory'` or `'defeat'` (flee counts as defeat).
 *
 * @param enemyCard - The card representing the summoned entity.
 * @returns The battle outcome.
 * @throws If no active player entity is equipped.
 */
export async function runClashSequence(enemyCard: Card): Promise<'victory' | 'defeat'> {
  // 1) Stop any stray battle music from a previous encounter.
  stopLoop('card_battle_music_bed');

  // 2) Dynamically import state‑signals to avoid circular dependencies.
  const { getActiveEntity } = await import('../core/state-signals.js');
  const playerCard = getActiveEntity();

  if (!playerCard) {
    addLog('No entity equipped – cannot fight.', true);
    throw new Error('No active entity equipped – cannot initiate battle.');
  }

  // 3) Wrap the callback‑driven battle modal in a promise so callers can await the result.
  return new Promise<'victory' | 'defeat'>((resolve) => {
    try {
      openCardBattleModal({
        enemyCard,
        playerCard,
        isMazeMinion: false,          // ritual battles are not maze minion encounters
        advantage: 0,                 // base value; may be enhanced by ritual bonuses
        onVictory: () => resolve('victory'),
        onDefeat: () => {
          addLog(`${playerCard.name} was defeated by ${enemyCard.name}.`, true);
          resolve('defeat');
        },
        onFlee: () => {
          addLog(`${playerCard.name} fled from the battle.`, true);
          resolve('defeat');          // fleeing counts as defeat for summoning rewards
        },
      });
    } catch (err) {
      addLog(`Battle modal could not be opened: ${err}`, true);
      resolve('defeat');               // treat failure to start as defeat
    }
  });
}