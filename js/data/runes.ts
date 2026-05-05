// js/data/runes.ts
export interface RuneDefinition {
  name: string;
  meaning: string;
  effect: string;
  difficulty: string;
  shape: number[][];
  bonus: (count: number) => Partial<RuneBonuses>;
}

export interface RuneBonuses {
  summonChance?: number;
  dominationChance?: number;
  circlePowerBonus?: number;
  mazeVision?: number;
  findBonus?: number;
  rareChance?: number;
  suspicionReduction?: number;
  willRegen?: number;
  masteryXPBonus?: number;
  destructionBonus?: number;
  actionCostReduction?: number;
  suspicionGrowthReduction?: number;
  harvestMultiplier?: number;
  relicChance?: number;
}

export const runeData: RuneDefinition[] = [
  {
    name: "Fehu",
    meaning: "Wealth",
    effect: "+3% summon success per unique rune",
    difficulty: "Novice",
    shape: [[100, 40], [60, 80], [100, 120], [140, 80], [100, 40]],
    bonus: (count) => ({ summonChance: 0.03 * count })
  },
  {
    name: "Uruz",
    meaning: "Strength",
    effect: "+4% domination per rune",
    difficulty: "Novice",
    shape: [[60, 40], [140, 40], [100, 120], [60, 80]],
    bonus: (count) => ({ dominationChance: 0.04 * count })
  },
  {
    name: "Thurisaz",
    meaning: "Defense",
    effect: "+5% circle integrity gain",
    difficulty: "Apprentice",
    shape: [[100, 40], [100, 160], [70, 100], [130, 100]],
    bonus: (count) => ({ circlePowerBonus: 0.05 * count })
  },
  {
    name: "Ansuz",
    meaning: "Wisdom",
    effect: "Reveals maze cell on entry",
    difficulty: "Apprentice",
    shape: [[60, 60], [140, 60], [100, 140], [60, 100]],
    bonus: (count) => ({ mazeVision: count > 0 ? 1 : 0 })
  },
  {
    name: "Raidho",
    meaning: "Journey",
    effect: "+5% maze find quantity",
    difficulty: "Journeyman",
    shape: [[60, 80], [140, 80], [100, 140], [60, 80]],
    bonus: (count) => ({ findBonus: 0.05 * count })
  },
  {
    name: "Kenaz",
    meaning: "Torch",
    effect: "+2% rare item chance per rune",
    difficulty: "Journeyman",
    shape: [[80, 40], [120, 40], [100, 160]],
    bonus: (count) => ({ rareChance: 0.02 * count })
  },
  {
    name: "Gebo",
    meaning: "Gift",
    effect: "Extra relic chance",
    difficulty: "Adept",
    shape: [[60, 60], [140, 140], [60, 140], [140, 60]],
    bonus: (count) => ({ relicChance: 0.05 * count })
  },
  {
    name: "Wunjo",
    meaning: "Joy",
    effect: "-2% suspicion gain per rune",
    difficulty: "Adept",
    shape: [[60, 100], [140, 100], [100, 40], [100, 160]],
    bonus: (count) => ({ suspicionReduction: 0.02 * count })
  },
  {
    name: "Hagalaz",
    meaning: "Hail",
    effect: "+20% destruction rewards",
    difficulty: "Expert",
    shape: [[60, 60], [100, 100], [140, 60], [100, 140], [60, 60]],
    bonus: (count) => ({ destructionBonus: 0.2 * count })
  },
  {
    name: "Nauthiz",
    meaning: "Need",
    effect: "-5% action costs",
    difficulty: "Expert",
    shape: [[80, 50], [120, 50], [100, 100], [80, 150], [120, 150]],
    bonus: (count) => ({ actionCostReduction: 0.05 * count })
  },
  {
    name: "Isa",
    meaning: "Ice",
    effect: "-10% suspicion growth",
    difficulty: "Master",
    shape: [[100, 40], [100, 160]],
    bonus: (count) => ({ suspicionGrowthReduction: 0.1 * count })
  },
  {
    name: "Jera",
    meaning: "Harvest",
    effect: "+20% harvest yield",
    difficulty: "Master",
    shape: [[60, 60], [140, 60], [100, 100], [60, 140], [140, 140]],
    bonus: (count) => ({ harvestMultiplier: 0.2 * count })
  },
  {
    name: "Laguz",
    meaning: "Water",
    effect: "+0.3 will regen per rune",
    difficulty: "Expert",
    shape: [[60, 60], [140, 60], [100, 140]],
    bonus: (count) => ({ willRegen: 0.3 * count })
  },
  {
    name: "Ingwaz",
    meaning: "Seed",
    effect: "+3% circle power per rune",
    difficulty: "Expert",
    shape: [[60, 100], [140, 100], [100, 40], [100, 160]],
    bonus: (count) => ({ circlePowerBonus: 0.03 * count })
  },
  {
    name: "Othala",
    meaning: "Heritage",
    effect: "+2 mastery XP per action",
    difficulty: "Expert",
    shape: [[40, 40], [160, 40], [160, 160], [40, 160]],
    bonus: (count) => ({ masteryXPBonus: 2 * count })
  },
  {
    name: "Dagaz",
    meaning: "Dawn",
    effect: "Breakthrough: +10% summon if full set",
    difficulty: "Legendary",
    shape: [[100, 40], [100, 160], [70, 100], [130, 100], [100, 40]],
    bonus: (count) => ({ summonChance: count >= 3 ? 0.10 : 0 })
  }
];

export function getRandomRuneName(): string {
  return runeData[Math.floor(Math.random() * runeData.length)].name;
}