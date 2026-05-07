import { ASSET } from '../utils/assets.js';
// js/data/relics.ts
export interface Relic {
  id: string;
  name: string;
  description: string;
  effect: {
    maxWill?: number;
    willRegen?: number;
    health?: number;
    summonChance?: number;
    suspicionReduction?: number;
    findBonus?: number;
    ichorDiscount?: number;
  };
  lore: string;
  image: string;
}

export const relics: Relic[] = [
  {
    id: 'ring_of_shadows',
    name: 'Ring of Shadows',
    description: '+5% summon chance, -5% Noose gain',
    effect: { summonChance: 5, suspicionReduction: 5 },
    lore: 'A band of shadow-stuff that whispers secrets of the void.',
    image: ASSET('Images/GameArt/Enhancements/Ring of the Last Acolyte.png')
  },
  {
    id: 'orbex_heartseed',
    name: 'Orbex Heartseed',
    description: '+10 max Will, +1 Will regen',
    effect: { maxWill: 10, willRegen: 1 },
    lore: 'A crystallized fragment of Orbex, still pulsing with life.',
    image: ASSET('Images/GameArt/Enhancements/Orbex Heart-Shard.png')
  },
  {
    id: 'void_touched_focus',
    name: 'Void-Touched Focus',
    description: '+10% find bonus in maze',
    effect: { findBonus: 10 },
    lore: 'A shard of obsidian that sharpens perception.',
    image: ASSET('Images/GameArt/Enhancements/Void-Touched Focus.png')
  },
  {
    id: 'tithe_eaters_coin',
    name: 'Tithe-Eater\'s Coin',
    description: 'Tithe costs 1 less Ichor',
    effect: { ichorDiscount: 1 },
    lore: 'The Prophets\' collectors always miscount in your favor.',
    image: ASSET('Images/GameArt/Enhancements/Chain of the Betrayer.png')
  },
  {
    id: 'iron_will_torc',
    name: 'Iron Will Torc',
    description: '+15 max Will',
    effect: { maxWill: 15 },
    lore: 'Heavy is the head that wears this crown of resolve.',
    image: ASSET('Images/GameArt/Enhancements/Iron Will.png')
  },
  {
    id: 'spectral_lens',
    name: 'Spectral Lens',
    description: '+8% summon chance',
    effect: { summonChance: 8 },
    lore: 'It reveals the threads between worlds.',
    image: ASSET('Images/GameArt/Enhancements/Spectral Lens.png')
  }
];

export const relicSlots = 3;

export function getRelicById(id: string): Relic | undefined {
  return relics.find(r => r.id === id);
}