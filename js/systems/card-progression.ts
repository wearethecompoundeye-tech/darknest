// js/systems/card-progression.ts
// Complete card progression system: combos, enhancement scaling, land generation, aspect synergies
// Full file - no snippets

import { 
  equippedEntitySlots, 
  equippedLandSlots,
  ownedCards
} from '../core/state-signals.js';
import { allCards, getCardById, type Card, type EntityStats, type CardRarity } from '../data/cards.js';

// ========== COMBO SYSTEM ==========
export interface ActiveCombo {
  cardIds: string[];
  effect: string;
  bonus: Partial<EntityStats>;
}

export function checkForCombos(): ActiveCombo[] {
  const combos: ActiveCombo[] = [];
  const equippedIds = equippedEntitySlots.value.filter(id => id && id.length > 0);
  
  for (const cardId of equippedIds) {
    const card = getCardById(cardId);
    if (!card?.comboWith) continue;
    
    const comboCards = [cardId, ...card.comboWith];
    const allEquipped = comboCards.every(id => equippedIds.includes(id));
    
    if (allEquipped) {
      combos.push({
        cardIds: comboCards,
        effect: card.comboEffect || 'Synergy activated!',
        bonus: parseComboBonus(card.comboEffect)
      });
    }
  }
  
  const uniqueCombos: ActiveCombo[] = [];
  const seenSets = new Set<string>();
  for (const combo of combos) {
    const sortedIds = [...combo.cardIds].sort().join(',');
    if (!seenSets.has(sortedIds)) {
      seenSets.add(sortedIds);
      uniqueCombos.push(combo);
    }
  }
  
  return uniqueCombos;
}

function parseComboBonus(effect: string | undefined): Partial<EntityStats> {
  const bonus: Partial<EntityStats> = {};
  if (!effect) return bonus;
  
  if (effect.includes('+1 ATK')) bonus.atk = (bonus.atk || 0) + 1;
  if (effect.includes('+2 ATK')) bonus.atk = (bonus.atk || 0) + 2;
  if (effect.includes('+1 HP')) bonus.hp = (bonus.hp || 0) + 1;
  if (effect.includes('+2 HP')) bonus.hp = (bonus.hp || 0) + 2;
  if (effect.includes('+1 SPD')) bonus.spd = (bonus.spd || 0) + 1;
  if (effect.includes('+1 CUN')) bonus.cun = (bonus.cun || 0) + 1;
  if (effect.includes('+1 DEF')) bonus.def = (bonus.def || 0) + 1;
  if (effect.includes('+1 RES')) bonus.res = (bonus.res || 0) + 1;
  if (effect.includes('+1 INIT')) bonus.init = (bonus.init || 0) + 1;
  
  return bonus;
}

export function applyComboBonuses(baseStats: EntityStats, cardId: string): EntityStats {
  const combos = checkForCombos();
  const relevantCombo = combos.find(c => c.cardIds.includes(cardId));
  
  if (!relevantCombo) return baseStats;
  
  return {
    hp: baseStats.hp + (relevantCombo.bonus.hp || 0),
    atk: baseStats.atk + (relevantCombo.bonus.atk || 0),
    def: baseStats.def + (relevantCombo.bonus.def || 0),
    res: baseStats.res + (relevantCombo.bonus.res || 0),
    spd: baseStats.spd + (relevantCombo.bonus.spd || 0),
    cun: baseStats.cun + (relevantCombo.bonus.cun || 0),
    init: baseStats.init + (relevantCombo.bonus.init || 0),
    loyalty: baseStats.loyalty
  };
}

// ========== ENHANCEMENT SCALING ==========
export function getEnhancementBonus(enhancementLevel: number): Partial<EntityStats> {
  return {
    hp: enhancementLevel * 1,
    atk: Math.floor(enhancementLevel / 2),
    def: Math.floor(enhancementLevel / 3),
    res: Math.floor(enhancementLevel / 3),
    spd: 0,
    cun: 0,
    init: 0,
    loyalty: 0
  };
}

export function getEnhancedStats(cardId: string): EntityStats | null {
  const card = getCardById(cardId);
  if (!card || card.type !== 'entity') return null;
  
  const baseStats = card.stats as EntityStats;
  if (!baseStats) return null;
  
  const owned = ownedCards.value.find(c => c.cardId === cardId);
  const enhancementLevel = owned?.enhancementLevel || 0;
  
  const enhancementBonus = getEnhancementBonus(enhancementLevel);
  
  const stats: EntityStats = {
    hp: baseStats.hp + (enhancementBonus.hp || 0),
    atk: baseStats.atk + (enhancementBonus.atk || 0),
    def: baseStats.def + (enhancementBonus.def || 0),
    res: baseStats.res + (enhancementBonus.res || 0),
    spd: baseStats.spd + (enhancementBonus.spd || 0),
    cun: baseStats.cun + (enhancementBonus.cun || 0),
    init: baseStats.init + (enhancementBonus.init || 0),
    loyalty: baseStats.loyalty
  };
  
  return stats;
}

// ========== ASPECT SYNERGY BONUSES ==========
export function getAspectSynergyBonus(): Partial<EntityStats> {
  const equipped = equippedEntitySlots.value.filter(id => id && id.length > 0);
  if (equipped.length === 0) return {};
  
  const aspects = equipped.map(id => getCardById(id)?.aspect).filter(a => a) as string[];
  
  const aspectCounts: Record<string, number> = {};
  for (const aspect of aspects) {
    aspectCounts[aspect] = (aspectCounts[aspect] || 0) + 1;
  }
  
  const bonus: Partial<EntityStats> = {};
  
  for (const [aspect, count] of Object.entries(aspectCounts)) {
    if (count >= 2) {
      const primaryStat = getAspectPrimaryStat(aspect);
      bonus[primaryStat] = (bonus[primaryStat] || 0) + 1;
    }
    if (count >= 3) {
      const primaryStat = getAspectPrimaryStat(aspect);
      const secondaryStat = getAspectSecondaryStat(aspect);
      bonus[primaryStat] = (bonus[primaryStat] || 0) + 1;
      bonus[secondaryStat] = (bonus[secondaryStat] || 0) + 1;
    }
    if (count >= 4) {
      bonus.hp = (bonus.hp || 0) + 3;
    }
  }
  
  return bonus;
}

function getAspectPrimaryStat(aspect: string): keyof EntityStats {
  const map: Record<string, keyof EntityStats> = {
    'Void': 'cun',
    'Fire': 'atk',
    'Earth': 'def',
    'Air': 'spd',
    'Water': 'res',
    'Life': 'hp',
    'Death': 'atk'
  };
  return map[aspect] || 'hp';
}

function getAspectSecondaryStat(aspect: string): keyof EntityStats {
  const map: Record<string, keyof EntityStats> = {
    'Void': 'init',
    'Fire': 'init',
    'Earth': 'hp',
    'Air': 'cun',
    'Water': 'def',
    'Life': 'res',
    'Death': 'cun'
  };
  return map[aspect] || 'atk';
}

// ========== LAND GENERATION ==========
export function processLandGeneration(): { resource: string; amount: number }[] {
  const generation: { resource: string; amount: number }[] = [];
  const landIds = equippedLandSlots.value.filter(id => id && id.length > 0);
  
  for (const landId of landIds) {
    const land = getCardById(landId);
    if (!land || land.type !== 'land') continue;
    
    const stats = land.stats as any;
    if (stats?.generation) {
      generation.push({
        resource: stats.generation.resource,
        amount: stats.generation.amount
      });
    }
  }
  
  return generation;
}

// ========== CARD UPGRADE SYSTEM ==========
export function canUpgradeCard(cardId: string): boolean {
  const owned = ownedCards.value.find(c => c.cardId === cardId);
  if (!owned) return false;
  
  const card = getCardById(cardId);
  if (!card) return false;
  
  if (owned.quantity < 3) return false;
  if (owned.enhancementLevel >= 5) return false;
  
  return true;
}

export function upgradeCard(cardId: string): boolean {
  if (!canUpgradeCard(cardId)) return false;
  
  const owned = ownedCards.value.find(c => c.cardId === cardId);
  if (!owned) return false;
  
  owned.quantity -= 2;
  owned.enhancementLevel += 1;
  ownedCards.value = [...ownedCards.value];
  
  return true;
}

// ========== LOYALTY SYSTEM ==========
export function calculateLoyaltyDecay(entityId: string, expeditionTurns: number): number {
  const card = getCardById(entityId);
  if (!card || card.type !== 'entity') return 0;
  
  const stats = card.stats as EntityStats;
  const baseLoyalty = stats.loyalty || 50;
  
  const decay = Math.min(baseLoyalty - 10, expeditionTurns * 2);
  return Math.max(0, decay);
}

export function checkLoyaltyFlee(entityId: string, currentLoyalty: number): boolean {
  if (currentLoyalty < 30) {
    return Math.random() < 0.1;
  }
  if (currentLoyalty < 10) {
    return Math.random() < 0.5;
  }
  return false;
}

// ========== CARD COLLECTION STATISTICS ==========
export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  byRarity: Record<CardRarity, number>;
  byType: Record<string, number>;
  completionPercentage: number;
}

export function getCollectionStats(): CollectionStats {
  const owned = ownedCards.value;
  const allCardIds = allCards.map(c => c.id);
  
  const stats: CollectionStats = {
    totalCards: owned.reduce((sum, c) => sum + c.quantity, 0),
    uniqueCards: owned.length,
    byRarity: { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
    byType: { entity: 0, spell: 0, enhancement: 0, land: 0 },
    completionPercentage: 0
  };
  
  for (const ownedCard of owned) {
    const card = getCardById(ownedCard.cardId);
    if (card) {
      stats.byRarity[card.rarity] = (stats.byRarity[card.rarity] || 0) + 1;
      stats.byType[card.type] = (stats.byType[card.type] || 0) + 1;
    }
  }
  
  stats.completionPercentage = (owned.length / allCardIds.length) * 100;
  
  return stats;
}