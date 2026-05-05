// js/ui/card-battle.ts – Correct order: modal → clash → render
import {
  will, maxWill, getEquippedCards, getActiveEntity, addMasteryXP,
} from '../core/state-signals.js';
import { getCardById, type Card, type EntityStats, type SpellStats, type EntityAbility } from '../data/cards.js';
import { el } from '../core/dom-helper.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { addLog } from './log-manager.js';
import { triggerScreenPulse } from './ui-renderer.js';
import {
  applyAbility, applyPassiveAbility, applyTriggeredAbility,
  processStatusEffects, calculateDamage,
  type CombatContext, type ActiveEffect
} from '../systems/ability-engine.js';
import {
  getEnhancedStats, checkForCombos, getAspectSynergyBonus, applyComboBonuses
} from '../systems/card-progression.js';
import { gameBus } from '../core/eventBus.js';
import { GameEvents, type BattleClashPayload, type BattleEndPayload } from '../core/events.js';
import { CardClashAnimation, isClashEnabled } from './battle-clash.js';

export interface CardBattleConfig {
  enemyCard: Card;
  playerCard?: Card;
  advantage?: number;
  onVictory?: (choice: 'barter' | 'destroy' | 'ensnare') => void;
  onDefeat?: () => void;
  onFlee?: () => void;
  isMazeMinion?: boolean;
}

interface BattleState {
  playerHP: number; playerMaxHP: number;
  playerAttack: number; playerDefense: number; playerResistance: number; playerInitiative: number;
  enemyHP: number; enemyMaxHP: number;
  enemyAttack: number; enemyDefense: number; enemyResistance: number; enemyInitiative: number;
  hand: Card[]; turn: 'player' | 'enemy'; battleLog: string[];
  advantage: number; canFlee: boolean; fleeAttempts: number;
  playerAbilities: EntityAbility[]; enemyAbilities: EntityAbility[];
  playerStatusEffects: StatusEffect[]; enemyStatusEffects: StatusEffect[];
  turnCount: number;
}
interface StatusEffect {}

let currentConfig: CardBattleConfig | null = null;
let battleState: BattleState | null = null;
let battleModal: HTMLDivElement | null = null;
let combatContext: CombatContext | null = null;

export async function openCardBattleModal(config: CardBattleConfig): Promise<void> {
  currentConfig = config;
  const playerCard = config.playerCard || getActiveEntity();
  if (!playerCard) throw new Error('No player card');
  const enemyCard = config.enemyCard;

  // Build stats
  const playerStats = playerCard.stats as EntityStats;
  const enemyStats = enemyCard.stats as EntityStats;
  const adv = config.advantage ?? 0;
  const pBaseHP = (playerStats?.hp || 20) + (adv > 0 ? Math.floor(adv/2) : 0);
  const pAtk = (playerStats?.atk || 3) + (adv > 0 ? Math.floor(adv/3) : 0);
  const eBaseHP = (enemyStats?.hp || 15) + (adv < 0 ? Math.floor(-adv/2) : 0);
  const eAtk = (enemyStats?.atk || 3) + (adv < 0 ? Math.floor(-adv/3) : 0);

  battleState = {
    playerHP: pBaseHP, playerMaxHP: pBaseHP,
    playerAttack: pAtk, playerDefense: playerStats?.def || 0,
    playerResistance: playerStats?.res || 0, playerInitiative: playerStats?.init || 3,
    enemyHP: eBaseHP, enemyMaxHP: eBaseHP,
    enemyAttack: eAtk, enemyDefense: enemyStats?.def || 0,
    enemyResistance: enemyStats?.res || 0, enemyInitiative: enemyStats?.init || 3,
    hand: getEquippedCards('spell').slice(0,3),
    turn: (playerStats?.init || 3) >= (enemyStats?.init || 3) ? 'player' : 'enemy',
    battleLog: [`${enemyCard.name} appears!`],
    advantage: adv, canFlee: config.isMazeMinion || false, fleeAttempts: 0,
    playerAbilities: (playerCard.abilities || []) as EntityAbility[],
    enemyAbilities: (enemyCard.abilities || []) as EntityAbility[],
    playerStatusEffects: [], enemyStatusEffects: [], turnCount: 0,
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

  // ---- Create modal and append to DOM FIRST ----
  if (battleModal) battleModal.remove();
  battleModal = createBattleModal(playerCard, enemyCard);
  document.body.appendChild(battleModal);
  battleModal.style.display = 'flex';

  // ---- Emit clash start event ----
  gameBus.emit<BattleClashPayload>(GameEvents.BATTLE_CLASH_START, { playerCard, enemyCard });

  // ---- Play cinematic clash inside the modal ----
  if (isClashEnabled()) {
        const clash = new CardClashAnimation();
    const contentDiv = battleModal.querySelector('.battle-content') as HTMLElement;
    if (contentDiv) {
      await clash.play(playerCard, enemyCard, contentDiv);
    }
  }

  // ---- Render battle UI after clash ----
  renderBattleUI(playerCard, enemyCard);
  playSfx('duel_start');
  startLoop('demonSummonBg');

  if (battleState.turn === 'enemy') setTimeout(() => enemyTurn(playerCard, enemyCard), 600);
}

// ---------- MODAL HTML ----------
function createBattleModal(playerCard: Card, enemyCard: Card): HTMLDivElement {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'cardBattleModal';
  Object.assign(modal.style, {
    position:'fixed', top:'0', left:'0', width:'100%', height:'100%',
    backgroundColor:'rgba(0,0,0,0.95)', backdropFilter:'blur(12px)',
    zIndex:'9999', justifyContent:'center', alignItems:'center', display:'flex',
  });
  modal.innerHTML = `
    <div class="modal-content battle-content" style="max-width:900px; width:95%; background:#0a0508; border:2px solid #6a4a3a; border-radius:32px; padding:24px; box-shadow:0 0 0 1px #8a7a5a inset, 0 20px 40px #000; color:#e0d8cc;">
      <h3 style="margin:0 0 20px; color:#b8a890; text-align:center; text-shadow:0 0 10px #5a4a3a;">⚔️ CARD BATTLE ⚔️</h3>
      
      <div style="display:flex; gap:20px;">
        <div style="flex:1; text-align:center;">
          <h4 style="margin:0 0 10px; color:#c0b8a8;">Your Entity</h4>
          <div id="playerCardDisplay" style="margin-bottom:10px;"></div>
          <div class="progress-bar" style="margin-bottom:5px;"><div id="playerHPBar" class="progress-fill" style="width:100%; background:#7ea04b;"></div></div>
          <span id="playerHPText">HP: 20/20</span>
          <div style="margin-top:10px; font-size:0.9rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
            <span>⚔️ ATK: <span id="playerAttack">3</span></span>
            <span>🛡️ DEF: <span id="playerDefense">0</span></span>
          </div>
          <div id="playerStatusEffects" style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap; justify-content:center;"></div>
        </div>
        <div style="flex:1; text-align:center;">
          <h4 id="enemyName" style="margin:0 0 10px; color:#c0b8a8;">${enemyCard.name}</h4>
          <div id="enemyCardDisplay" style="margin-bottom:10px;"></div>
          <div class="progress-bar" style="margin-bottom:5px;"><div id="enemyHPBar" class="progress-fill" style="width:100%; background:#8a3a3a;"></div></div>
          <span id="enemyHPText">HP: 15/15</span>
          <div style="margin-top:10px; font-size:0.9rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
            <span>⚔️ ATK: <span id="enemyAttack">3</span></span>
            <span>🛡️ DEF: <span id="enemyDefense">0</span></span>
          </div>
          <div id="enemyStatusEffects" style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap; justify-content:center;"></div>
        </div>
      </div>
      <div id="battleLog" style="margin:20px 0; padding:10px; background:rgba(0,0,0,0.5); border:1px solid #5a4a3a; border-radius:12px; min-height:60px; max-height:100px; overflow-y:auto; font-size:0.9rem;"></div>
      <div id="spellHand" style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;"></div>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button id="attackBtn" class="craft-btn" style="padding:10px 20px;">⚔️ Attack</button>
        <button id="abilityBtn" class="craft-btn" style="padding:10px 20px; background:#4a2a6a;">✨ Ability</button>
        <button id="fleeBtn" class="craft-btn" style="padding:10px 20px; background:#5a3a2a;">🏃 Flee</button>
      </div>
      <div style="margin-top:10px; text-align:center;">
        <span style="color:#a09080; font-size:0.8rem;">Will: ${will.value}/${maxWill.value} | Turn: <span id="turnIndicator">Player</span></span>
      </div>
    </div>
  `;
  modal.querySelector('#attackBtn')!.addEventListener('click', () => handleAttack(playerCard, enemyCard));
  modal.querySelector('#abilityBtn')!.addEventListener('click', () => handleAbility(playerCard, enemyCard));
  modal.querySelector('#fleeBtn')!.addEventListener('click', handleFlee);
  return modal;
}

// ---------- RENDER ----------
function renderBattleUI(playerCard: Card, enemyCard: Card): void {
  if (!battleState) return;
  const pDisplay = document.getElementById('playerCardDisplay');
  if (pDisplay) pDisplay.innerHTML = `<div style="position:relative; width:150px; margin:0 auto; border-radius:12px; overflow:hidden;"><img src="${playerCard.image}" style="width:100%; aspect-ratio:3/4; object-fit:cover;"><img src="${playerCard.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div><p style="margin:5px 0 0;">${playerCard.name}</p>`;
  const eDisplay = document.getElementById('enemyCardDisplay');
  if (eDisplay) eDisplay.innerHTML = `<div style="position:relative; width:150px; margin:0 auto; border-radius:12px; overflow:hidden;"><img src="${enemyCard.image}" style="width:100%; aspect-ratio:3/4; object-fit:cover;"><img src="${enemyCard.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div><p style="margin:5px 0 0;">${enemyCard.name}</p>`;
  updateStatDisplays();
  const handEl = document.getElementById('spellHand');
  if (handEl) {
    handEl.innerHTML = '';
    battleState.hand.forEach((spell, idx) => {
      const spellEl = document.createElement('div');
      spellEl.style.cssText = 'position:relative; width:80px; cursor:pointer; border-radius:8px; overflow:hidden; transition:transform 0.15s; aspect-ratio:3/4;';
      spellEl.innerHTML = `<img src="${spell.image}" style="width:100%; height:100%; object-fit:cover;"><img src="${spell.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;"><div style="position:absolute; bottom:2px; left:2px; background:rgba(0,0,0,0.7); padding:2px 4px; border-radius:10px; font-size:0.6rem; color:#e0d8cc;">${(spell.stats as SpellStats).cost} Will</div>`;
      spellEl.addEventListener('click', () => handleSpellCast(idx, playerCard, enemyCard));
      handEl.appendChild(spellEl);
    });
  }
  const logEl = document.getElementById('battleLog');
  if (logEl) { logEl.innerHTML = battleState.battleLog.map(l => `<div>> ${l}</div>`).join(''); logEl.scrollTop = logEl.scrollHeight; }
  const turnEl = document.getElementById('turnIndicator');
  if (turnEl) turnEl.textContent = battleState.turn === 'player' ? 'Player' : 'Enemy';
}

// ---------- STAT DISPLAYS ----------
function updateStatDisplays(): void {
  if (!battleState) return;
  const set = (id: string, val: string) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const pct = (id: string, p: number) => { const e = document.getElementById(id); if (e) e.style.width = `${p}%`; };
  pct('playerHPBar', (battleState.playerHP/battleState.playerMaxHP)*100);
  set('playerHPText', `HP: ${battleState.playerHP}/${battleState.playerMaxHP}`);
  pct('enemyHPBar', (battleState.enemyHP/battleState.enemyMaxHP)*100);
  set('enemyHPText', `HP: ${battleState.enemyHP}/${battleState.enemyMaxHP}`);
  set('playerAttack', battleState.playerAttack.toString());
  set('playerDefense', battleState.playerDefense.toString());
  set('enemyAttack', battleState.enemyAttack.toString());
  set('enemyDefense', battleState.enemyDefense.toString());
}

// ---------- ACTIONS ----------
function handleAttack(playerCard: Card, enemyCard: Card): void {
  if (!battleState || battleState.turn !== 'player') return;
  const damage = calculateDamage(combatContext!, Math.floor(Math.random()*4)-2, true);
  battleState.enemyHP = Math.max(0, battleState.enemyHP - damage);
  combatContext!.enemyHP = battleState.enemyHP;
  battleState.battleLog.push(`You attack for ${damage} damage!`);
  playSfx('card_play'); triggerScreenPulse('#ff6a2a');
  checkEnd(playerCard, enemyCard);
  if (battleState.enemyHP > 0) { battleState.turn = 'enemy'; renderBattleUI(playerCard, enemyCard); setTimeout(() => enemyTurn(playerCard, enemyCard), 800); }
  else renderBattleUI(playerCard, enemyCard);
}

function handleAbility(playerCard: Card, enemyCard: Card): void {
  if (!battleState || battleState.turn !== 'player') return;
  const ability = battleState.playerAbilities.find(a => a.type === 'combat' && a.trigger !== 'passive');
  if (!ability) return;
  applyAbility(combatContext!, true, ability.name, ability);
  battleState.playerHP = combatContext!.playerHP; battleState.enemyHP = combatContext!.enemyHP;
  battleState.battleLog = combatContext!.battleLog;
  playSfx('card_play'); triggerScreenPulse('#7ea04b');
  checkEnd(playerCard, enemyCard);
  if (battleState.enemyHP > 0 && battleState.playerHP > 0) { battleState.turn = 'enemy'; renderBattleUI(playerCard, enemyCard); setTimeout(() => enemyTurn(playerCard, enemyCard), 800); }
  else renderBattleUI(playerCard, enemyCard);
}

function enemyTurn(playerCard: Card, enemyCard: Card): void {
  if (!battleState || !combatContext || !currentConfig) return;
  battleState.turnCount++;
  processStatusEffects(combatContext, true); processStatusEffects(combatContext, false);
  const damage = calculateDamage(combatContext, Math.floor(Math.random()*4)-2, false);
  battleState.playerHP = Math.max(0, battleState.playerHP - damage);
  combatContext.playerHP = battleState.playerHP;
  battleState.battleLog.push(`${enemyCard.name} attacks for ${damage} damage!`);
  playSfx('health drop'); triggerScreenPulse('#8a2a2a');
  checkEnd(playerCard, enemyCard);
  if (battleState.playerHP > 0) battleState.turn = 'player';
  renderBattleUI(playerCard, enemyCard);
}

function handleSpellCast(index: number, playerCard: Card, enemyCard: Card): void {
  if (!battleState || battleState.turn !== 'player') return;
  const spell = battleState.hand[index]; if (!spell) return;
  const spellStats = spell.stats as SpellStats;
  if (will.value < spellStats.cost) { addLog('Not enough Will!', true); return; }
  will.value -= spellStats.cost;
  const effect = spellStats.damage ? `deals ${spellStats.damage} damage` : (spellStats.healing ? `restores ${spellStats.healing} HP` : 'disrupts');
  if (spellStats.damage) { battleState.enemyHP = Math.max(0, battleState.enemyHP - spellStats.damage); combatContext!.enemyHP = battleState.enemyHP; }
  else if (spellStats.healing) { battleState.playerHP = Math.min(battleState.playerMaxHP, battleState.playerHP + spellStats.healing); combatContext!.playerHP = battleState.playerHP; }
  else { battleState.enemyHP = Math.max(0, battleState.enemyHP - 2); combatContext!.enemyHP = battleState.enemyHP; }
  battleState.battleLog.push(`You cast ${spell.name}: ${effect}!`);
  battleState.hand.splice(index, 1);
  playSfx('card_play'); triggerScreenPulse('#7ea04b');
  checkEnd(playerCard, enemyCard);
  if (battleState.enemyHP > 0 && battleState.playerHP > 0) { battleState.turn = 'enemy'; renderBattleUI(playerCard, enemyCard); setTimeout(() => enemyTurn(playerCard, enemyCard), 800); }
  else renderBattleUI(playerCard, enemyCard);
}

function handleFlee(): void {
  if (!battleState || !currentConfig) return;
  battleState.fleeAttempts++;
  if (Math.random() < 0.4 + battleState.fleeAttempts*0.2) {
    battleState.battleLog.push('You flee!');
    renderBattleUI(currentConfig.playerCard || getActiveEntity()!, currentConfig.enemyCard);
    setTimeout(() => { if (currentConfig?.onFlee) currentConfig.onFlee(); closeBattleModal(); }, 1000);
  } else {
    battleState.battleLog.push('Failed to flee!'); battleState.turn = 'enemy';
    renderBattleUI(currentConfig.playerCard || getActiveEntity()!, currentConfig.enemyCard);
    setTimeout(() => enemyTurn(currentConfig.playerCard || getActiveEntity()!, currentConfig.enemyCard), 800);
  }
}

// ---------- END ----------
function checkEnd(playerCard: Card, enemyCard: Card): void {
  if (!battleState || !currentConfig) return;
  if (battleState.enemyHP <= 0) {
    battleState.battleLog.push(`Victory!`);
    stopLoop('demonSummonBg'); playSfx('duel_success'); triggerScreenPulse('#d4af37');
    addMasteryXP(15 + battleState.turnCount*2);
    gameBus.emit<BattleEndPayload>(GameEvents.BATTLE_END, { result:'victory', playerCard, enemyCard });
    setTimeout(() => showVictoryOptions(enemyCard), 1000);
  } else if (battleState.playerHP <= 0) {
    battleState.battleLog.push(`Defeat...`);
    stopLoop('demonSummonBg'); playSfx('duel_fail'); triggerScreenPulse('#8a0000');
    gameBus.emit<BattleEndPayload>(GameEvents.BATTLE_END, { result:'defeat', playerCard, enemyCard });
    setTimeout(() => { if (currentConfig.onDefeat) currentConfig.onDefeat(); closeBattleModal(); }, 1500);
  }
}

function showVictoryOptions(enemyCard: Card): void {
  if (!battleModal || !currentConfig) return;
  const content = battleModal.querySelector('.battle-content'); if (!content) return;
  content.innerHTML = `
    <h3 style="margin:0 0 20px; color:#b8a890; text-align:center;">✨ VICTORY ✨</h3>
    <div style="text-align:center; margin-bottom:20px;">
      <div style="position:relative; width:150px; margin:0 auto; border-radius:12px; overflow:hidden;">
        <img src="${enemyCard.image}" style="width:100%; aspect-ratio:3/4; object-fit:cover;">
        <img src="${enemyCard.frame}" style="position:absolute; top:0; left:0; width:100%; height:100%;">
      </div>
      <p style="margin:10px 0;">${enemyCard.name} lies before you.</p>
    </div>
    <p style="text-align:center; margin-bottom:20px;">What will you do?</p>
    <div style="display:flex; gap:15px; justify-content:center;">
      <button id="victoryBarter" class="craft-btn" style="padding:12px 24px;">🤝 Barter</button>
      <button id="victoryDestroy" class="craft-btn" style="padding:12px 24px; background:#5a2a2a;">💀 Destroy</button>
      <button id="victoryEnsnare" class="craft-btn" style="padding:12px 24px; background:#2a4a2a;">🔮 Ensnare</button>
    </div>
    <p style="margin-top:20px; font-size:0.8rem; color:#a09080; text-align:center;">Barter: Random card | Destroy: Resources | Ensnare: Add to Grimoire</p>
  `;
  content.querySelector('#victoryBarter')!.addEventListener('click', () => { if (currentConfig!.onVictory) currentConfig!.onVictory('barter'); closeBattleModal(); });
  content.querySelector('#victoryDestroy')!.addEventListener('click', () => { if (currentConfig!.onVictory) currentConfig!.onVictory('destroy'); closeBattleModal(); });
  content.querySelector('#victoryEnsnare')!.addEventListener('click', () => { if (currentConfig!.onVictory) currentConfig!.onVictory('ensnare'); closeBattleModal(); });
}

function closeBattleModal(): void {
  if (battleModal) { battleModal.remove(); battleModal = null; }
  stopLoop('demonSummonBg'); currentConfig = null; battleState = null; combatContext = null;
}
