// js/core/defaults.ts
import { type Card } from '../data/cards.js';

export const DEFAULT_ENTITY_CARD: Card = {
  id: 'umbral_mite',
  name: 'Umbral Mite',
  type: 'entity',
  rarity: 'common',
  aspect: 'Void',
  image: '/Images/Game Art/Creatures/Umbral Mite.png',
  frame: '/Images/Game Art/Frame Overlays/Common Frame.png',
  stats: { hp: 5, atk: 2, spd: 3, cun: 2, def: 0, res: 10, init: 3, loyalty: 70 },
  abilities: [{ name: 'Void Syphon', type: 'combat', trigger: 'onDamage', effect: 'Heals 1 HP when dealing damage.' }]
};
