// js/data/relics.ts – Complete relic registry with correct image paths
import { getCardById, type Card } from './cards.js';

export const relicSlots = 3;

export interface Relic {
  id: string;
  name: string;
  description: string;
  lore: string;
  image: string;
  effect?: string;
}

export const relics: Relic[] = [
  {
    id: 'ring_of_the_last_acolyte',
    name: 'Ring of the Last Acolyte',
    description: '+5 loyalty, +1 cun',
    lore: 'Still warm from the first betrayal.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Ring of the Last Acolyte.png`
  },
  {
    id: 'orbex_heart_shard',
    name: 'Orbex Heart-Shard',
    description: '+3 Will regeneration per day',
    lore: 'A sliver of the shattered god.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Orbex Heart-Shard.png`
  },
  {
    id: 'void_touched_focus',
    name: 'Void-Touched Focus',
    description: '+2 cun to equipped entity',
    lore: 'Gazes back into the void.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Void-Touched Focus.png`
  },
  {
    id: 'chain_of_the_betrayer',
    name: 'Chain of the Betrayer',
    description: 'Negate one trap per maze run',
    lore: 'Links to a forsaken oath.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Chain of the Betrayer.png`
  },
  {
    id: 'iron_will',
    name: 'Iron Will',
    description: '+2 Max Will',
    lore: 'Forged in the Gaze.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Iron Will.png`
  },
  {
    id: 'spectral_lens',
    name: 'Spectral Lens',
    description: 'See hidden maze nodes',
    lore: 'Reveals what the Gaze hides.',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Spectral Lens.png`
  }
];

export function getRelicById(id: string): Relic | undefined {
  return relics.find(relic => relic.id === id);
}