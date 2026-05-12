// js/core/state-signals.ts
// Central reactive state – demon‑free, card‑entity only.

import { signal, computed, batch, Signal } from '@preact/signals-core';
import type {
  GameState,
  IngredientState,
  CraftedState,
  FamiliarState,
  TutorialState,
  DiscoveriesState,
  TemporaryBuffsState,
} from '../types/game.js';
import { allCards, getCardById, type Card, type CardType, type CardRarity, type EntityStats } from '../data/cards.js';
import { relics as relicsData, relicSlots, getRelicById } from '../data/relics.js';
import { 
  getEnhancedStats, 
  checkForCombos, 
  getAspectSynergyBonus,
  applyComboBonuses 
} from '../systems/card-progression.js';

import { autoSave, loadSaveData, initSaveSystem } from './persistence.js';
export { autoSave, loadSaveData, initSaveSystem };

export const relics = relicsData;

export const CONSTANTS = {
  CYCLE_ACTIONS: 4,
  DAILY_ICHOR_REQUIREMENT: 5,
  DAILY_ORBEX_ICHOR: 5,
  FORAGE_COOLDOWN: 60000,
  SEED_RESONANCE_REGEN: 1,
  MAX_SEED_RESONANCE: 5,
  CAPTURED_DEMON_WILL_COST: 5,      // still kept for internal logic if needed
  CAPTURED_DEMON_ICHOR_YIELD: 1,
  WHISP_HEALTH_REGEN_PER_LEVEL: 2,
  WHISP_MOSS_COST_PER_LEVEL: 1,
  GAZE_BASE_DRAIN_RATE: 2,
  GAZE_DRAIN_PER_INTENSITY: 0.5,
  GAZE_DURATION_SECONDS: 60,
  WARD_BASE_INTEGRITY: 100,
} as const;

const initialState: GameState = {
  playerName: "Survivor",
  ingredients: {
    nightshadeMoss: 12,
    cryptPhlegm: 10,
    bansheeSalts: 5,
    wyrmEye: 0,
    demonIchor: 0,
    boneDust: 0,
    shadowResin: 0
  },
  crafted: {
    powderOfWarding: 0,
    phialOfSubjugation: 0,
    restorativeDraught: 0
  },
  knownRunes: [],
  selectedRunes: [],
  runeSlots: ["", "", ""],
  masteryLevel: 0,
  masteryXP: 0,
  masteryNeeded: 100,
  storyProgress: 0,
  will: 100,
  health: 100,
  maxWill: 100,
  suspicion: 10,
  seedResonance: 3,
  maxSeedResonance: 5,
  quotaRemaining: 2,
  actionCounter: 0,
  tithePaidThisDay: false,
  timerSeconds: 600,
  revealedRituals: new Set(['summon']),
  hasSpecialIngredient: false,
  temporaryBuffs: {
    summonBonus: 0,
    dominateBonus: 0
  },
  familiar: {
    level: 1,
    xp: 0,
    nextXP: 10,
    abilities: ["scout"],
    abilityBonuses: { scout: 0.2 },
    mood: 100,
    mossConsumedToday: false
  },
  lastPetTime: 0,
  lastForageTime: 0,
  totalSummons: 0,
  totalExplorations: 0,
  totalWillClashWins: 0,
  tutorial: {
    firstForage: false,
    firstTrace: false,
    firstRuneStudied: false,
    firstRuneEtched: false,
    firstSummon: false,
    firstDominate: false,
    firstDestroy: false,
    firstRelicFound: false,
    firstTithePaid: false,
    firstMazeExplored: false,
    hasSeenSeedHint: false,
    currentStep: 'welcome',
    firstGazeSurvived: false,
    guidedFirstDayComplete: false
  },
  discoveries: {
    runes: [],
    demons: [],       // still in type but not used
    ingredients: [],
    rituals: ['summon'],
    lore: []
  },
  currentMaze: null,
  circleQuality: 0,
  circleIntegrity: 0,
  ledgerEntries: [],
  relics: relicsData,
  ashAvailable: false,
  pendingAshRemains: null,
  itemUsageDaily: {},
  orbexFragments: 0,
  maxOrbexFragments: 6,
  corruptionLevel: 0,
  orbexBoons: [],
  alcovesDiscovered: 0,
  mazePathsUnlocked: ['Warded', 'Safe'],
  kalgothsNoose: 10,
  circlePower: 0,
  circleMastery: 0,
  gazeIntensity: 5,
  wardIntegrities: [100, 100, 100],
  gazeSurvivalCount: 0,
  dailyConsumableSlots: ['', '', ''],
  isGazeActive: false,
  gazePhase: 'inactive',
};

// ── Signals ──
export const playerName = signal<string>(initialState.playerName);
export const ingredients = signal<IngredientState>(initialState.ingredients);
export const crafted = signal<CraftedState>(initialState.crafted);
export const knownRunes = signal<string[]>(initialState.knownRunes);
export const selectedRunes = signal<string[]>(initialState.selectedRunes);
export const runeSlots = signal<[string, string, string]>(initialState.runeSlots);
export const masteryLevel = signal<number>(initialState.masteryLevel);
export const masteryXP = signal<number>(initialState.masteryXP);
export const masteryNeeded = signal<number>(initialState.masteryNeeded);
export const storyProgress = signal<number>(initialState.storyProgress);
export const will = signal<number>(initialState.will);
export const health = signal<number>(initialState.health);
export const maxWill = signal<number>(initialState.maxWill);
export const suspicion = signal<number>(initialState.suspicion);
export const seedResonance = signal<number>(initialState.seedResonance);
export const maxSeedResonance = signal<number>(initialState.maxSeedResonance);
export const quotaRemaining = signal<number>(initialState.quotaRemaining);
export const actionCounter = signal<number>(initialState.actionCounter);
export const tithePaidThisDay = signal<boolean>(initialState.tithePaidThisDay);
export const timerSeconds = signal<number>(initialState.timerSeconds);
export const revealedRituals = signal<Set<string>>(initialState.revealedRituals);
export const hasSpecialIngredient = signal<boolean>(initialState.hasSpecialIngredient);
export const temporaryBuffs = signal<TemporaryBuffsState>(initialState.temporaryBuffs);
export const familiar = signal<FamiliarState>(initialState.familiar);
export const lastPetTime = signal<number>(initialState.lastPetTime);
export const lastForageTime = signal<number>(initialState.lastForageTime);
export const totalSummons = signal<number>(initialState.totalSummons);
export const totalExplorations = signal<number>(initialState.totalExplorations);
export const totalWillClashWins = signal<number>(initialState.totalWillClashWins);
export const tutorial = signal<TutorialState>(initialState.tutorial);
export const discoveries = signal<DiscoveriesState>(initialState.discoveries);
export const currentMaze = signal<unknown>(initialState.currentMaze);
export const circleQuality = signal<number>(initialState.circleQuality);
export const circleIntegrity = signal<number>(initialState.circleIntegrity);
export const ledgerEntries = signal<unknown[]>(initialState.ledgerEntries);
export const ashAvailable = signal<boolean>(initialState.ashAvailable);
export const pendingAshRemains = signal<unknown>(initialState.pendingAshRemains);
export const itemUsageDaily = signal<Record<string, boolean>>(initialState.itemUsageDaily);
export const orbexFragments = signal<number>(initialState.orbexFragments);
export const maxOrbexFragments = signal<number>(initialState.maxOrbexFragments);
export const corruptionLevel = signal<number>(initialState.corruptionLevel);
export const orbexBoons = signal<string[]>(initialState.orbexBoons);
export const alcovesDiscovered = signal<number>(initialState.alcovesDiscovered);
export const mazePathsUnlocked = signal<string[]>(initialState.mazePathsUnlocked);
export const kalgothsNoose = signal<number>(initialState.kalgothsNoose ?? 10);
export const circlePower = signal<number>(initialState.circlePower ?? 0);
export const circleMastery = signal<number>(initialState.circleMastery ?? 0);

// New ritual signals (no braided rite, but can be used later)
export const empoweredCircle = signal<boolean>(false);
export const braidedTracePhases = signal<number>(0);
export const gazeWardCount = signal<number>(0);
export const gazeWardImageIds = signal<number[]>([]);

// Relic signals
export const unidentifiedRelics = signal<string[]>([]);
export const knownRelics = signal<string[]>([]);
export const oldEquippedRelics = signal<[string | null, string | null, string | null]>([null, null, null]);

// Gaze signals
export const gazeIntensity = signal<number>(initialState.gazeIntensity ?? 5);
export const wardIntegrities = signal<number[]>(initialState.wardIntegrities ?? [100, 100, 100]);
export const gazeSurvivalCount = signal<number>(initialState.gazeSurvivalCount ?? 0);
export const dailyConsumableSlots = signal<string[]>(initialState.dailyConsumableSlots ?? ['', '', '']);
export const isGazeActive = signal<boolean>(initialState.isGazeActive ?? false);
export const gazePhase = signal<'inactive' | 'warning' | 'active'>(initialState.gazePhase ?? 'inactive');

// Kalgoth’s Power (new)
export const kalgothsPower = signal<number>(100);

// Card collection
export interface OwnedCard { cardId: string; quantity: number; enhancementLevel: number; }
const initialOwnedCards: OwnedCard[] = [
  { cardId: 'umbral_mite', quantity: 1, enhancementLevel: 0 },
  { cardId: 'ember_hound', quantity: 1, enhancementLevel: 0 },
  { cardId: 'stone_warden', quantity: 1, enhancementLevel: 0 },
  { cardId: 'void_gaze', quantity: 1, enhancementLevel: 0 },
  { cardId: 'ember_burst', quantity: 1, enhancementLevel: 0 },
  { cardId: 'iron_will', quantity: 1, enhancementLevel: 0 },
  { cardId: 'void_spring', quantity: 1, enhancementLevel: 0 },
];
export const ownedCards = signal<OwnedCard[]>(initialOwnedCards);
export const equippedEntitySlots = signal<string[]>(['umbral_mite', 'ember_hound']);
export const equippedSpellSlots = signal<string[]>(['void_gaze', 'ember_burst']);
export const equippedEnhancementSlots = signal<string[]>(['iron_will']);
export const equippedLandSlots = signal<string[]>(['void_spring']);

export const maxEntitySlots = computed(() => {
  let slots = 2;
  if (circleMastery.value >= 3) slots++;
  if (circleMastery.value >= 6) slots++;
  if (orbexFragments.value >= 5) slots++;
  return slots;
});
export const maxSpellSlots = computed(() => {
  let slots = 2;
  if (circleMastery.value >= 2) slots++;
  if (orbexFragments.value >= 2) slots++;
  return Math.min(4, slots);
});
export const maxEnhancementSlots = computed(() => {
  let slots = 1;
  if (circleMastery.value >= 4) slots++;
  if (orbexFragments.value >= 3) slots++;
  return Math.min(3, slots);
});
export const maxLandSlots = computed(() => {
  let slots = 1;
  if (circleMastery.value >= 5) slots++;
  return Math.min(2, slots);
});

function unequipCardIfPresent(cardId: string): void {
  equippedEntitySlots.value = equippedEntitySlots.value.filter(id => id !== cardId);
  equippedSpellSlots.value = equippedSpellSlots.value.filter(id => id !== cardId);
  equippedEnhancementSlots.value = equippedEnhancementSlots.value.filter(id => id !== cardId);
  equippedLandSlots.value = equippedLandSlots.value.filter(id => id !== cardId);
}

export function addCard(cardId: string, quantity: number = 1): void {
  const current = ownedCards.value;
  const existing = current.find(c => c.cardId === cardId);
  if (existing) {
    existing.quantity += quantity;
    if (existing.quantity >= 2 && existing.enhancementLevel < 1) existing.enhancementLevel = 1;
    if (existing.quantity >= 3 && existing.enhancementLevel < 2) existing.enhancementLevel = 2;
    if (existing.quantity >= 4 && existing.enhancementLevel < 3) existing.enhancementLevel = 3;
    ownedCards.value = [...current];
  } else {
    ownedCards.value = [...current, { cardId, quantity, enhancementLevel: 0 }];
  }
  autoSave();
}

export function removeCard(cardId: string, quantity: number = 1): boolean {
  const current = ownedCards.value;
  const index = current.findIndex(c => c.cardId === cardId);
  if (index === -1) return false;
  const card = current[index];
  if (card.quantity <= quantity) {
    ownedCards.value = current.filter((_, i) => i !== index);
  } else {
    card.quantity -= quantity;
    ownedCards.value = [...current];
  }
  unequipCardIfPresent(cardId);
  autoSave();
  return true;
}

export function hasCard(cardId: string): boolean { return ownedCards.value.some(c => c.cardId === cardId); }
export function getCardQuantity(cardId: string): number { return ownedCards.value.find(c => c.cardId === cardId)?.quantity ?? 0; }
export function getCardEnhancementLevel(cardId: string): number { return ownedCards.value.find(c => c.cardId === cardId)?.enhancementLevel ?? 0; }
export function mergeDuplicate(cardId: string): boolean {
  const card = ownedCards.value.find(c => c.cardId === cardId);
  if (!card || card.quantity < 2 || card.enhancementLevel >= 3) return false;
  card.quantity--;
  card.enhancementLevel++;
  ownedCards.value = [...ownedCards.value];
  autoSave();
  return true;
}
export function equipCard(cardId: string, slotType: CardType, slotIndex: number): boolean {
  const card = getCardById(cardId);
  if (!card || card.type !== slotType || !hasCard(cardId)) return false;
  let slots: Signal<string[]>;
  let maxSlots: number;
  switch (slotType) {
    case 'entity': slots = equippedEntitySlots; maxSlots = maxEntitySlots.value; break;
    case 'spell': slots = equippedSpellSlots; maxSlots = maxSpellSlots.value; break;
    case 'enhancement': slots = equippedEnhancementSlots; maxSlots = maxEnhancementSlots.value; break;
    case 'land': slots = equippedLandSlots; maxSlots = maxLandSlots.value; break;
    default: return false;
  }
  if (slotIndex < 0 || slotIndex >= maxSlots) return false;
  const currentSlots = [...slots.value];
  while (currentSlots.length <= slotIndex) currentSlots.push('');
  currentSlots[slotIndex] = cardId;
  slots.value = currentSlots;
  autoSave();
  return true;
}
export function unequipCard(slotType: CardType, slotIndex: number): boolean {
  let slots: Signal<string[]>;
  let maxSlots: number;
  switch (slotType) {
    case 'entity': slots = equippedEntitySlots; maxSlots = maxEntitySlots.value; break;
    case 'spell': slots = equippedSpellSlots; maxSlots = maxSpellSlots.value; break;
    case 'enhancement': slots = equippedEnhancementSlots; maxSlots = maxEnhancementSlots.value; break;
    case 'land': slots = equippedLandSlots; maxSlots = maxLandSlots.value; break;
    default: return false;
  }
  const currentSlots = [...slots.value];
  if (slotIndex < 0 || slotIndex >= currentSlots.length) return false;
  currentSlots[slotIndex] = '';
  slots.value = currentSlots.filter(id => id !== '');
  while (slots.value.length < maxSlots) slots.value = [...slots.value, ''];
  autoSave();
  return true;
}
export function getEquippedCards(slotType: CardType): Card[] {
  let slotIds: string[];
  switch (slotType) {
    case 'entity': slotIds = equippedEntitySlots.value; break;
    case 'spell': slotIds = equippedSpellSlots.value; break;
    case 'enhancement': slotIds = equippedEnhancementSlots.value; break;
    case 'land': slotIds = equippedLandSlots.value; break;
    default: return [];
  }
  return slotIds.map(id => getCardById(id)).filter(c => c !== undefined) as Card[];
}
export function getActiveEntity(): Card | undefined {
  const id = equippedEntitySlots.value[0];
  if (!id) return undefined;
  const card = getCardById(id);
  if (!card || card.type !== 'entity') return undefined;
  const enhancedStats = getEnhancedStats(id);
  if (enhancedStats) return { ...card, stats: enhancedStats };
  return card;
}
export function getEquippedEntitiesEnhanced(): Card[] {
  return equippedEntitySlots.value
    .filter(id => id)
    .map(id => {
      const card = getCardById(id);
      if (!card || card.type !== 'entity') return null;
      const enhancedStats = getEnhancedStats(id);
      return enhancedStats ? { ...card, stats: enhancedStats } : card;
    })
    .filter(c => c !== null) as Card[];
}
export function getEntityCombatStats(cardId: string): EntityStats | null {
  const card = getCardById(cardId);
  if (!card || card.type !== 'entity') return null;
  const baseStats = card.stats as EntityStats;
  const enhancedStats = getEnhancedStats(cardId) || baseStats;
  const synergyBonus = getAspectSynergyBonus();
  const combos = checkForCombos();
  const comboBonus = combos.find(c => c.cardIds.includes(cardId))?.bonus || {};
  return {
    hp: (enhancedStats.hp || 0) + (synergyBonus.hp || 0) + (comboBonus.hp || 0),
    atk: (enhancedStats.atk || 0) + (synergyBonus.atk || 0) + (comboBonus.atk || 0),
    def: (enhancedStats.def || 0) + (synergyBonus.def || 0) + (comboBonus.def || 0),
    res: (enhancedStats.res || 0) + (synergyBonus.res || 0) + (comboBonus.res || 0),
    spd: (enhancedStats.spd || 0) + (synergyBonus.spd || 0) + (comboBonus.spd || 0),
    cun: (enhancedStats.cun || 0) + (synergyBonus.cun || 0) + (comboBonus.cun || 0),
    init: (enhancedStats.init || 0) + (synergyBonus.init || 0) + (comboBonus.init || 0),
    loyalty: enhancedStats.loyalty || 50
  };
}

// Relic signals
export const ownedRelics = signal<string[]>(['ring_of_shadows']);
export const equippedRelics = signal<(string | null)[]>(new Array(relicSlots).fill(null));
export function equipRelic(relicId: string, slot: number): boolean {
  if (slot < 0 || slot >= relicSlots) return false;
  if (!ownedRelics.value.includes(relicId)) return false;
  const newSlots = [...equippedRelics.value];
  newSlots[slot] = relicId;
  equippedRelics.value = newSlots;
  autoSave();
  return true;
}
export function unequipRelic(slot: number): boolean {
  if (slot < 0 || slot >= relicSlots) return false;
  const newSlots = [...equippedRelics.value];
  newSlots[slot] = null;
  equippedRelics.value = newSlots;
  autoSave();
  return true;
}
export function addRelic(relicId: string): void {
  if (!ownedRelics.value.includes(relicId)) {
    ownedRelics.value = [...ownedRelics.value, relicId];
    autoSave();
  }
}
export const relicBonuses = computed(() => {
  const bonuses = { maxWill: 0, willRegen: 0, health: 0, summonChance: 0, suspicionReduction: 0, findBonus: 0, ichorDiscount: 0 };
  equippedRelics.value.forEach(id => {
    if (!id) return;
    const relic = getRelicById(id);
    if (relic) {
      if (relic.effect.maxWill) bonuses.maxWill += relic.effect.maxWill;
      if (relic.effect.willRegen) bonuses.willRegen += relic.effect.willRegen;
      if (relic.effect.health) bonuses.health += relic.effect.health;
      if (relic.effect.summonChance) bonuses.summonChance += relic.effect.summonChance;
      if (relic.effect.suspicionReduction) bonuses.suspicionReduction += relic.effect.suspicionReduction;
      if (relic.effect.findBonus) bonuses.findBonus += relic.effect.findBonus;
      if (relic.effect.ichorDiscount) bonuses.ichorDiscount += relic.effect.ichorDiscount;
    }
  });
  return bonuses;
});

// Computed values
export const isLowHealth = computed(() => health.value < 30);
export const isLowWill = computed(() => will.value < 30);
export const suspicionPercent = computed(() => kalgothsNoose.value);
export const circlePowerPercent = computed(() => circlePower.value);
export const canEscape = computed(() => circlePower.value >= 100 && hasSpecialIngredient.value && orbexFragments.value >= 6);
export const familiarXPPercent = computed(() => (familiar.value.xp / familiar.value.nextXP) * 100);
export const masteryXPPercent = computed(() => (masteryXP.value / masteryNeeded.value) * 100);
export const dayProgressPercent = computed(() => (timerSeconds.value / 600) * 100);
export const corruptionPercent = computed(() => corruptionLevel.value);
export const orbexFragmentCount = computed(() => orbexFragments.value);
export const isGazeEventActive = computed(() => isGazeActive.value);

export let addLog: ((msg: string, isErr?: boolean, speaker?: string) => void) | null = null;
export function setAddLog(fn: typeof addLog): void { addLog = fn; }
export function notifyStateChange(): void {}
export function initializeState(): void {
  // fully reset all signals to their defaults
  playerName.value = initialState.playerName;
  ingredients.value = { ...initialState.ingredients };
  crafted.value = { ...initialState.crafted };
  knownRunes.value = [...initialState.knownRunes];
  selectedRunes.value = [...initialState.selectedRunes];
  runeSlots.value = [...initialState.runeSlots] as [string, string, string];
  masteryLevel.value = initialState.masteryLevel;
  masteryXP.value = initialState.masteryXP;
  masteryNeeded.value = initialState.masteryNeeded;
  storyProgress.value = initialState.storyProgress;
  will.value = initialState.will;
  health.value = initialState.health;
  maxWill.value = initialState.maxWill;
  suspicion.value = initialState.suspicion;
  seedResonance.value = initialState.seedResonance;
  maxSeedResonance.value = initialState.maxSeedResonance;
  quotaRemaining.value = initialState.quotaRemaining;
  actionCounter.value = initialState.actionCounter;
  tithePaidThisDay.value = initialState.tithePaidThisDay;
  timerSeconds.value = initialState.timerSeconds;
  revealedRituals.value = new Set(initialState.revealedRituals);
  hasSpecialIngredient.value = initialState.hasSpecialIngredient;
  temporaryBuffs.value = { ...initialState.temporaryBuffs };
  familiar.value = { ...initialState.familiar };
  lastPetTime.value = initialState.lastPetTime;
  lastForageTime.value = initialState.lastForageTime;
  totalSummons.value = initialState.totalSummons;
  totalExplorations.value = initialState.totalExplorations;
  totalWillClashWins.value = initialState.totalWillClashWins;
  tutorial.value = { ...initialState.tutorial };
  discoveries.value = { ...initialState.discoveries };
  currentMaze.value = initialState.currentMaze;
  circleQuality.value = initialState.circleQuality;
  circleIntegrity.value = initialState.circleIntegrity;
  ledgerEntries.value = [...initialState.ledgerEntries];
  ashAvailable.value = initialState.ashAvailable;
  pendingAshRemains.value = initialState.pendingAshRemains;
  itemUsageDaily.value = { ...initialState.itemUsageDaily };
  orbexFragments.value = initialState.orbexFragments;
  maxOrbexFragments.value = initialState.maxOrbexFragments;
  corruptionLevel.value = initialState.corruptionLevel;
  orbexBoons.value = [...initialState.orbexBoons];
  alcovesDiscovered.value = initialState.alcovesDiscovered;
  mazePathsUnlocked.value = [...initialState.mazePathsUnlocked];
  kalgothsNoose.value = initialState.kalgothsNoose ?? 10;
  circlePower.value = initialState.circlePower ?? 0;
  circleMastery.value = initialState.circleMastery ?? 0;
  empoweredCircle.value = false;
  braidedTracePhases.value = 0;
  gazeWardCount.value = 0;
  gazeWardImageIds.value = [];
  ownedCards.value = [...initialOwnedCards];
  equippedEntitySlots.value = ['umbral_mite', 'ember_hound'];
  equippedSpellSlots.value = ['void_gaze', 'ember_burst'];
  equippedEnhancementSlots.value = ['iron_will'];
  equippedLandSlots.value = ['void_spring'];
  ownedRelics.value = ['ring_of_shadows'];
  equippedRelics.value = new Array(relicSlots).fill(null);
  gazeIntensity.value = initialState.gazeIntensity ?? 5;
  wardIntegrities.value = [...initialState.wardIntegrities ?? [100, 100, 100]];
  gazeSurvivalCount.value = initialState.gazeSurvivalCount ?? 0;
  dailyConsumableSlots.value = [...initialState.dailyConsumableSlots ?? ['', '', '']];
  isGazeActive.value = initialState.isGazeActive ?? false;
  gazePhase.value = initialState.gazePhase ?? 'inactive';
  kalgothsPower.value = 100;
}

export function updateState(updater: () => void): void { batch(updater); autoSave(); }

export function discover(type: keyof DiscoveriesState, id: string): void {
  const current = discoveries.value;
  const array = current[type] as string[];
  if (!array.includes(id)) discoveries.value = { ...current, [type]: [...array, id] };
}
export function addMasteryXP(amount: number): void {
  let xp = masteryXP.value + amount, level = masteryLevel.value, needed = masteryNeeded.value;
  while (xp >= needed) { xp -= needed; level++; needed = Math.floor(100 + level * 20); }
  batch(() => { masteryXP.value = xp; masteryLevel.value = level; masteryNeeded.value = needed; });
}
export function addFamiliarXP(amount: number): void {
  let xp = familiar.value.xp + amount, level = familiar.value.level, nextXP = familiar.value.nextXP;
  const abilities = [...familiar.value.abilities], abilityBonuses = { ...familiar.value.abilityBonuses };
  while (xp >= nextXP) {
    xp -= nextXP; level++; nextXP = 10 + (level - 1) * 5;
    if (level === 2 && !abilities.includes('ward')) { abilities.push('ward'); abilityBonuses.ward = 0.15; }
    if (level === 3 && !abilities.includes('guidance')) { abilities.push('guidance'); abilityBonuses.guidance = 0.2; }
    if (level === 4 && !abilities.includes('presence')) { abilities.push('presence'); abilityBonuses.presence = 0.1; }
  }
  familiar.value = { ...familiar.value, xp, level, nextXP, abilities, abilityBonuses };
}
export function modifyWhispMood(delta: number): void { familiar.value = { ...familiar.value, mood: Math.max(0, Math.min(100, familiar.value.mood + delta)) }; }
export function addCircleIntegrity(amount: number): void { circleIntegrity.value = Math.min(100, circleIntegrity.value + amount); circlePower.value = Math.min(100, circlePower.value + amount); }
export function advanceAction(): void {
  batch(() => {
    actionCounter.value++;
    if (actionCounter.value >= CONSTANTS.CYCLE_ACTIONS) {
      actionCounter.value = 0;
      if (quotaRemaining.value > 0) { kalgothsNoose.value = Math.min(100, kalgothsNoose.value + (6 + quotaRemaining.value * 2)); }
      else { kalgothsNoose.value = Math.max(0, kalgothsNoose.value - 6); }
      quotaRemaining.value = 2 + Math.floor(Math.random() * 2);
    }
  });
}
export function reduceQuota(): void { if (quotaRemaining.value > 0) quotaRemaining.value--; }
export function useSeedResonance(amount: number = 1): boolean { if (seedResonance.value < amount) return false; seedResonance.value -= amount; return true; }
export function addSeedResonance(amount: number = 1): void { seedResonance.value = Math.min(maxSeedResonance.value, seedResonance.value + amount); }
export function getCorruptionModifier(): number { return corruptionLevel.value >= 100 ? -0.2 : (corruptionLevel.value >= 50 ? -0.1 : 0); }
export function resetDailyItemUsage(): void { itemUsageDaily.value = {}; }
export function applyDailyPassives(addLogFn?: (msg: string, isErr?: boolean, speaker?: string) => void): void {
  const level = familiar.value.level, mossNeeded = level * CONSTANTS.WHISP_MOSS_COST_PER_LEVEL;
  if (ingredients.value.nightshadeMoss >= mossNeeded) {
    ingredients.value = { ...ingredients.value, nightshadeMoss: ingredients.value.nightshadeMoss - mossNeeded };
    familiar.value = { ...familiar.value, mossConsumedToday: true };
    health.value = Math.min(100, health.value + level * CONSTANTS.WHISP_HEALTH_REGEN_PER_LEVEL);
    if (addLogFn) addLogFn(`Whisp consumes ${mossNeeded} moss and restores health.`, false, 'whisp');
    modifyWhispMood(5);
  } else {
    familiar.value = { ...familiar.value, mossConsumedToday: false };
    modifyWhispMood(-20);
    if (addLogFn) addLogFn(`Whisp is hungry! Not enough moss. Mood -20.`, true);
  }
}

// Legacy adapter (no demon signals)
type StateSignalsMap = { [K in keyof GameState]: Signal<GameState[K]> };
const signalMap: StateSignalsMap = {
  playerName, ingredients, crafted, knownRunes, selectedRunes, runeSlots, masteryLevel, masteryXP, masteryNeeded, storyProgress,
  will, health, maxWill, suspicion, seedResonance, maxSeedResonance, quotaRemaining, actionCounter, tithePaidThisDay, timerSeconds,
  equippedRelics: oldEquippedRelics as any, revealedRituals: revealedRituals as any, hasSpecialIngredient, temporaryBuffs,
  familiar, lastPetTime, lastForageTime, totalSummons, totalExplorations, totalWillClashWins, tutorial, discoveries,
  currentMaze, circleQuality, circleIntegrity, ledgerEntries, relics: relics as any, ashAvailable, pendingAshRemains,
  itemUsageDaily, orbexFragments, maxOrbexFragments, corruptionLevel, orbexBoons, alcovesDiscovered, mazePathsUnlocked,
  kalgothsNoose: kalgothsNoose as any, circlePower: circlePower as any, circleMastery: circleMastery as any,
  gazeIntensity: gazeIntensity as any, wardIntegrities: wardIntegrities as any, gazeSurvivalCount: gazeSurvivalCount as any,
  dailyConsumableSlots: dailyConsumableSlots as any, isGazeActive: isGazeActive as any, gazePhase: gazePhase as any,
};
export const legacyState = new Proxy({} as GameState, {
  get(_, prop: string) { const s = signalMap[prop as keyof GameState]; return s ? s.value : undefined; },
  set(_, prop: string, value: any) { const s = signalMap[prop as keyof GameState]; if (s) { s.value = value; return true; } return false; }
}) as GameState & { [key: string]: any };
export const state = legacyState;
(window as any).state = state;