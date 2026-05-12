// js/systems/maze-system.ts – Maze expedition system with node types, events, and rewards
import { signal } from '@preact/signals-core';
import {
  ingredients,
  crafted,
  will,
  health,
  orbexFragments,
  maxOrbexFragments,
  circleMastery,
  addMasteryXP,
  updateState,
  discover,
  autoSave
} from '../core/state-signals.js';
import { addLog } from '../ui/log-manager.js';
import { playSfx } from '../audio/sfx.js';

export enum NodeType {
  ENTRANCE = 'ENTRANCE',
  EXIT = 'EXIT',
  RESOURCE = 'RESOURCE',
  WARD = 'WARD',
  TRAP = 'TRAP',
  MINION = 'MINION',
  ECHO = 'ECHO',
  HOLLOW_LAIR = 'HOLLOW_LAIR'
}

export interface MazeNode {
  id: string;
  type: NodeType;
  row: number;
  col: number;
  icon: string;
  revealed: boolean;
  resolved: boolean;
  data?: any;
}

export const mazeNodes = signal<MazeNode[]>([]);
export const mazeActive = signal(false);
export const mazePlayerPosition = signal<{ row: number; col: number }>({ row: 0, col: 0 });

const GRID_SIZE = 5;

function getNodeIcon(type: NodeType): string {
  switch (type) {
    case NodeType.ENTRANCE: return `${import.meta.env.BASE_URL}Images/Maze Door.png`;
    case NodeType.EXIT:     return `${import.meta.env.BASE_URL}Images/Maze Door.png`;
    case NodeType.RESOURCE: return `${import.meta.env.BASE_URL}Images/Game Art/Maze/Resource.png`;
    case NodeType.WARD:     return `${import.meta.env.BASE_URL}Images/Icon_Ward.png`;
    case NodeType.TRAP:     return `${import.meta.env.BASE_URL}Images/Icon_Trap.png`;
    case NodeType.MINION:   return `${import.meta.env.BASE_URL}Images/Kalgoths_Minion_01.png`;
    case NodeType.ECHO:     return `${import.meta.env.BASE_URL}Images/Wisp Icon.png`;
    case NodeType.HOLLOW_LAIR: return `${import.meta.env.BASE_URL}Images/Game Art/Maze/Hollow Lair.png`;
    default: return '';
  }
}

export function generateMaze(): void {
  const nodes: MazeNode[] = [];
  // Place entrance at top-left
  nodes.push({
    id: `node-0-0`,
    type: NodeType.ENTRANCE,
    row: 0, col: 0,
    icon: getNodeIcon(NodeType.ENTRANCE),
    revealed: true,
    resolved: false
  });
  // Place exit at bottom-right
  nodes.push({
    id: `node-${GRID_SIZE-1}-${GRID_SIZE-1}`,
    type: NodeType.EXIT,
    row: GRID_SIZE-1, col: GRID_SIZE-1,
    icon: getNodeIcon(NodeType.EXIT),
    revealed: false,
    resolved: false
  });

  // Fill remaining cells with random types
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if ((r === 0 && c === 0) || (r === GRID_SIZE-1 && c === GRID_SIZE-1)) continue;
      const rand = Math.random();
      let type: NodeType;
      if (rand < 0.2) type = NodeType.RESOURCE;
      else if (rand < 0.35) type = NodeType.WARD;
      else if (rand < 0.5) type = NodeType.TRAP;
      else if (rand < 0.65) type = NodeType.MINION;
      else if (rand < 0.8) type = NodeType.ECHO;
      else type = NodeType.HOLLOW_LAIR;

      nodes.push({
        id: `node-${r}-${c}`,
        type,
        row: r, col: c,
        icon: getNodeIcon(type),
        revealed: false,
        resolved: false
      });
    }
  }

  mazeNodes.value = nodes;
  mazeActive.value = true;
  mazePlayerPosition.value = { row: 0, col: 0 };
  addLog('A dark maze opens before you...', false, 'orbex');
}

export function moveToNode(row: number, col: number): void {
  if (!mazeActive.value) return;
  const current = mazePlayerPosition.value;
  // Must be adjacent
  if (Math.abs(row - current.row) + Math.abs(col - current.col) !== 1) return;

  const node = mazeNodes.value.find(n => n.row === row && n.col === col);
  if (!node || node.resolved) return;

  mazePlayerPosition.value = { row, col };
  revealNode(node);
  resolveNode(node);
}

function revealNode(node: MazeNode): void {
  if (!node.revealed) {
    node.revealed = true;
    mazeNodes.value = [...mazeNodes.value]; // trigger reactivity
  }
}

function resolveNode(node: MazeNode): void {
  switch (node.type) {
    case NodeType.RESOURCE:
      handleResource(node);
      break;
    case NodeType.WARD:
      handleWard(node);
      break;
    case NodeType.TRAP:
      handleTrap(node);
      break;
    case NodeType.MINION:
      handleMinion(node);
      break;
    case NodeType.ECHO:
      handleEcho(node);
      break;
    case NodeType.HOLLOW_LAIR:
      handleHollowLair(node);
      break;
    case NodeType.EXIT:
      handleExit(node);
      break;
  }
  node.resolved = true;
  mazeNodes.value = [...mazeNodes.value];
}

function handleResource(node: MazeNode): void {
  const resourceType = Math.random() > 0.5 ? 'nightshadeMoss' : 'cryptPhlegm';
  updateState(() => {
    ingredients.value = {
      ...ingredients.value,
      [resourceType]: (ingredients.value[resourceType] || 0) + 2
    };
  });
  discover('ingredients', resourceType);
  playSfx('Loot_Reveal');
  addLog(`You found ${resourceType === 'nightshadeMoss' ? '🌿 Nightshade Moss' : '💧 Crypt Phlegm'}!`, false, 'player');
}

function handleWard(node: MazeNode): void {
  will.value = Math.min(maxWill.value, will.value + 10);
  playSfx('Ward_Trigger');
  addLog('A protective ward restores some Will.', false, 'player');
}

function handleTrap(node: MazeNode): void {
  health.value = Math.max(0, health.value - 10);
  will.value = Math.max(0, will.value - 5);
  playSfx('trap_spring');
  addLog('A trap springs! You take damage.', true);
}

function handleMinion(node: MazeNode): void {
  // Simplified minion fight
  const playerPower = will.value + circleMastery.value * 2;
  const minionPower = 10 + Math.floor(Math.random() * 15);
  if (playerPower >= minionPower) {
    ingredients.value.demonIchor += 2;
    addMasteryXP(3);
    playSfx('captureDemon');
    addLog('You dispatch a minion and collect Ichor.', false, 'player');
  } else {
    health.value = Math.max(0, health.value - 15);
    playSfx('demonFailReaction');
    addLog('The minion overpowers you!', true);
  }
}

function handleEcho(node: MazeNode): void {
  const fragmentChance = 0.3 + (orbexFragments.value * 0.1);
  if (orbexFragments.value < maxOrbexFragments.value && Math.random() < fragmentChance) {
    orbexFragments.value++;
    playSfx('Fragment_Get');
    addLog('You found an Orbex Fragment!', false, 'orbex');
  } else {
    playSfx('echo_found');
    addLog('A faint echo whispers but holds nothing.', false);
  }
}

function handleHollowLair(node: MazeNode): void {
  playSfx('hollow_lair_discover');
  addLog('💀 A Hollow Acolyte stirs...', true, 'demon');
  // Will trigger the Will Duel via game bus (handled elsewhere)
  window.dispatchEvent(new CustomEvent('darknest:hollow-encounter', {
    detail: { fragmentIndex: orbexFragments.value }
  }));
}

function handleExit(node: MazeNode): void {
  playSfx('mazeExit');
  addLog('You found the exit! The maze fades away.', false, 'orbex');
  mazeActive.value = false;
  autoSave();
}
// Stub for game.ts compatibility
export function showPathSelectionModal() { console.warn('Maze path selection not implemented in new system.'); }
