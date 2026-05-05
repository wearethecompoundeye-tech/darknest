// js/types/game.ts
// Core type definitions for Kalgoth's Gaze

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

export interface DemonImagesState {
  imp: string[];
  feral: string[];
  cunning: string[];
  ancient: string[];
  volatile: string[];
  shadow: string[];
  kin: string[];
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
  currentMaze: unknown; // Will be properly typed later
  circleQuality: number;
  circleIntegrity: number;
  ledgerEntries: unknown[];
  relics: unknown[]; // Will be properly typed from relics.ts
  ashAvailable: boolean;
  pendingAshRemains: unknown;
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