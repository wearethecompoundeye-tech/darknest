// js/systems/maze-system.ts – Undercrypt Expedition (definitive, fully wired)
// Handles path selection, grid exploration, encounters, and escape unlock.

import { batch } from '@preact/signals-core';
import {
  orbexFragments, maxOrbexFragments, ingredients, totalExplorations,
  mazePathsUnlocked, discoveries, addFamiliarXP, addMasteryXP, autoSave, discover,
  kalgothsNoose, gazeIntensity, getEquippedCards, addCard, ownedCards,
  circleMastery, will, maxWill,
  hasSpecialIngredient,    // required for escape
  circlePower              // required for escape
} from '../core/state-signals.js';
import { currentPhase, transition } from '../core/gameReducer.js';
import { getCardById, type Card, type EntityStats } from '../data/cards.js';
import { addLog } from '../ui/log-manager.js';
import { addLedgerEntry } from '../ui/ledger.js';
import { playSfx, startLoop, stopLoop } from '../audio/sfx.js';
import { openWillDuel } from '../ui/will-duel.js';
import { openCardBattleModal } from '../ui/card-battle.js';
import { el } from '../core/dom-helper.js';
import { allCards } from '../data/cards.js';
import { getEchoReward, getHollowReward } from './card-acquisition.js';
import { getEnhancedStats, checkForCombos, getAspectSynergyBonus } from './card-progression.js';
import { getKalgothAction } from '../ai/battle-ai.js';

/* ── Base URL (makes all images work) ──────────────────────────── */
const BASE = import.meta.env.BASE_URL;

/* ── startExpedition at top to avoid bundler‑order issues ─────── */
export function startExpedition(entityCardId: string, pathId: string): void {
  if (currentPhase.value.status !== 'idle') {
    console.warn('Cannot start expedition – phase:', currentPhase.value.status);
    return;
  }
  const card = getCardById(entityCardId);
  if (!card || card.type !== 'entity') { addLog('Invalid entity.', true); return; }
  transition({ type: 'START_EXPEDITION', pathId, turns: 0 });

  activeEntityCard = card;
  selectedPathId = pathId;
  expeditionMap = generateMaze(pathId);
  currentPosition = { x: 0, y: 0 };
  const base = card.stats as EntityStats;
  const enh = getEnhancedStats(card.id) || base;
  const syn = getAspectSynergyBonus();
  entityMaxHP = enh.hp + (syn.hp || 0);
  entityCurrentHP = entityMaxHP;
  movesRemaining = enh.spd + (syn.spd || 0);
  const combos = checkForCombos();
  expeditionLog = [];
  discoveredCount = 1;
  if (combos.length) combos.forEach(c => expeditionLog.push(`✨ Combo: ${c.effect}`));
  expeditionLog.push(`${card.name} enters the ${getScaledPathConfig(pathId).name}.`);

  // Kalgoth’s mocking greeting
  getKalgothAction(createDummyBattleState(), createDummyPlayerCard(), createDummyEnemyCard())
    .then(({ banter }) => {
      if (banter) expeditionLog.push(`KALGOTH: ${banter}`);
    })
    .catch(() => {});

  expeditionActive = true;

  // ── Auto‑create the modal if it doesn’t exist ─────────────────
  let modal = el('expeditionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'expeditionModal';
    modal.className = 'modal';
    modal.style.cssText = 'display:flex; align-items:center; justify-content:center; position:fixed; inset:0; background:rgba(0,0,0,0.9); z-index:2500;';
    modal.innerHTML = `<div id="expeditionGridContainer" style="background:#0a0508; border:2px solid #b8a070; border-radius:24px; padding:24px; max-width:900px; width:95%;"></div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  renderExpeditionUI();

  playSfx('Maze_Send');
  startLoop('demonSummonBg');
  addLog(`${card.name} begins expedition.`, false, 'player');
}

/* ── Expedition state ──────────────────────────────────────────── */
let expeditionActive = false;
let expeditionMap: MazeNode[][] = [];
let currentPosition = { x: 0, y: 0 };
let expeditionLog: string[] = [];
let selectedPathId = 'Warded';
let activeEntityCard: Card | null = null;
let entityCurrentHP = 0;
let entityMaxHP = 0;
let movesRemaining = 0;
let discoveredCount = 0;

const GRID_SIZE = 8;

enum NodeType {
  EMPTY, RESOURCE, WARD, TRAP, MINION, ECHO, HOLLOW_LAIR, EXIT, ENTRANCE
}

interface MazeNode {
  type: NodeType;
  discovered: boolean;
  explored: boolean;
  resourceType?: string;
  resourceAmount?: number;
  wardDifficulty?: number;
  trapDifficulty?: number;
  minionPower?: number;
  echoCardId?: string;
  hollowFragmentIndex?: number;
}

/* ── Path configurations (scaled by Gaze & mastery) ─────────────── */
interface PathConfig {
  name: string; desc: string; icon: string;
  wardChance: number; trapChance: number; minionChance: number;
  resourceChance: number; echoChance: number; hollowChance: number;
}

const BASE_PATH_CONFIGS: Record<string, PathConfig> = {
  Warded: {
    name: 'Warded Corridor', desc: 'Many wards, moderate loot.',
    icon: `${BASE}Images/Game Art/Maze/Path_Warded.png`,
    wardChance: 0.3, trapChance: 0.15, minionChance: 0.15,
    resourceChance: 0.25, echoChance: 0.1, hollowChance: 0.05
  },
  Collapsed: {
    name: 'Collapsed Tunnel', desc: 'Dangerous, higher fragment odds.',
    icon: `${BASE}Images/Game Art/Maze/Path_Collapsed.png`,
    wardChance: 0.2, trapChance: 0.35, minionChance: 0.2,
    resourceChance: 0.15, echoChance: 0.05, hollowChance: 0.05
  },
  Echoing: {
    name: 'Echoing Hall', desc: 'Balanced, many echoes.',
    icon: `${BASE}Images/Game Art/Maze/Path_Echoing.png`,
    wardChance: 0.2, trapChance: 0.2, minionChance: 0.15,
    resourceChance: 0.2, echoChance: 0.2, hollowChance: 0.05
  },
  Safe: {
    name: 'Safe Passage', desc: 'Few threats, good resources.',
    icon: `${BASE}Images/Game Art/Maze/Path_Safe.png`,
    wardChance: 0.08, trapChance: 0.08, minionChance: 0.08,
    resourceChance: 0.5, echoChance: 0.1, hollowChance: 0.1
  }
};

function getScaledPathConfig(id: string): PathConfig {
  const base = BASE_PATH_CONFIGS[id] ?? BASE_PATH_CONFIGS.Warded;
  const g = gazeIntensity.value;
  const s = 1 + g / 120;
  return {
    ...base,
    wardChance: Math.min(0.6, base.wardChance * s),
    trapChance: Math.min(0.45, base.trapChance * s),
    minionChance: Math.min(0.35, base.minionChance * s),
    resourceChance: base.resourceChance * (1 + g / 250),
    echoChance: base.echoChance * (1 + g / 200),
    hollowChance: base.hollowChance,
  };
}

function getDifficultyOffset(): number {
  const mastery = circleMastery.value;
  const entityCun = (activeEntityCard?.stats as EntityStats)?.cun || 0;
  return Math.min(1.5, 0.75 + (mastery * 0.1) + (entityCun * 0.04));
}

function getEnemyScaling(): number {
  const base = 0.8 + (circleMastery.value * 0.06) + (gazeIntensity.value / 200);
  return Math.max(1.0, base);
}

/* ── Maze generation ────────────────────────────────────────────── */
function generateMaze(pathId: string): MazeNode[][] {
  const grid: MazeNode[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const cfg = getScaledPathConfig(pathId);
  for (let i = 0; i < GRID_SIZE; i++)
    for (let j = 0; j < GRID_SIZE; j++)
      grid[i][j] = { type: NodeType.EMPTY, discovered: false, explored: false };
  grid[0][0] = { type: NodeType.ENTRANCE, discovered: true, explored: true };

  const needed = maxOrbexFragments.value - orbexFragments.value;
  for (let f = 0; f < Math.min(needed, 3); f++) {
    for (let attempts = 0; attempts < 60; attempts++) {
      const x = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      const y = Math.floor(Math.random() * (GRID_SIZE - 2)) + 1;
      if (grid[x][y].type === NodeType.EMPTY) {
        grid[x][y] = {
          type: NodeType.HOLLOW_LAIR, discovered: false, explored: false,
          hollowFragmentIndex: orbexFragments.value + f + 1
        };
        break;
      }
    }
  }

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if ((i === 0 && j === 0) || grid[i][j].type !== NodeType.EMPTY) continue;
      const roll = Math.random();
      let cum = 0;
      const baseMod = 1 + (gazeIntensity.value / 200);
      if (roll < (cum += cfg.wardChance)) {
        grid[i][j] = {
          type: NodeType.WARD, discovered: false, explored: false,
          wardDifficulty: Math.floor((8 + Math.random() * 6) * baseMod)
        };
      } else if (roll < (cum += cfg.trapChance)) {
        grid[i][j] = {
          type: NodeType.TRAP, discovered: false, explored: false,
          trapDifficulty: Math.floor((10 + Math.random() * 5) * baseMod)
        };
      } else if (roll < (cum += cfg.minionChance)) {
        const basePower = 6 + Math.floor(Math.random() * 6);
        grid[i][j] = {
          type: NodeType.MINION, discovered: false, explored: false,
          minionPower: Math.floor(basePower * getEnemyScaling())
        };
      } else if (roll < (cum += cfg.resourceChance)) {
        const res = ['nightshadeMoss', 'cryptPhlegm', 'demonIchor', 'boneDust'];
        grid[i][j] = {
          type: NodeType.RESOURCE, discovered: false, explored: false,
          resourceType: res[Math.floor(Math.random() * res.length)],
          resourceAmount: Math.floor((2 + Math.random() * 4) * (1 + gazeIntensity.value / 250))
        };
      } else if (roll < (cum += cfg.echoChance)) {
        const pool = allCards.filter(c => c.type === 'spell' || c.type === 'enhancement');
        grid[i][j] = {
          type: NodeType.ECHO, discovered: false, explored: false,
          echoCardId: pool[Math.floor(Math.random() * pool.length)]?.id
        };
      }
    }
  }

  grid[GRID_SIZE - 1][GRID_SIZE - 1] = {
    type: NodeType.EXIT, discovered: false, explored: false
  };
  return grid;
}

/* ── Correct image paths ───────────────────────────────────────── */
function getNodeIcon(type: NodeType): string {
  switch (type) {
    case NodeType.ENTRANCE:    return `${BASE}Images/Maze Door.png`;
    case NodeType.EXIT:        return `${BASE}Images/Maze Door.png`;
    case NodeType.RESOURCE:    return `${BASE}Images/Game Art/Maze/Resource.png`;
    case NodeType.WARD:        return `${BASE}Images/Icon_Ward.png`;
    case NodeType.TRAP:        return `${BASE}Images/Icon_Trap.png`;
    case NodeType.MINION:      return `${BASE}Images/Kalgoths_Minion_01.png`;
    case NodeType.ECHO:        return `${BASE}Images/Wisp Icon.png`;
    case NodeType.HOLLOW_LAIR: return `${BASE}Images/Game Art/Maze/Hollow Lair.png`;
    default: return '';
  }
}

/* ── Floating reward text ──────────────────────────────────────── */
function floatText(text: string, x: number, y: number, color = '#ffd700') {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:fixed; left:${x}px; top:${y}px; color:${color};
    font-weight:bold; font-size:1.2rem; text-shadow:0 0 8px #000;
    pointer-events:none; z-index:9999; animation:floatUp 1.2s ease-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

/* ── UI rendering ──────────────────────────────────────────────── */
function renderExpeditionUI(): void {
  const container = el('expeditionGridContainer');
  if (!container) return;

  const cfg = getScaledPathConfig(selectedPathId);
  const intensity = gazeIntensity.value;

  let html = `<div style="display:flex; gap:25px;">
    <div>
      <h4 style="display:flex; align-items:center; gap:12px;">
        <img src="${cfg.icon}" style="width:40px; height:40px;">
        <span style="font-size:1.2rem;">${cfg.name}</span>
        <span style="font-size:0.75rem; color:${intensity>40?'#ff9a9a':'#a0d07a'};">Gaze ${intensity}%</span>
      </h4>
      <div style="display:grid; grid-template-columns:repeat(${GRID_SIZE},80px); gap:6px; margin:20px 0;">`;

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const node = expeditionMap[i][j];
      const isCurrent = (i === currentPosition.x && j === currentPosition.y);
      const isDiscovered = node.discovered;
      const isAdjacent = !isCurrent &&
        Math.abs(i - currentPosition.x) + Math.abs(j - currentPosition.y) === 1 &&
        movesRemaining > 0;

      let bg = '#1a100a';
      let content = '';
      let cursor = 'default';
      let extraStyle = '';

      if (!isDiscovered) {
        bg = '#0a0508'; content = '?';
      } else if (isCurrent) {
        bg = '#3a6a3a';
        content = `<img src="${activeEntityCard?.image ?? ''}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">`;
      } else {
        const icon = getNodeIcon(node.type);
        content = icon
          ? `<img src="${icon}" style="width:70%;height:70%;object-fit:contain;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6));">`
          : '·';
        switch (node.type) {
          case NodeType.EMPTY: bg = '#2a2a2a'; break;
          case NodeType.ENTRANCE: bg = '#4a6a4a'; break;
          case NodeType.EXIT: bg = '#6a4a2a'; break;
          case NodeType.RESOURCE: bg = '#2a6a2a'; break;
          case NodeType.WARD: bg = '#4a2a6a'; break;
          case NodeType.TRAP: bg = '#8a2a2a'; break;
          case NodeType.MINION: bg = '#6a2a2a'; break;
          case NodeType.ECHO: bg = '#4a6a8a'; break;
          case NodeType.HOLLOW_LAIR: bg = '#6a2a4a'; break;
        }
      }

      if (isAdjacent) {
        cursor = 'pointer';
        extraStyle += 'transform:scale(1.05); filter:brightness(1.3);';
      }
      if (isCurrent) {
        extraStyle += 'box-shadow:0 0 18px #3a6a3a; animation:entityPulse 2s infinite;';
      }
      if (node.type === NodeType.HOLLOW_LAIR && isDiscovered && !node.explored) {
        extraStyle += 'box-shadow:0 0 15px rgba(200,0,0,0.5);';
      }

      html += `<div data-x="${i}" data-y="${j}" class="maze-node"
                style="width:80px;height:80px;background:${bg};border:2px solid #5a4a3a;border-radius:10px;
                       display:flex;align-items:center;justify-content:center;font-size:22px;
                       cursor:${cursor};transition:all 0.2s ease;${extraStyle}">
                ${content}</div>`;
    }
  }

  html += `</div>
      <div style="display:flex; gap:12px; margin-top:12px;">
        <button id="expeditionRecallBtn" class="craft-btn" style="background:#5a2a2a;">🚨 Recall</button>
        <button id="expeditionRestBtn" class="craft-btn" ${movesRemaining > 0 ? 'disabled' : ''}>💤 Rest</button>
      </div>
    </div>
    <div style="min-width:250px; background:rgba(5,0,5,0.5); border:1px solid #5a4a3a; border-radius:12px; padding:15px;">
      <h4>🜁 ${activeEntityCard?.name || 'Entity'}</h4>
      <div class="stat-row" style="margin-bottom:8px;">
        <span>❤️ HP</span>
        <div class="progress-bar" style="flex:1; margin:0 10px;">
          <div id="entityHPBar" class="progress-fill" style="width:${(entityCurrentHP / entityMaxHP) * 100}%;"></div>
        </div>
        <span>${entityCurrentHP}/${entityMaxHP}</span>
      </div>
      <div class="stat-row"><span>👟 Moves</span><span>${movesRemaining} / ${(activeEntityCard?.stats as EntityStats)?.spd ?? 3}</span></div>
      <div class="stat-row"><span>🦊 Cunning</span><span>${(activeEntityCard?.stats as EntityStats)?.cun ?? 0}</span></div>
      <div class="stat-row"><span>⚔️ Attack</span><span>${(activeEntityCard?.stats as EntityStats)?.atk ?? 0}</span></div>
      <div style="margin-top:15px; max-height:220px; overflow-y:auto; font-size:0.85rem; background:rgba(0,0,0,0.3); padding:8px; border-radius:8px;" id="expeditionLog">
        ${expeditionLog.map(l => `<div>> ${l}</div>`).join('')}
      </div>
      <div style="margin-top:10px; font-size:0.7rem; color:#8a7a6a;">Explored: ${discoveredCount} tiles</div>
    </div>
  </div>`;

  container.innerHTML = html;

  container.querySelectorAll('[data-x]').forEach(el => {
    el.addEventListener('click', (e) => {
      const t = e.currentTarget as HTMLElement;
      const x = parseInt(t.dataset.x!), y = parseInt(t.dataset.y!);
      if (Math.abs(x - currentPosition.x) + Math.abs(y - currentPosition.y) === 1 && movesRemaining > 0) {
        handleMove(x, y);
        t.style.transform = 'scale(1.2)';
        setTimeout(() => { if (t) t.style.transform = ''; }, 150);
      }
    });
  });

  container.querySelector('#expeditionRecallBtn')?.addEventListener('click', () => endExpedition(true));
  container.querySelector('#expeditionRestBtn')?.addEventListener('click', handleRest);
  const logEl = document.getElementById('expeditionLog');
  if (logEl) logEl.scrollTop = logEl.scrollHeight;
}

/* ── Rest ──────────────────────────────────────────────────────── */
function handleRest(): void {
  if (movesRemaining > 0) return;
  const spd = (activeEntityCard?.stats as EntityStats)?.spd || 3;
  movesRemaining = spd;
  const heal = Math.max(3, Math.ceil(entityMaxHP * 0.25));
  entityCurrentHP = Math.min(entityMaxHP, entityCurrentHP + heal);
  expeditionLog.push(`${activeEntityCard?.name} rests, recovering ${spd} moves and ${heal} HP.`);
  playSfx('Path_Select');
  renderExpeditionUI();
}

/* ── Movement & node resolution ───────────────────────────────── */
function handleMove(x: number, y: number): void {
  if (!expeditionActive) return;
  currentPosition = { x, y };
  movesRemaining--;
  const node = expeditionMap[x][y];
  playSfx('Path_Select');
  spawnMoveParticle();

  if (!node.discovered) {
    node.discovered = true;
    discoveredCount++;
    revealAdjacent(x, y);

    switch (node.type) {
      case NodeType.EMPTY:        gatherScraps(); renderExpeditionUI(); break;
      case NodeType.RESOURCE:    handleResource(node); break;
      case NodeType.WARD:        handleWard(node); break;
      case NodeType.TRAP:        handleTrap(node); break;
      case NodeType.MINION:      handleMinion(node); break;
      case NodeType.ECHO:        handleEcho(node); break;
      case NodeType.HOLLOW_LAIR: handleHollow(node); break;
      case NodeType.EXIT:        endExpedition(true); return;
      default: renderExpeditionUI();
    }
  } else {
    expeditionLog.push('Already explored area.');
    renderExpeditionUI();
  }

  if (movesRemaining <= 0) {
    expeditionLog.push('Entity is exhausted.');
    renderExpeditionUI();
  }
}

function revealAdjacent(x: number, y: number): void {
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !expeditionMap[nx][ny].discovered) {
      expeditionMap[nx][ny].discovered = true;
      discoveredCount++;
    }
  }
}

function gatherScraps(): void {
  const res = ['nightshadeMoss', 'cryptPhlegm'];
  const resType = res[Math.floor(Math.random() * res.length)];
  const amt = 1 + (Math.random() < 0.5 ? 0 : 1);
  ingredients.value = { ...ingredients.value, [resType]: (ingredients.value[resType] || 0) + amt };
  expeditionLog.push(`Found ${amt} scrap of ${resType}.`);
}

function handleResource(node: MazeNode): void {
  const ing = node.resourceType!;
  let amt = node.resourceAmount || 2;
  amt = Math.floor(amt * (1 + gazeIntensity.value / 250));
  ingredients.value = { ...ingredients.value, [ing]: (ingredients.value[ing as keyof typeof ingredients.value] || 0) + amt };
  discover('ingredients', ing);
  expeditionLog.push(`Collected ${amt}x ${ing}!`);
  playSfx('Loot_Reveal');
  spawnResourceParticles();
  const grid = document.getElementById('expeditionGridContainer');
  if (grid) {
    const rect = grid.getBoundingClientRect();
    floatText(`+${amt} ${ing}`, rect.left + rect.width/2, rect.top + rect.height/2, '#7ea04b');
  }
  renderExpeditionUI();
}

/* ── Ward mini‑game ───────────────────────────────────────────── */
async function handleWard(node: MazeNode): Promise<void> {
  if (!expeditionActive) return;
  playSfx('Ward_Trigger');
  const diff = node.wardDifficulty || 10;
  const playerCun = (activeEntityCard?.stats as EntityStats)?.cun || 0;
  const timeWindow = Math.max(2500, 5000 - diff * 80 + playerCun * 200);
  const success = await startRuneWardChallenge(diff, timeWindow);
  if (success) {
    expeditionLog.push('Ward dispelled!');
    node.explored = true;
    renderExpeditionUI();
  } else {
    const dmg = Math.max(2, Math.floor(diff / 5));
    entityCurrentHP -= dmg;
    expeditionLog.push(`Ward repels you! -${dmg} HP.`);
    if (entityCurrentHP <= 2) {
      expeditionLog.push('Too injured to continue – retreat!');
      endExpedition(false);
    } else {
      renderExpeditionUI();
    }
  }
}

async function startRuneWardChallenge(difficulty: number, timeLimit: number): Promise<boolean> {
  const RUNES = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'];
  const target = RUNES[Math.floor(Math.random() * RUNES.length)];
  const options = [target];
  while (options.length < 3) {
    const r = RUNES[Math.floor(Math.random() * RUNES.length)];
    if (!options.includes(r)) options.push(r);
  }
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width:480px; text-align:center; background:radial-gradient(circle at center, #1a0a1a, #0a0508); border:2px solid #b8a070;">
        <h3 style="color:#d4af37;">🛡️ Break the Ward</h3>
        <p style="color:#c0b0a0;">Click the matching rune before time runs out.</p>
        <div style="font-size:4rem; margin:20px 0; color:#ffd700; text-shadow:0 0 30px #ffd700; animation:runeGlow 0.5s ease-in-out infinite alternate;" id="wardTarget">${target}</div>
        <div style="display:flex; gap:20px; justify-content:center; margin:20px 0;" id="wardChoices"></div>
        <div class="progress-bar" style="height:8px; background:#2a2a2a;"><div id="wardTimerBar" class="progress-fill" style="width:100%; height:100%; background:#7ea04b;"></div></div>
        <p style="font-size:0.7rem; color:#8a7a6a;">Time remaining</p>
      </div>`;
    document.body.appendChild(overlay);

    const startTime = Date.now();
    const timerBar = overlay.querySelector('#wardTimerBar')! as HTMLElement;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.max(0, 100 - (elapsed / timeLimit) * 100);
      timerBar.style.width = `${pct}%`;
      if (pct < 30) timerBar.style.background = '#ff4444';
      if (elapsed >= timeLimit) {
        clearInterval(interval);
        overlay.remove();
        resolve(false);
      }
    }, 50);

    const choicesDiv = overlay.querySelector('#wardChoices')!;
    options.forEach(rune => {
      const btn = document.createElement('button');
      btn.textContent = rune;
      btn.className = 'craft-btn';
      btn.style.cssText = 'font-size:2rem; padding:15px 25px; min-width:80px; transition:all 0.15s; background:#2a1a2a;';
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
      btn.addEventListener('click', () => {
        clearInterval(interval);
        overlay.remove();
        resolve(rune === target);
      });
      choicesDiv.appendChild(btn);
    });
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearInterval(interval);
        overlay.remove();
        resolve(false);
      }
    });
  });
}

/* ── Trap ──────────────────────────────────────────────────────── */
function handleTrap(node: MazeNode): void {
  const stats = activeEntityCard?.stats as EntityStats;
  const cun = (stats?.cun || 0) + (getAspectSynergyBonus().cun || 0);
  const diff = node.trapDifficulty || 12;
  const playerAdvantage = getDifficultyOffset();
  const roll = Math.floor(Math.random() * 20) + cun * playerAdvantage;
  playSfx('Trap_Trigger');
  if (roll >= diff) {
    expeditionLog.push('Trap disarmed safely.');
  } else {
    const dmg = Math.max(2, Math.floor(6 * (1 - playerAdvantage * 0.1)));
    entityCurrentHP -= dmg;
    expeditionLog.push(`Trap triggered! -${dmg} HP.`);
    spawnTrapParticles();
    if (entityCurrentHP <= 2) {
      expeditionLog.push('Entity barely survived – forced retreat.');
      endExpedition(false);
      return;
    }
  }
  renderExpeditionUI();
}

/* ── Minion ────────────────────────────────────────────────────── */
function handleMinion(node: MazeNode): void {
  playSfx('Maze_Send');
  const basePower = node.minionPower || 8;
  const scaling = getEnemyScaling();
  const minionHP = Math.floor(basePower * scaling);
  const minionAtk = Math.floor((2 + gazeIntensity.value * 0.05) * scaling);

  const minionCard: Card = {
    id: 'minion', name: "Kalgoth's Minion", type: 'entity', rarity: 'common', aspect: 'Void',
    image: `${BASE}Images/Kalgoths_Minion_01.png`,
    frame: `${BASE}Images/Game Art/Frame Overlays/Common Frame.png`,
    stats: {
      hp: minionHP, atk: minionAtk,
      spd: 0, cun: 0, def: 0, res: 0, init: 2, loyalty: 100
    }
  };

  const playerCard = activeEntityCard;
  if (!playerCard) { renderExpeditionUI(); return; }
  const enhancedStats = getEnhancedStats(playerCard.id) || (playerCard.stats as EntityStats);
  const synergy = getAspectSynergyBonus();
  const fullStats: EntityStats = {
    ...enhancedStats,
    hp: (enhancedStats.hp || 0) + (synergy.hp || 0),
    atk: (enhancedStats.atk || 0) + (synergy.atk || 0),
    def: (enhancedStats.def || 0) + (synergy.def || 0),
    cun: (enhancedStats.cun || 0) + (synergy.cun || 0),
    spd: (enhancedStats.spd || 0) + (synergy.spd || 0),
    init: (enhancedStats.init || 0) + (synergy.init || 0),
    res: (enhancedStats.res || 0) + (synergy.res || 0),
    loyalty: enhancedStats.loyalty,
  };
  const enhancedPlayer = { ...playerCard, stats: fullStats };

  openCardBattleModal({
    enemyCard: minionCard,
    playerCard: enhancedPlayer,
    advantage: Math.min(3, Math.floor(getDifficultyOffset() - 1)),
    isMazeMinion: true,
    onVictory: () => {
      const ichor = Math.floor((1 + Math.random() * 3) * (1 + gazeIntensity.value / 150));
      ingredients.value = { ...ingredients.value, demonIchor: ingredients.value.demonIchor + ichor };
      expeditionLog.push(`Minion defeated! +${ichor} Ichor.`);
      node.explored = true;
      renderExpeditionUI();
      const grid = document.getElementById('expeditionGridContainer');
      if (grid) {
        const rect = grid.getBoundingClientRect();
        floatText(`+${ichor} Ichor`, rect.left + rect.width/2, rect.top + rect.height/2, '#ff6666');
      }
    },
    onDefeat: () => {
      expeditionLog.push(`${activeEntityCard?.name} was overwhelmed!`);
      endExpedition(false);
    },
    onFlee: () => {
      expeditionLog.push('Fled from minion.');
      renderExpeditionUI();
    },
  });
}

/* ── Echo ──────────────────────────────────────────────────────── */
function handleEcho(_node: MazeNode): void {
  playSfx('echo_found');
  const reward = getEchoReward(selectedPathId);
  addCard(reward.id, 1);
  expeditionLog.push(`Echo reveals ${reward.name} (${reward.rarity})!`);
  renderExpeditionUI();
}

/* ── Hollow Lair ───────────────────────────────────────────────── */
function handleHollow(node: MazeNode): void {
  playSfx('hollow_lair_discover');
  getKalgothAction(createDummyBattleState(), createDummyPlayerCard(), createDummyEnemyCard())
    .then(({ banter }) => {
      if (banter) expeditionLog.push(`KALGOTH: ${banter}`);
    })
    .catch(() => {});

  const fragIdx = node.hollowFragmentIndex || orbexFragments.value + 1;
  openWillDuel({
    hollowName: `Hollow Acolyte (Fragment ${fragIdx})`,
    hollowPortrait: `${BASE}Images/Hollow_Portrait.png`,
    fragmentIndex: fragIdx,
    baseResistance: 15 + fragIdx * 2 + Math.floor(gazeIntensity.value / 15),
    onVictory: () => {
      orbexFragments.value = Math.min(maxOrbexFragments.value, orbexFragments.value + 1);
      gazeIntensity.value = Math.min(100, gazeIntensity.value + 10);
      expeditionLog.push(`Hollow purified! Fragment ${orbexFragments.value}/${maxOrbexFragments.value}.`);
      const rewardCard = getHollowReward(fragIdx);
      addCard(rewardCard.id, 1);
      expeditionLog.push(`Gained ${rewardCard.name} (${rewardCard.rarity}).`);
      node.explored = true;
      renderExpeditionUI();
    },
    onDefeat: () => {
      expeditionLog.push('Hollow escapes.');
      renderExpeditionUI();
    },
  });
}

/* ── Expedition end ────────────────────────────────────────────── */
function endExpedition(success: boolean): void {
  expeditionActive = false;
  if (currentPhase.value.status === 'expedition') {
    transition({ type: 'EXPEDITION_COMPLETE' });
  }
  stopLoop('demonSummonBg');
  const modal = el('expeditionModal');
  if (modal) modal.style.display = 'none';

  if (success) {
    addLog(`${activeEntityCard?.name} returns unscathed.`, false, 'player');
    addFamiliarXP(10 + Math.floor(gazeIntensity.value / 10));
    addMasteryXP(15 + Math.floor(gazeIntensity.value / 5));
    addLedgerEntry('explore', { success: true, path: selectedPathId, tiles: discoveredCount });

    // Escape unlock when player has 6 fragments and 100 circle power
    if (orbexFragments.value >= 6 && circlePower.value >= 100) {
      hasSpecialIngredient.value = true;
      addLog('Something clicks. The final piece is yours. Escape is now possible.', false, 'player');
    }
  } else {
    addLog(`${activeEntityCard?.name} was forced to abandon the expedition.`, true);
  }
  totalExplorations.value++;
  autoSave();
}

/* ── Path selection modal ─────────────────────────────────────── */
export function showPathSelectionModal(): void {
  const equipped = getEquippedCards('entity');
  if (!equipped.length) { addLog('No entities equipped.', true); return; }
  const overlay = document.createElement('div');
  overlay.className = 'modal'; overlay.style.display = 'flex'; overlay.style.zIndex = '2500';

  let eHtml = '';
  equipped.forEach(card => {
    const s = card.stats as EntityStats;
    eHtml += `<div class="entity-option" data-eid="${card.id}"
               style="display:flex;align-items:center;gap:15px;background:rgba(20,5,20,0.9);border:1px solid #5a4a3a;border-radius:12px;padding:15px;margin:10px 0;cursor:pointer;">
               <img src="${card.image}" style="width:60px;height:80px;object-fit:cover;border-radius:8px;">
               <div><h4 style="margin:0 0 5px;color:#d4af37;">${card.name}</h4>
               <p style="margin:0;font-size:0.8rem;">❤️${s.hp} ⚔️${s.atk} 👟${s.spd} 🦊${s.cun}</p></div></div>`;
  });
  let pHtml = '';
  Object.entries(BASE_PATH_CONFIGS).forEach(([id, cfg]) => {
    if (!mazePathsUnlocked.value.includes(id)) return;
    const sc = getScaledPathConfig(id);
    const threat = Math.floor((sc.wardChance + sc.trapChance + sc.minionChance) * 100);
    pHtml += `<div class="path-option" data-path="${id}"
               style="display:flex;align-items:center;gap:15px;background:rgba(20,5,20,0.9);border:1px solid #5a4a3a;border-radius:12px;padding:15px;margin:10px 0;cursor:pointer;">
               <img src="${cfg.icon}" style="width:50px;height:50px;">
               <div><h4 style="margin:0 0 5px;color:#d4af37;">${cfg.name}</h4>
               <p style="margin:0;font-size:0.8rem;">${cfg.desc}<br><span style="color:#ff6666;">Threat: ${threat}%</span></p></div></div>`;
  });
  overlay.innerHTML = `<div class="modal-content" style="max-width:650px; background:radial-gradient(circle at top, #1a0a1a, #0a0508);">
    <h3>🗺️ Choose Entity</h3>${eHtml}
    <h3 style="margin-top:20px;">Choose Path</h3>${pHtml}
    <button id="cancelPathBtn" class="craft-btn">Cancel</button></div>`;
  document.body.appendChild(overlay);

  let selectedEntityId: string | null = null;
  overlay.querySelectorAll('.entity-option').forEach(el =>
    el.addEventListener('click', () => {
      overlay.querySelectorAll('.entity-option').forEach(e => (e as HTMLElement).style.border = '1px solid #5a4a3a');
      (el as HTMLElement).style.border = '2px solid #d4af37';
      selectedEntityId = (el as HTMLElement).dataset.eid!;
    })
  );
  overlay.querySelectorAll('.path-option').forEach(el =>
    el.addEventListener('click', () => {
      if (!selectedEntityId) { addLog('Select an entity first.', true); return; }
      const path = (el as HTMLElement).dataset.path!;
      overlay.remove();
      startExpedition(selectedEntityId, path);
    })
  );
  overlay.querySelector('#cancelPathBtn')!.addEventListener('click', () => overlay.remove());
}

/* ── Particles ─────────────────────────────────────────────────── */
function spawnMoveParticle() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;';
  for (let i=0;i<5;i++) {
    const p = document.createElement('div');
    p.style.cssText = 'position:absolute;width:3px;height:3px;background:#ffd700;border-radius:50%;box-shadow:0 0 5px #ffd700;animation:moveParticle 0.5s ease-out forwards;';
    p.style.left='50%'; p.style.top='50%';
    p.style.setProperty('--dx', `${(Math.random()-0.5)*35}px`);
    p.style.setProperty('--dy', `${(Math.random()-0.5)*35}px`);
    el.appendChild(p);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}
function spawnResourceParticles() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;';
  for (let i=0;i<10;i++) {
    const p = document.createElement('div');
    p.style.cssText = 'position:absolute;width:5px;height:5px;background:#7ea04b;border-radius:50%;box-shadow:0 0 7px #7ea04b;animation:resourcePop 0.8s ease-out forwards;';
    p.style.left='50%'; p.style.top='50%';
    p.style.setProperty('--dx', `${(Math.random()-0.5)*50}px`);
    p.style.setProperty('--dy', `${(Math.random()-0.5)*50-15}px`);
    el.appendChild(p);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}
function spawnTrapParticles() {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:9999;';
  for (let i=0;i<7;i++) {
    const p = document.createElement('div');
    p.style.cssText = 'position:absolute;width:4px;height:4px;background:#ff4444;border-radius:50%;box-shadow:0 0 8px #ff4444;animation:moveParticle 0.6s ease-out forwards;';
    p.style.left='50%'; p.style.top='50%';
    p.style.setProperty('--dx', `${(Math.random()-0.5)*45}px`);
    p.style.setProperty('--dy', `${(Math.random()-0.5)*45}px`);
    el.appendChild(p);
  }
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

const particleStyle = document.createElement('style');
particleStyle.textContent = `
  @keyframes moveParticle { 0%{opacity:1;transform:translate(0,0);} 100%{opacity:0;transform:translate(var(--dx),var(--dy));} }
  @keyframes resourcePop { 0%{opacity:1;transform:translate(0,0) scale(0.5);} 100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1.2);} }
  @keyframes entityPulse { 0%{transform:scale(1);} 50%{transform:scale(1.04);} 100%{transform:scale(1);} }
  @keyframes floatUp { 0%{opacity:1; transform:translateY(0);} 100%{opacity:0; transform:translateY(-50px);} }
  @keyframes runeGlow { 0%{text-shadow:0 0 20px #ffd700;} 100%{text-shadow:0 0 40px #ffd700, 0 0 60px #ff8800;} }
`;
document.head.appendChild(particleStyle);

/* ── Dummy data helpers for AI taunts ─────────────────────────── */
function createDummyBattleState() {
  return {
    playerHP: 100, playerMaxHP: 100, playerAttack: 10, playerDefense: 0,
    playerResistance: 0, playerMomentum: 0, playerIsDefending: false,
    enemyHP: 100, enemyMaxHP: 100, enemyAttack: 10, enemyDefense: 0,
    enemyResistance: 0, enemyMomentum: 0, enemyIsDefending: false,
    battleLog: ['Exploring the Undercrypt.'],
    playerAbilities: [], enemyAbilities: [], hand: [], turn: 'player',
    advantage: 0, canFlee: false, fleeAttempts: 0,
    playerStatusEffects: [], enemyStatusEffects: [],
    turnCount: 0, enemyTelegraphed: false,
    playerIntent: null, enemyIntent: 'attack', telegraphEffect: 'none',
    playerActionHistory: [], enemyActionHistory: [], enemyDelayTurns: 0,
  } as any;
}

function createDummyPlayerCard() {
  return {
    id: 'umbral_mite', name: 'Acolyte', type: 'entity', rarity: 'common', aspect: 'Void',
    image: '', frame: '',
    stats: { hp: 20, atk: 3, def: 1, res: 10, spd: 3, cun: 2, init: 3, loyalty: 70 },
    abilities: [],
  } as any;
}

function createDummyEnemyCard() {
  return {
    id: 'kalgoth_echo', name: 'Kalgoth\'s Echo', type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: '', frame: '',
    stats: { hp: 200, atk: 15, def: 10, res: 30, spd: 5, cun: 5, init: 10, loyalty: 0 },
    abilities: [],
  } as any;
}

export let unlockOrbexBoon: (() => void) | null = null;
export function setUnlockBoonCallback(cb: () => void) { unlockOrbexBoon = cb; }
export function closeMazeModal() { const m = el('mazeModal'); if (m) m.style.display = 'none'; }