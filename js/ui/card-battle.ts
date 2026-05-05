// js/ui/card-battle.ts – Unified battle system with Kalgoth AI, rich state, base HP, combos, rage.
// All tactical systems are integrated. No dependencies on dead battle-actions.ts.

import {
  will, maxWill, getEquippedCards, getActiveEntity, addMasteryXP,
  circleMastery, orbexFragments, addCard, ingredients, ownedCards
} from '../core/state-signals.js';
import { getCardById, type Card, type EntityStats, type SpellStats, type EntityAbility } from '../data/cards.js';
import { el } from '../core/dom-helper.js';
import { playSfx, startLoop, stopLoop, stopSfx } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
import { triggerScreenPulse } from './ui-renderer.js';
import {
  applyAbility, applyPassiveAbility, applyTriggeredAbility,
  processStatusEffects, calculateDamage,
  type CombatContext
} from '../systems/ability-engine.js';
import {
  getEnhancedStats, checkForCombos, getAspectSynergyBonus
} from '../systems/card-progression.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type BattleClashPayload, type BattleEndPayload } from '../core/events.js';
import { CardClashAnimation, isClashEnabled } from './battle-clash.js';
import { BattleEffects } from './battle-effects.js';
import { BattleRage, grantBattleRewards } from '../systems/battle-depth.js';
import { getKalgothAction } from '../ai/battle-ai.js';
import type { BattleState, StatusEffect, CardBattleConfig } from './battle-config.js';
import { AttackEffects } from './attack-effects.js';   // centralised attack visuals

export type { CardBattleConfig } from './battle-config.js';

let currentConfig: CardBattleConfig | null = null;
let battleState: BattleState | null = null;
let battleModal: HTMLDivElement | null = null;
let combatContext: CombatContext | null = null;
let battleFx: BattleEffects | null = null;
const playerRage = new BattleRage();
const enemyRage = new BattleRage();
let isSummoningBattle = false;

// ── CSS injection (unchanged) ──
(function injectBattleStyles() {
  if (document.getElementById('battle-enhancements')) return;
  const style = document.createElement('style');
  style.id = 'battle-enhancements';
  style.textContent = `
    @keyframes intentPulse { 0%,100%{ opacity:0.8; } 50%{ opacity:1; } }
    #intentPreview { animation: intentPulse 1.5s ease-in-out infinite; }
    .status-defending { box-shadow: 0 0 0 4px rgba(60,120,200,0.5); filter: drop-shadow(0 0 8px rgba(60,120,200,0.4)); animation: pulseBorder 2s ease-in-out infinite; }
    @keyframes pulseBorder { 0%,100%{ filter: drop-shadow(0 0 8px rgba(60,120,200,0.4)); } 50%{ filter: drop-shadow(0 0 16px rgba(60,120,200,0.7)); } }
    .status-wind-up { box-shadow: 0 0 0 4px rgba(255,165,0,0.7); }
    .status-counter-ready { box-shadow: 0 0 0 4px rgba(255,69,0,0.8); }
  `;
  document.head.appendChild(style);
})();

// ── Main Battle Modal ─────────────────────────────────────────────────
export async function openCardBattleModal(config: CardBattleConfig): Promise<void> {
  currentConfig = config;
  isSummoningBattle = !config.isMazeMinion;
  const playerCard = config.playerCard || getActiveEntity();
  if (!playerCard) throw new Error('No player card');
  const enemyCard = config.enemyCard;

  const playerStats = playerCard.stats as EntityStats;
  const enemyStats = enemyCard.stats as EntityStats;
  const adv = config.advantage ?? 0;

  const masteryLevel = circleMastery.value;
  const fragmentCount = orbexFragments.value;
  const difficultyMod = 1 + (masteryLevel * 0.12) + (fragmentCount * 0.18);

  // Base HP buffer for new players
  const pBaseHP = 8 + (playerStats?.hp || 20) + (adv > 0 ? Math.floor(adv / 2) : 0);
  const pAtk = (playerStats?.atk || 3) + (adv > 0 ? Math.floor(adv / 3) : 0);
  const eBaseHP = Math.floor((enemyStats?.hp || 15) * difficultyMod) + (adv < 0 ? Math.floor(-adv / 2) : 0);
  const eAtk = Math.floor((enemyStats?.atk || 3) * difficultyMod) + (adv < 0 ? Math.floor(-adv / 3) : 0);

  battleState = {
    playerHP: pBaseHP, playerMaxHP: pBaseHP,
    playerAttack: pAtk, playerDefense: playerStats?.def || 0,
    playerResistance: playerStats?.res || 0, playerInitiative: playerStats?.init || 3,
    enemyHP: eBaseHP, enemyMaxHP: eBaseHP,
    enemyAttack: eAtk, enemyDefense: enemyStats?.def || 0,
    enemyResistance: enemyStats?.res || 0, enemyInitiative: enemyStats?.init || 3,
    hand: getEquippedCards('spell').slice(0, 3),
    turn: (playerStats?.init || 3) >= (enemyStats?.init || 3) ? 'player' : 'enemy',
    battleLog: [`${enemyCard.name} appears!`],
    advantage: adv, canFlee: config.isMazeMinion || false, fleeAttempts: 0,
    playerAbilities: (playerCard.abilities || []) as EntityAbility[],
    enemyAbilities: (enemyCard.abilities || []) as EntityAbility[],
    playerStatusEffects: [], enemyStatusEffects: [],
    turnCount: 0,
    enemyTelegraphed: false,
    playerMomentum: 0,
    enemyMomentum: 0,
    playerIsDefending: false,
    enemyIsDefending: false,
    playerIntent: null,
    enemyIntent: 'attack',
    telegraphEffect: 'none',
    playerActionHistory: [],
    enemyActionHistory: [],
    enemyDelayTurns: 0,
  };

  combatContext = {
    playerHP: battleState.playerHP, playerMaxHP: battleState.playerMaxHP,
    playerAttack: battleState.playerAttack, playerDefense: battleState.playerDefense,
    playerResistance: battleState.playerResistance,
    enemyHP: battleState.enemyHP, enemyMaxHP: battleState.enemyMaxHP,
    enemyAttack: battleState.enemyAttack, enemyDefense: battleState.enemyDefense,
    enemyResistance: battleState.enemyResistance,
    playerEffects: [], enemyEffects: [], battleLog: battleState.battleLog,
  };

  playerRage.reset();
  enemyRage.reset();

  gameBus.emit<BattleClashPayload>(GameEvents.BATTLE_CLASH_START, { playerCard, enemyCard });

  if (isClashEnabled()) {
    const clash = new CardClashAnimation();
    await clash.play(playerCard, enemyCard);
  }

  if (battleModal) battleModal.remove();
  battleModal = createBattleModal(playerCard, enemyCard);
  document.body.appendChild(battleModal);
  battleModal.style.display = 'flex';

  battleFx = new BattleEffects();
  battleFx.init();

  renderBattleUI(playerCard, enemyCard);
  gameBus.emit<BattleEndPayload>(GameEvents.BATTLE_END, { result: 'victory', playerCard, enemyCard }); // dummy? not needed – remove later if not used
  // Bind HP bars
  const pBar = document.getElementById('playerHPBar');
  const eBar = document.getElementById('enemyHPBar');
  if (pBar && eBar) battleFx.bindHpBars(pBar, eBar);

  battleFx.showTurnBanner(battleState.turn === 'player' ? 'YOUR TURN' : 'ENEMY TURN');
  playSfx('duel_start');

  if (battleState.turn === 'enemy') setTimeout(() => enemyTurn(), 600);
}

function createBattleModal(playerCard: Card, enemyCard: Card): HTMLDivElement {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'cardBattleModal';
  Object.assign(modal.style, {
    position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0.95)',
    backdropFilter: 'blur(12px)', zIndex: '2500', display: 'flex',
    justifyContent: 'center', alignItems: 'center'
  });
  modal.innerHTML = `
    <div class="battle-content" style="max-width:1200px; width:95%; height:85vh; background:#0a0508; border:2px solid #6a4a3a; border-radius:24px; padding:20px; box-shadow:0 0 0 1px #8a7a5a inset, 0 20px 40px #000; color:#e0d8cc; display:flex; flex-direction:column; gap:16px;">
      <h3 style="margin:0; color:#b8a890; text-align:center; font-size:1.6rem;">⚔️ CARD BATTLE ⚔️</h3>
      <div id="intentPreview" style="text-align:center; font-size:0.85rem; color:#ffd700; height:24px;"></div>
      <div style="display:flex; gap:30px; flex:1; align-items:center; justify-content:center;">
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div id="playerCardDisplay" style="width:200px;"></div>
          <div style="font-weight:bold;">${playerCard.name}</div>
          <div class="progress-bar" style="width:200px; height:14px; margin:4px 0;"><div id="playerHPBar" class="progress-fill" style="width:100%; background:#7ea04b;"></div></div>
          <span id="playerHPText">HP: ${battleState?.playerHP}/${battleState?.playerMaxHP}</span>
          <div style="width:200px; margin-top:4px;"><div id="playerRageBar" style="height:8px; background:#2a1a1a; border-radius:4px;"><div id="playerRageFill" style="width:0%; height:100%; background:linear-gradient(90deg,#ff6a2a,#ffd700); border-radius:4px; transition:width 0.3s;"></div></div><span id="playerRageText">Rage: 0/5</span></div>
          <div style="width:200px; margin-top:4px;"><div id="playerMomentumBar" style="height:8px; background:#1a2a1a; border-radius:4px;"><div id="playerMomentumFill" style="width:0%; height:100%; background:linear-gradient(90deg,#4a90d9,#a0d0ff); border-radius:4px; transition:width 0.3s;"></div></div><span id="playerMomentumText">Momentum: 0/3</span></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <button id="attackBtn" class="craft-btn">⚔️ Attack</button>
          <button id="defendBtn" class="craft-btn">🛡️ Defend</button>
          <button id="abilityBtn" class="craft-btn">✨ Ability</button>
          <button id="fleeBtn" class="craft-btn">🏃 Flee</button>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div id="enemyCardDisplay" style="width:200px;"></div>
          <div style="font-weight:bold;">${enemyCard.name}</div>
          <div class="progress-bar" style="width:200px; height:14px; margin:4px 0;"><div id="enemyHPBar" class="progress-fill" style="width:100%; background:#8a3a3a;"></div></div>
          <span id="enemyHPText">HP: ${battleState?.enemyHP}/${battleState?.enemyMaxHP}</span>
          <div style="width:200px; margin-top:4px;"><div id="enemyRageBar" style="height:8px; background:#2a1a1a; border-radius:4px;"><div id="enemyRageFill" style="width:0%; height:100%; background:linear-gradient(90deg,#ff6a2a,#ffd700); border-radius:4px; transition:width 0.3s;"></div></div><span id="enemyRageText">Rage: 0/5</span></div>
        </div>
      </div>
      <div id="spellHand" style="display:flex; gap:10px; justify-content:center; margin:8px 0;"></div>
      <div id="battleLog" style="padding:8px; background:rgba(0,0,0,0.5); border:1px solid #5a4a3a; border-radius:12px; height:70px; overflow-y:auto; font-size:0.85rem;"></div>
      <div style="text-align:center; color:#a09080; font-size:0.85rem;">Will: ${will.value}/${maxWill.value} | Turn: <span id="turnIndicator">Player</span></div>
    </div>
  `;
  modal.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => playSfx('uiClick')));
  modal.querySelector('#attackBtn')!.addEventListener('click', () => handleAttack(playerCard, enemyCard));
  modal.querySelector('#defendBtn')!.addEventListener('click', handleDefend);
  modal.querySelector('#abilityBtn')!.addEventListener('click', () => handleAbility(playerCard, enemyCard));
  modal.querySelector('#fleeBtn')!.addEventListener('click', handleFlee);
  return modal;
}

// ── UI update functions ──
function updateStatDisplays(): void {
  if (!battleState) return;
  const pctP = (battleState.playerHP / battleState.playerMaxHP) * 100;
  const pctE = (battleState.enemyHP / battleState.enemyMaxHP) * 100;
  document.getElementById('playerHPBar')!.style.width = `${pctP}%`;
  document.getElementById('enemyHPBar')!.style.width = `${pctE}%`;
  document.getElementById('playerHPText')!.textContent = `HP: ${battleState.playerHP}/${battleState.playerMaxHP}`;
  document.getElementById('enemyHPText')!.textContent = `HP: ${battleState.enemyHP}/${battleState.enemyMaxHP}`;
  battleFx?.setPlayerHp(pctP);
  battleFx?.setEnemyHp(pctE);
}

function updateRageBars(): void {
  document.getElementById('playerRageFill')!.style.width = `${(playerRage.current / playerRage.max) * 100}%`;
  document.getElementById('playerRageText')!.textContent = `Rage: ${playerRage.current}/${playerRage.max}`;
  document.getElementById('enemyRageFill')!.style.width = `${(enemyRage.current / enemyRage.max) * 100}%`;
  document.getElementById('enemyRageText')!.textContent = `Rage: ${enemyRage.current}/${enemyRage.max}`;
}

function updateMomentumBars(): void {
  document.getElementById('playerMomentumFill')!.style.width = `${(battleState!.playerMomentum / 3) * 100}%`;
  document.getElementById('playerMomentumText')!.textContent = `Momentum: ${battleState!.playerMomentum}/3`;
}

function updateIntentPreview(): void {
  const div = document.getElementById('intentPreview');
  if (!div || !battleState) return;
  const playerIntent = battleState.playerIntent ?? 'none';
  let enemyText = 'waiting';
  if (battleState.telegraphEffect === 'wind-up') enemyText = '⚡ Heavy Strike incoming!';
  else if (battleState.telegraphEffect === 'counter-ready') enemyText = '🛡️ Enemy is bracing';
  div.textContent = `You plan: ${playerIntent} | ${enemyText}`;
}

function renderBattleUI(playerCard: Card, enemyCard: Card): void {
  if (!battleState) return;
  updateStatDisplays();
  updateRageBars();
  updateMomentumBars();
  updateIntentPreview();

  const playerCardDisplay = document.getElementById('playerCardDisplay');
  const enemyCardDisplay = document.getElementById('enemyCardDisplay');
  if (playerCardDisplay) playerCardDisplay.innerHTML = `<div class="battle-card" style="width:200px; aspect-ratio:3/4; border-radius:12px; overflow:hidden;"><img src="${playerCard.image}" style="width:100%; height:100%; object-fit:cover;"><img src="${playerCard.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>`;
  if (enemyCardDisplay) enemyCardDisplay.innerHTML = `<div class="battle-card" style="width:200px; aspect-ratio:3/4; border-radius:12px; overflow:hidden;"><img src="${enemyCard.image}" style="width:100%; height:100%; object-fit:cover;"><img src="${enemyCard.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"></div>`;

  const playerCardEl = playerCardDisplay?.querySelector('.battle-card') as HTMLElement;
  const enemyCardEl = enemyCardDisplay?.querySelector('.battle-card') as HTMLElement;
  if (playerCardEl && enemyCardEl) {
    playerCardEl.classList.remove('status-defending', 'status-wind-up', 'status-counter-ready');
    enemyCardEl.classList.remove('status-defending', 'status-wind-up', 'status-counter-ready');
    if (battleState.playerIsDefending) playerCardEl.classList.add('status-defending');
    if (battleState.telegraphEffect === 'wind-up') enemyCardEl.classList.add('status-wind-up');
    if (battleState.telegraphEffect === 'counter-ready') enemyCardEl.classList.add('status-counter-ready');
  }

  // spell hand
  const handEl = document.getElementById('spellHand');
  if (handEl) {
    handEl.innerHTML = '';
    battleState.hand.forEach((spell, idx) => {
      const spellEl = document.createElement('div');
      spellEl.style.cssText = 'width:60px; aspect-ratio:3/4; border-radius:8px; overflow:hidden; cursor:pointer; position:relative; transition:transform 0.15s;';
      spellEl.innerHTML = `<img src="${spell.image}" style="width:100%; height:100%; object-fit:cover;"><img src="${spell.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; object-fit:contain;"><div style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); padding:1px 4px; border-radius:6px; font-size:0.6rem; color:#e0d8cc;">${(spell.stats as SpellStats).cost}W</div>`;
      spellEl.addEventListener('click', () => handleSpellCast(idx));
      spellEl.addEventListener('mouseenter', () => playSfx('card_hover_drone'));
      spellEl.addEventListener('mouseleave', () => stopSfx('card_hover_drone'));
      handEl.appendChild(spellEl);
    });
  }

  const logEl = document.getElementById('battleLog');
  if (logEl) { logEl.innerHTML = battleState.battleLog.map(l => `<div>> ${l}</div>`).join(''); logEl.scrollTop = logEl.scrollHeight; }
  document.getElementById('turnIndicator')!.textContent = battleState.turn === 'player' ? 'Player' : 'Enemy';
}

// ── Turn transitions ──
function endPlayerTurn(): void {
  if (!battleState) return;
  if (battleState.playerMomentum > 0) battleState.playerMomentum = Math.max(0, battleState.playerMomentum - 1);
  battleState.playerIsDefending = false;
  battleState.playerIntent = null;
  battleState.turn = 'enemy';
  battleFx?.showTurnBanner('Enemy Turn');
  renderBattleUI(currentConfig!.playerCard || getActiveEntity()!, currentConfig!.enemyCard);
  setTimeout(enemyTurn, 800);
}

function endEnemyTurn(): void {
  if (!battleState) return;
  if (battleState.enemyMomentum > 0) battleState.enemyMomentum = Math.max(0, battleState.enemyMomentum - 1);
  battleState.enemyIsDefending = false;
  battleState.turn = 'player';
  battleFx?.showTurnBanner('Your Turn');
  renderBattleUI(currentConfig!.playerCard || getActiveEntity()!, currentConfig!.enemyCard);
}

// ── Player Actions ───────────────────────────────────────────────────
function handleAttack(playerCard: Card, enemyCard: Card): void {
  if (!battleState || battleState.turn !== 'player') return;

  battleState.playerIntent = 'attack';
  let baseDamage = battleState.playerAttack + Math.floor(Math.random() * 4) - 2;
  const spent = battleState.playerMomentum;
  if (spent > 0) {
    baseDamage += spent;
    battleState.playerMomentum = 0;
    battleState.battleLog.push(`You unleash Momentum, adding +${spent} damage!`);
  }
  playerRage.generate(spent >= 3 ? 2 : 1);
  const isCrit = playerRage.consume();
  if (isCrit) baseDamage *= 2;

  const damage = calculateDamage(combatContext!, baseDamage, true);
  battleState.enemyHP = Math.max(0, battleState.enemyHP - damage);
  combatContext!.enemyHP = battleState.enemyHP;
  battleState.battleLog.push(`You attack for ${damage} damage!${isCrit ? ' CRITICAL!' : ''}`);
  applyTriggeredAbility(combatContext!, true, 'onAttack', battleState.playerAbilities);

  battleState.playerActionHistory.push('attack');
  if (battleState.playerActionHistory.length > 3) battleState.playerActionHistory.shift();
  checkActionCombo('player');

  const enemyEl = document.getElementById('enemyCardDisplay')?.querySelector('.battle-card') as HTMLElement;
  if (enemyEl) {
    const rect = enemyEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const fxType = isCrit ? 'critical' : (damage > 8 ? 'slash' : 'radial');
    AttackEffects.play(fxType, cx, cy, damage, enemyCard.aspect);
    battleFx?.showDamage(cx, cy, damage, isCrit ? 'critical' : 'normal', enemyCard.aspect);
    battleFx?.shakeCard(enemyEl);
    playSfx('card_hit_damage');
  }

  if (battleState.enemyHP <= 0) checkBattleEnd(playerCard, enemyCard);
  else endPlayerTurn();
}

function handleDefend(): void {
  if (!battleState || battleState.turn !== 'player') return;
  battleState.playerIntent = 'defend';
  battleState.playerIsDefending = true;
  combatContext!.playerEffects.push({
    name: 'Defending',
    duration: 2,
    onDamageTaken: (_ctx, dmg, isPlayer) => isPlayer ? Math.ceil(dmg / 2) : dmg
  });
  if (battleState.playerMomentum < 3) {
    battleState.playerMomentum++;
    battleState.battleLog.push(`You brace yourself and build Momentum (${battleState.playerMomentum}/3).`);
  } else {
    battleState.battleLog.push(`You defend, but Momentum is already full.`);
  }
  endPlayerTurn();
}

function handleAbility(playerCard: Card, enemyCard: Card): void {
  if (!battleState || battleState.turn !== 'player') return;
  const ability = battleState.playerAbilities.find(a => a.type === 'combat' && a.trigger !== 'passive');
  if (!ability) return;
  battleState.playerIntent = 'skill';
  playSfx('card_play');
  applyAbility(combatContext!, true, ability.name, ability);
  battleState.playerHP = combatContext!.playerHP;
  battleState.enemyHP = combatContext!.enemyHP;
  battleState.battleLog = combatContext!.battleLog;

  const enemyEl = document.getElementById('enemyCardDisplay')?.querySelector('.battle-card') as HTMLElement;
  if (enemyEl) {
    const rect = enemyEl.getBoundingClientRect();
    AttackEffects.play('rune', rect.left + rect.width / 2, rect.top + rect.height / 2, ability.value || 10, enemyCard.aspect);
    battleFx?.showDamage(rect.left + rect.width / 2, rect.top + rect.height / 2, ability.value || 10, 'magic', enemyCard.aspect);
    battleFx?.shakeCard(enemyEl);
    playSfx('card_hit_damage');
  }

  if (battleState.enemyHP <= 0) checkBattleEnd(playerCard, enemyCard);
  else endPlayerTurn();
}

// ── Spell Cast ──
function handleSpellCast(index: number): void {
  if (!battleState || battleState.turn !== 'player' || !combatContext || !currentConfig) return;
  const spell = battleState.hand[index];
  if (!spell) return;
  const spellStats = spell.stats as SpellStats;
  if (will.value < spellStats.cost) { addLog('Not enough Will!', true); return; }
  will.value -= spellStats.cost;
  playSfx('card_play');
  if (spellStats.damage) {
    battleState.enemyHP = Math.max(0, battleState.enemyHP - spellStats.damage);
    combatContext.enemyHP = battleState.enemyHP;
  }
  if (spellStats.healing) {
    battleState.playerHP = Math.min(battleState.playerMaxHP, battleState.playerHP + spellStats.healing);
    combatContext.playerHP = battleState.playerHP;
  }
  battleState.battleLog.push(`You cast ${spell.name}!`);
  battleState.hand.splice(index, 1);
  const enemyEl = document.getElementById('enemyCardDisplay')?.querySelector('.battle-card') as HTMLElement;
  if (enemyEl && spellStats.damage) {
    const rect = enemyEl.getBoundingClientRect();
    AttackEffects.play('rune', rect.left + rect.width / 2, rect.top + rect.height / 2, spellStats.damage, currentConfig.enemyCard.aspect);
    battleFx?.showDamage(rect.left + rect.width / 2, rect.top + rect.height / 2, spellStats.damage, 'magic', currentConfig.enemyCard.aspect);
    battleFx?.shakeCard(enemyEl);
    playSfx('card_hit_damage');
  }
  if (battleState.enemyHP <= 0) checkBattleEnd(currentConfig.playerCard!, currentConfig.enemyCard);
  else endPlayerTurn();
}

// ── Flee ──
function handleFlee(): void {
  if (!battleState || !currentConfig) return;
  playSfx('card_play');
  battleState.fleeAttempts++;
  if (Math.random() < 0.4 + battleState.fleeAttempts * 0.2) {
    battleState.battleLog.push('You flee!');
    renderBattleUI(currentConfig.playerCard || getActiveEntity()!, currentConfig.enemyCard);
    setTimeout(() => { if (currentConfig.onFlee) currentConfig.onFlee(); closeBattleModal(); }, 1000);
  } else {
    battleState.battleLog.push('Failed to flee!');
    endPlayerTurn();
  }
}

// ── Enemy Turn with Kalgoth AI ───────────────────────────────────────
async function enemyTurn(): Promise<void> {
  if (!battleState || !combatContext || !currentConfig) return;
  battleState.turnCount++;
  processStatusEffects(combatContext, true);
  processStatusEffects(combatContext, false);
  battleState.playerAbilities.forEach(a => { if (a.type === 'passive' || a.trigger === 'onTurnStart') applyPassiveAbility(combatContext!, true, a); });
  battleState.enemyAbilities.forEach(a => { if (a.type === 'passive' || a.trigger === 'onTurnStart') applyPassiveAbility(combatContext!, false, a); });

  const enemyCard = currentConfig.enemyCard;
  const playerCard = currentConfig.playerCard!;

  // Get AI decision
  const { action, banter } = await getKalgothAction(battleState, playerCard, enemyCard);

  if (banter) {
    battleState.battleLog.push(`KALGOTH: ${banter}`);
  }

  if (action.startsWith('ability:')) {
    const abilityName = action.substring(8).trim();
    const ability = battleState.enemyAbilities.find(a => a.name === abilityName);
    if (ability) {
      applyAbility(combatContext, false, ability.name, ability);
      battleState.playerHP = combatContext.playerHP;
      battleState.enemyHP = combatContext.enemyHP;
      battleState.battleLog = combatContext.battleLog;
      battleState.enemyIntent = 'skill';
      battleState.telegraphEffect = 'rune-glow';
    } else {
      performEnemyAttack();
    }
  } else if (action === 'defend') {
    battleState.enemyIsDefending = true;
    combatContext.enemyEffects.push({
      name: 'Defending',
      duration: 2,
      onDamageTaken: (_ctx, dmg, isPlayer) => !isPlayer ? Math.ceil(dmg / 2) : dmg
    });
    if (battleState.enemyMomentum < 3) battleState.enemyMomentum++;
    battleState.battleLog.push(`${enemyCard.name} braces itself.`);
    battleState.enemyIntent = 'defend';
    battleState.telegraphEffect = 'counter-ready';
  } else {
    performEnemyAttack();
    battleState.enemyIntent = 'attack';
    if (!battleState.enemyTelegraphed && Math.random() < 0.25) {
      battleState.enemyTelegraphed = true;
      battleState.telegraphEffect = 'wind-up';
      battleState.battleLog.push(`${enemyCard.name} winds up a heavy blow!`);
    }
  }

  checkBattleEnd(playerCard, enemyCard);
  if (battleState.playerHP > 0) endEnemyTurn();
  else renderBattleUI(playerCard, enemyCard);
}

function performEnemyAttack(): void {
  if (!battleState || !combatContext || !currentConfig) return;
  let baseDamage = battleState.enemyAttack + Math.floor(Math.random() * 4) - 2;
  const spent = battleState.enemyMomentum;
  if (spent > 0) {
    baseDamage += spent;
    battleState.enemyMomentum = 0;
  }
  enemyRage.generate(spent >= 3 ? 2 : 1);
  const isCrit = enemyRage.consume();
  if (isCrit) baseDamage *= 2;
  const damage = calculateDamage(combatContext, baseDamage, false);
  battleState.playerHP = Math.max(0, battleState.playerHP - damage);
  combatContext.playerHP = battleState.playerHP;
  battleState.battleLog.push(`${currentConfig.enemyCard.name} attacks for ${damage} damage!${isCrit ? ' CRITICAL!' : ''}`);
  applyTriggeredAbility(combatContext, false, 'onDamage', battleState.enemyAbilities);

  const playerEl = document.getElementById('playerCardDisplay')?.querySelector('.battle-card') as HTMLElement;
  if (playerEl) {
    const rect = playerEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const fxType = isCrit ? 'critical' : (damage > 8 ? 'slash' : 'radial');
    AttackEffects.play(fxType, cx, cy, damage, currentConfig.enemyCard.aspect);
    battleFx?.showDamage(cx, cy, damage, isCrit ? 'critical' : 'normal', currentConfig.enemyCard.aspect);
    battleFx?.shakeCard(playerEl);
    playSfx('card_hit_damage');
  }
}

// ── Combo detection ──
function checkActionCombo(side: 'player' | 'enemy'): void {
  if (!battleState) return;
  const history = side === 'player' ? battleState.playerActionHistory : battleState.enemyActionHistory;
  if (history.length < 3) return;
  const comboId = history.join(',');
  if (comboId === 'attack,attack,attack') {
    addLog(`${side === 'player' ? 'You' : 'Enemy'} unleashed a triple combo! Damage ×1.5!`, true);
    battleState[side === 'player' ? 'playerMomentum' : 'enemyMomentum'] += 1;
  } else if (comboId === 'defend,defend,attack') {
    addLog(`${side === 'player' ? 'You' : 'Enemy'} executed a counter stance! +1 Momentum.`, false);
    battleState[side === 'player' ? 'playerMomentum' : 'enemyMomentum'] = Math.min(3, battleState[side === 'player' ? 'playerMomentum' : 'enemyMomentum'] + 1);
  }
}

// ── Victory / Defeat ─────────────────────────────────────────────────
async function checkBattleEnd(playerCard: Card, enemyCard: Card): Promise<void> {
  if (!battleState || !currentConfig) return;
  if (battleState.enemyHP <= 0) {
    battleState.battleLog.push(`Victory! ${enemyCard.name} is defeated.`);
    renderBattleUI(playerCard, enemyCard);
    stopLoop('card_battle_music_bed');
    playSfx('duel_success');
    triggerScreenPulse('#d4af37');
    const tier = enemyCard.rarity === 'legendary' ? 3 : (enemyCard.rarity === 'epic' ? 2 : 1);
    grantBattleRewards(tier, enemyCard.aspect, isSummoningBattle);
    addMasteryXP(15 + battleState.turnCount * 2);
    gameBus.emit<BattleEndPayload>(GameEvents.BATTLE_END, { result: 'victory', playerCard, enemyCard });
    await battleFx?.showVictory();
    showVictoryOptions(enemyCard);
  } else if (battleState.playerHP <= 0) {
    battleState.battleLog.push(`Defeat...`);
    renderBattleUI(playerCard, enemyCard);
    stopLoop('card_battle_music_bed');
    playSfx('duel_fail');
    triggerScreenPulse('#8a0000');
    gameBus.emit<BattleEndPayload>(GameEvents.BATTLE_END, { result: 'defeat', playerCard, enemyCard });
    await battleFx?.showDefeat();
    if (currentConfig.onDefeat) currentConfig.onDefeat();
    closeBattleModal();
  }
}

function showVictoryOptions(enemyCard: Card): void {
  if (!battleModal || !currentConfig) return;
  const content = battleModal.querySelector('.battle-content');
  if (!content) return;
  content.innerHTML = `
    <h3>✨ VICTORY ✨</h3>
    <img src="${enemyCard.image}" style="width:180px; aspect-ratio:3/4; object-fit:cover; border-radius:12px; margin:10px auto;">
    <p>${enemyCard.name} lies before you.</p>
    <div style="display:flex; gap:15px; justify-content:center;">
      <button id="victoryBarter" class="craft-btn">🤝 Barter</button>
      <button id="victoryDestroy" class="craft-btn">💀 Destroy</button>
      <button id="victoryEnsnare" class="craft-btn">🔮 Ensnare</button>
    </div>
  `;
  content.querySelector('#victoryBarter')!.addEventListener('click', () => {
    playSfx('uiClick'); playSfx('bargainSecret');
    if (currentConfig!.onVictory) currentConfig!.onVictory('barter');
    closeBattleModal();
  });
  content.querySelector('#victoryDestroy')!.addEventListener('click', () => {
    playSfx('uiClick'); playSfx('destroyDemon');
    if (currentConfig!.onVictory) currentConfig!.onVictory('destroy');
    closeBattleModal();
  });
  content.querySelector('#victoryEnsnare')!.addEventListener('click', () => {
    playSfx('uiClick'); playSfx('captureDemon');
    if (currentConfig!.onVictory) currentConfig!.onVictory('ensnare');
    closeBattleModal();
  });
}

function closeBattleModal(): void {
  stopLoop('card_battle_music_bed');
  battleFx?.dispose();
  battleFx = null;
  if (battleModal) { battleModal.remove(); battleModal = null; }
  currentConfig = null; battleState = null; combatContext = null;
}