// js/core/events.ts
// All game events and their payload types.

import type { Card } from '../data/cards.js';

export interface SummonVictoryPayload {
  entityCard: Card;
  choice: 'barter' | 'destroy' | 'ensnare';
  tier: number;
}

export interface SummonDefeatPayload {
  entityCard: Card;
  tier: number;
}

export interface TithePaidPayload {
  ichorCost: number;
}

export interface GazeSurvivedPayload {
  intensity: number;
  ichorReward: number;
}

export interface GazeDefeatPayload {}

export interface FragmentCollectedPayload {
  fragmentIndex: number;
  totalFragments: number;
}

export interface CircleTracedPayload {
  quality: number;
}

export interface WhispMessagePayload {
  text: string;
  speaker?: string; // 'zelion' | 'player' | 'system'
}

export interface BattleClashPayload { playerCard: any; enemyCard: any; }
export interface BattleAdvicePayload { message: string; }
export interface BattleEndPayload { result: 'victory' | 'defeat' | 'flee'; playerCard: any; enemyCard: any; }

export const GameEvents = {
  SUMMON_VICTORY: 'summon:victory',
  SUMMON_DEFEAT: 'summon:defeat',
  TITHE_PAID: 'tithe:paid',
  GAZE_SURVIVED: 'gaze:survived',
  GAZE_DEFEAT: 'gaze:defeat',
  FRAGMENT_COLLECTED: 'fragment:collected',
  BATTLE_CLASH_START: 'battle:clash_start',
  BATTLE_CLASH_END: 'battle:clash_end',
  BATTLE_ADVICE: 'battle:advice',
  BATTLE_END: 'battle:end',
  WHISP_MESSAGE: 'whisp:message',
  CIRCLE_TRACED: 'circle:traced',
} as const;



