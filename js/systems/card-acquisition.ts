// js/systems/card-acquisition.ts
// Weighted card acquisition system with progression scaling
// Complete file - no snippets

import { allCards, type Card, type CardRarity } from '../data/cards.js';
import { circleMastery, orbexFragments } from '../core/state-signals.js';

// ========== RARITY WEIGHT TABLES ==========
const RARITY_WEIGHTS: Record<CardRarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  epic: 4,
  legendary: 1
};

// ========== PROGRESSION-BASED WEIGHT MODIFIERS ==========
export function getProgressionRarityBonus(): Partial<Record<CardRarity, number>> {
  const bonus: Partial<Record<CardRarity, number>> = {};
  const mastery = circleMastery.value;
  const fragments = orbexFragments.value;
  
  if (mastery >= 5) {
    bonus.rare = (bonus.rare || 0) + 5;
    bonus.epic = (bonus.epic || 0) + 2;
  }
  if (mastery >= 10) {
    bonus.epic = (bonus.epic || 0) + 3;
    bonus.legendary = (bonus.legendary || 0) + 1;
  }
  
  if (fragments >= 3) {
    bonus.rare = (bonus.rare || 0) + 5;
  }
  if (fragments >= 5) {
    bonus.epic = (bonus.epic || 0) + 5;
    bonus.legendary = (bonus.legendary || 0) + 2;
  }
  
  return bonus;
}

// ========== WEIGHTED CARD SELECTION ==========
export function selectWeightedCard(
  typeFilter: ('spell' | 'enhancement' | 'land' | 'entity')[],
  aspectFilter?: string,
  excludeIds?: string[]
): Card {
  const bonus = getProgressionRarityBonus();
  
  const weightedPool: { card: Card; weight: number }[] = [];
  
  for (const card of allCards) {
    if (!typeFilter.includes(card.type)) continue;
    if (aspectFilter && card.aspect !== aspectFilter && card.aspect !== 'All') continue;
    if (excludeIds?.includes(card.id)) continue;
    
    let weight = RARITY_WEIGHTS[card.rarity];
    
    if (bonus[card.rarity]) {
      weight += bonus[card.rarity]!;
    }
    
    weightedPool.push({ card, weight });
  }
  
  if (weightedPool.length === 0) {
    const fallback = allCards.find(c => typeFilter.includes(c.type)) || allCards[0];
    return fallback;
  }
  
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedPool) {
    random -= item.weight;
    if (random <= 0) {
      return item.card;
    }
  }
  
  return weightedPool[0].card;
}

// ========== CONTEXTUAL REWARDS ==========
export function getBarterReward(enemyCard: Card): Card {
  const types: ('spell' | 'enhancement')[] = ['spell', 'enhancement'];
  const aspectFilter = enemyCard.aspect;
  
  const enemyRarityValue: Record<CardRarity, number> = {
    common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4
  };
  
  const minRarity: CardRarity = enemyCard.rarity === 'common' ? 'common' :
                                enemyCard.rarity === 'uncommon' ? 'uncommon' : 'rare';
  
  for (let i = 0; i < 20; i++) {
    const card = selectWeightedCard(types, aspectFilter);
    if (enemyRarityValue[card.rarity] >= enemyRarityValue[minRarity] - 1) {
      return card;
    }
  }
  
  return selectWeightedCard(types, aspectFilter);
}

export function getEchoReward(pathType: string): Card {
  const aspectMap: Record<string, string> = {
    'Warded': 'Void',
    'Collapsed': 'Earth',
    'Echoing': 'Air',
    'Safe': 'Life'
  };
  
  const aspect = aspectMap[pathType] || 'Void';
  const types: ('spell' | 'enhancement')[] = ['spell', 'enhancement'];
  
  return selectWeightedCard(types, aspect);
}

export function getHollowReward(fragmentIndex: number): Card {
  const types: ('land')[] = ['land'];
  
  let targetRarity: CardRarity;
  if (fragmentIndex >= 6) targetRarity = 'legendary';
  else if (fragmentIndex >= 5) targetRarity = 'epic';
  else if (fragmentIndex >= 3) targetRarity = 'rare';
  else targetRarity = 'uncommon';
  
  const landsOfRarity = allCards.filter(c => c.type === 'land' && c.rarity === targetRarity);
  if (landsOfRarity.length > 0) {
    return landsOfRarity[Math.floor(Math.random() * landsOfRarity.length)];
  }
  
  return selectWeightedCard(types);
}

// ========== DUPLICATE PROTECTION ==========
export function getUndiscoveredCard(
  typeFilter: ('spell' | 'enhancement' | 'land' | 'entity')[],
  ownedCardIds: string[]
): Card | null {
  const undiscovered = allCards.filter(c => 
    typeFilter.includes(c.type) && 
    !ownedCardIds.includes(c.id)
  );
  
  if (undiscovered.length === 0) return null;
  
  const bonus = getProgressionRarityBonus();
  const weightedPool: { card: Card; weight: number }[] = [];
  
  for (const card of undiscovered) {
    let weight = RARITY_WEIGHTS[card.rarity];
    if (bonus[card.rarity]) weight += bonus[card.rarity]!;
    weight *= 3;
    weightedPool.push({ card, weight });
  }
  
  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of weightedPool) {
    random -= item.weight;
    if (random <= 0) return item.card;
  }
  
  return undiscovered[Math.floor(Math.random() * undiscovered.length)];
}

// ========== STARTER CARD VALIDATION ==========
export function validateStarterCards(): boolean {
  const starterIds = ['umbral_mite', 'ember_hound', 'stone_warden', 'void_gaze', 'ember_burst', 'iron_will', 'void_spring'];
  for (const id of starterIds) {
    const card = allCards.find(c => c.id === id);
    if (!card) {
      console.error(`Starter card ${id} not found!`);
      return false;
    }
  }
  return true;
}