// js/types/game.ts
// Core type definitions for Kalgoth's Gaze

export interface EnhancementStats {
  effect: string;
  statBonus?: Partial<EntityStats>;
  aspectBonus?: Record<Aspect, Partial<EntityStats>>;
  expeditionBonus?: Partial<EntityStats>;
}

export interface LandStats {
  generation?: { resource: string; amount: number };
  effect?: string;
  combatBonus?: Partial<EntityStats>;
  expeditionBonus?: Partial<EntityStats>;
  stats?: Partial<EntityStats>; // For compatibility with existing code
}

export interface SpellStats {
  cost: number;
  effect: string;
  damage?: number;
  healing?: number;
  keywords?: string[];
}

export interface EntityStats {
  hp: number;
  atk: number;
  spd: number;
  cun: number;
  def: number;
  res: number;
  init: number;
  loyalty: number;
}

export interface EntityAbility {
  name: string;
  type: 'combat' | 'expedition' | 'passive';
  effect: string;
  trigger?: 'onAttack' | 'onDamage' | 'onKill' | 'onTurnStart' | 'onSummon' | 'onExpeditionStart';
  cooldown?: number;
  value?: number;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  aspect: Aspect | string;
  image: string;
  frame: string;
  stats?: EntityStats | SpellStats | EnhancementStats | LandStats;
  abilities?: EntityAbility[];
  flavor?: string;
  comboWith?: string[];
  comboEffect?: string;
}

export type CardType = 'entity' | 'spell' | 'enhancement' | 'land';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Aspect = 'Void' | 'Fire' | 'Earth' | 'Air' | 'Water' | 'Life' | 'Death' | 'All';

export type DemonTrait =
  | 'Imp'
  | 'Cunning'
  | 'Feral'
  | 'Ancient'
  | 'Volatile'
  | 'Shadow-touched';

export interface Demon {
  name: string;
  trait: DemonTrait;
  tier: 1 | 2 | 3;
  image: string;
  resistance: number;
  personality: {
    mood: number;
    favor: number;
    history: string[];
  };
  capturedAt?: number;
}

export interface IngredientState {
  nightshadeMoss: number;
  cryptPhlegm: number;
  bansheeSalts: number;
  wyrmEye: number;
  demonIchor: number;
  boneDust: number;
  shadowResin: number;
}

export interface CraftedState {
  powderOfWarding: number;
  phialOfSubjugation: number;
  restorativeDraught: number;
}

export interface FamiliarState {
  level: number;
  xp: number;
  nextXP: number;
  abilities: string[];
  abilityBonuses: Record<string, number>;
  mood: number;
  mossConsumedToday: boolean;
}

export interface TutorialState {
  firstForage: boolean;
  firstTrace: boolean;
  firstRuneStudied: boolean;
  firstRuneEtched: boolean;
  firstSummon: boolean;
  firstDominate: boolean;
  firstDestroy: boolean;
  firstRelicFound: boolean;
  firstTithePaid: boolean;
  firstMazeExplored: boolean;
  hasSeenSeedHint: boolean;
  currentStep: string;
}

export interface DiscoveriesState {
  runes: string[];
  demons: DemonTrait[];
  ingredients: string[];
  rituals: string[];
  lore: string[];
}

export interface TemporaryBuffsState {
  summonBonus: number;
  dominateBonus: number;
}

export interface TrueNameFragments {
  [demonType: string]: [boolean, boolean, boolean];
}

export interface LedgerEntry {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface MazeState {
  currentRoom: string;
  exploredRooms: string[];
  availablePaths: string[];
  difficulty: number;
  corruption: number;
}

export interface Relic {
  id: string;
  name: string;
  description: string;
  image: string;
  effect: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'passive' | 'active' | 'consumable';
}

export interface AshRemains {
  reward: {
    ichor?: number;
    boneDust?: number;
    relics?: string[];
    cards?: string[];
  };
  description: string;
  quality: number;
}

export interface GameState {
  playerName: string;
  ingredients: IngredientState;
  crafted: CraftedState;
  knownRunes: string[];
  selectedRunes: string[];
  runeSlots: [string, string, string];
  masteryLevel: number;
  masteryXP: number;
  masteryNeeded: number;
  storyProgress: number;
  will: number;
  health: number;
  maxWill: number;
  suspicion: number;
  seedResonance: number;
  maxSeedResonance: number;
  quotaRemaining: number;
  actionCounter: number;
  tithePaidThisDay: boolean;
  timerSeconds: number;
  activeDemon: Demon | null;
  capturedDemons: Demon[];
  banishPower: number;
  demonFavor: Partial<Record<DemonTrait, number>>;
  demonWrath: number;
  releasedDemons: DemonTrait[];
  unidentifiedRelics: string[];
  knownRelics: string[];
  equippedRelics: [string | null, string | null, string | null];
  revealedRituals: Set<string>;
  hasSpecialIngredient: boolean;
  temporaryBuffs: TemporaryBuffsState;
  familiar: FamiliarState;
  lastPetTime: number;
  lastForageTime: number;
  totalSummons: number;
  totalExplorations: number;
  totalWillClashWins: number;
  tutorial: TutorialState;
  discoveries: DiscoveriesState;
  currentMaze: MazeState | null;
  circleQuality: number;
  circleIntegrity: number;
  ledgerEntries: LedgerEntry[];
  relics: Relic[];
  ashAvailable: boolean;
  pendingAshRemains: AshRemains | null;
  itemUsageDaily: Record<string, boolean>;
  orbexFragments: number;
  maxOrbexFragments: number;
  corruptionLevel: number;
  trueNameFragments: TrueNameFragments;
  discoveredTrueNames: DemonTrait[];
  activeDemonTier: 1 | 2 | 3;
  orbexBoons: string[];
  alcovesDiscovered: number;
  mazePathsUnlocked: string[];
  demonImages: DemonImagesState;
}