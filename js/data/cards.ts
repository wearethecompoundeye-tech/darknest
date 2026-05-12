// js/data/cards.ts – Complete card registry with all entities, spells, enhancements, and lands.
// Image paths now use import.meta.env.BASE_URL for deployment compatibility.

export interface CardStats {
  hp?: number;
  atk?: number;
  spd?: number;
  cun?: number;
  def?: number;
  res?: number;
  init?: number;
  loyalty?: number;
  cost?: number;
  effect?: string;
}

export interface Card {
  id: string;
  name: string;
  type: 'entity' | 'spell' | 'enhancement' | 'land';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  aspect: string;
  image: string;
  frame: string;
  stats: CardStats;
  abilities?: string[];
}

function getFramePath(rarity: string): string {
  const base = `${import.meta.env.BASE_URL}Images/Game Art/Frame Overlays/`;
  switch (rarity) {
    case 'common':    return `${base}Common Frame.png`;
    case 'uncommon':  return `${base}Uncommon Frame.png`;
    case 'rare':      return `${base}Rare Frame.png`;
    case 'epic':      return `${base}Epic Frame.png`;
    case 'legendary': return `${base}Legendary Frame.png`;
    default:          return `${base}Common Frame.png`;
  }
}

export const allCards: Card[] = [

  // ═══════════════════════════════════════════════════════
  // ENTITIES – Common
  // ═══════════════════════════════════════════════════════
  {
    id: 'umbral_mite', name: 'Umbral Mite', type: 'entity', rarity: 'common', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Umbral Mite.png`, frame: getFramePath('common'),
    stats: { hp: 4, atk: 2, spd: 2, cun: 1, def: 1, res: 10, init: 2, loyalty: 60 }
  },
  {
    id: 'ember_hound', name: 'Ember Hound', type: 'entity', rarity: 'common', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Ember Hound.png`, frame: getFramePath('common'),
    stats: { hp: 5, atk: 3, spd: 3, cun: 1, def: 2, res: 5, init: 3, loyalty: 65 }
  },
  {
    id: 'stone_warden', name: 'Stone Warden', type: 'entity', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Stone Warden.png`, frame: getFramePath('common'),
    stats: { hp: 7, atk: 2, spd: 1, cun: 1, def: 4, res: 8, init: 1, loyalty: 70 }
  },
  {
    id: 'zephyr_hawk', name: 'Zephyr Hawk', type: 'entity', rarity: 'common', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Zephyr Hawk.png`, frame: getFramePath('common'),
    stats: { hp: 3, atk: 2, spd: 5, cun: 2, def: 1, res: 10, init: 4, loyalty: 55 }
  },
  {
    id: 'tidal_lurker', name: 'Tidal Lurker', type: 'entity', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Tidal Lurker.png`, frame: getFramePath('common'),
    stats: { hp: 5, atk: 2, spd: 2, cun: 1, def: 3, res: 15, init: 1, loyalty: 60 }
  },
  {
    id: 'bone_lytch', name: 'Bone Lytch', type: 'entity', rarity: 'common', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Bone Lytch.png`, frame: getFramePath('common'),
    stats: { hp: 4, atk: 3, spd: 2, cun: 1, def: 2, res: 5, init: 2, loyalty: 50 }
  },
  {
    id: 'verdant_sprout', name: 'Verdant Sprout', type: 'entity', rarity: 'common', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Verdant Sprout.png`, frame: getFramePath('common'),
    stats: { hp: 6, atk: 1, spd: 2, cun: 1, def: 3, res: 12, init: 1, loyalty: 75 }
  },
  {
    id: 'ashen_cherub', name: 'Ashen Cherub', type: 'entity', rarity: 'common', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Ashen Cherub.png`, frame: getFramePath('common'),
    stats: { hp: 3, atk: 4, spd: 3, cun: 1, def: 1, res: 5, init: 3, loyalty: 40 }
  },
  {
    id: 'pebble_horde', name: 'Pebble Horde', type: 'entity', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Pebble Horde.png`, frame: getFramePath('common'),
    stats: { hp: 8, atk: 1, spd: 1, cun: 1, def: 5, res: 5, init: 1, loyalty: 80 }
  },
  {
    id: 'mistling', name: 'Mistling', type: 'entity', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Mistling.png`, frame: getFramePath('common'),
    stats: { hp: 4, atk: 1, spd: 3, cun: 2, def: 1, res: 20, init: 2, loyalty: 50 }
  },
  {
    id: 'puddle_spawn', name: 'Puddle Spawn', type: 'entity', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Puddle Spawn.png`, frame: getFramePath('common'),
    stats: { hp: 5, atk: 2, spd: 1, cun: 1, def: 2, res: 15, init: 1, loyalty: 55 }
  },
  {
    id: 'corpse_candle', name: 'Corpse-Candle', type: 'entity', rarity: 'common', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Corpse-Candle.png`, frame: getFramePath('common'),
    stats: { hp: 3, atk: 3, spd: 3, cun: 1, def: 1, res: 5, init: 3, loyalty: 45 }
  },
  {
    id: 'bone_mite', name: 'Bone Mite', type: 'entity', rarity: 'common', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/bone_mite.png`, frame: getFramePath('common'),
    stats: { hp: 2, atk: 2, spd: 4, cun: 1, def: 0, res: 5, init: 5, loyalty: 30 }
  },
  {
    id: 'mist_wisp', name: 'Mist Wisp', type: 'entity', rarity: 'common', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/mist_wisp.png`, frame: getFramePath('common'),
    stats: { hp: 3, atk: 1, spd: 4, cun: 2, def: 1, res: 10, init: 4, loyalty: 45 }
  },
  {
    id: 'moss_whelp', name: 'Moss Whelp', type: 'entity', rarity: 'common', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/moss_whelp.png`, frame: getFramePath('common'),
    stats: { hp: 5, atk: 1, spd: 2, cun: 1, def: 3, res: 10, init: 1, loyalty: 70 }
  },
  {
    id: 'pincer_snap', name: 'Pincer Snap', type: 'entity', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Pincer Snap.png`, frame: getFramePath('common'),
    stats: { hp: 4, atk: 4, spd: 2, cun: 1, def: 3, res: 5, init: 2, loyalty: 60 }
  },
  {
    id: 'slime_trail', name: 'Slime Trail', type: 'entity', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Slime Trail.png`, frame: getFramePath('common'),
    stats: { hp: 6, atk: 1, spd: 1, cun: 1, def: 4, res: 10, init: 1, loyalty: 65 }
  },

  // ═══════════════════════════════════════════════════════
  // ENTITIES – Uncommon
  // ═══════════════════════════════════════════════════════
  {
    id: 'cinder_wyrm', name: 'Cinder Wyrm', type: 'entity', rarity: 'uncommon', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Cinder Wyrm.png`, frame: getFramePath('uncommon'),
    stats: { hp: 6, atk: 4, spd: 3, cun: 2, def: 3, res: 10, init: 3, loyalty: 60 }
  },
  {
    id: 'crystal_serpent', name: 'Crystal Serpent', type: 'entity', rarity: 'uncommon', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Crystal Serpent.png`, frame: getFramePath('uncommon'),
    stats: { hp: 8, atk: 3, spd: 2, cun: 2, def: 5, res: 15, init: 1, loyalty: 70 }
  },
  {
    id: 'storm_wisp', name: 'Storm Wisp', type: 'entity', rarity: 'uncommon', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Storm Wisp.png`, frame: getFramePath('uncommon'),
    stats: { hp: 4, atk: 3, spd: 6, cun: 2, def: 1, res: 10, init: 5, loyalty: 50 }
  },
  {
    id: 'frost_nereid', name: 'Frost Nereid', type: 'entity', rarity: 'uncommon', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Frost Nereid.png`, frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 3, spd: 4, cun: 2, def: 3, res: 20, init: 3, loyalty: 55 }
  },
  {
    id: 'grave_mycelium', name: 'Grave Mycelium', type: 'entity', rarity: 'uncommon', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Grave Mycelium.png`, frame: getFramePath('uncommon'),
    stats: { hp: 7, atk: 2, spd: 1, cun: 2, def: 4, res: 10, init: 1, loyalty: 65 }
  },
  {
    id: 'thorned_sapling', name: 'Thorned Sapling', type: 'entity', rarity: 'uncommon', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Thorned Sapling.png`, frame: getFramePath('uncommon'),
    stats: { hp: 6, atk: 3, spd: 2, cun: 2, def: 4, res: 15, init: 2, loyalty: 70 }
  },
  {
    id: 'void_wisp', name: 'Void Wisp', type: 'entity', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Void Wisp.png`, frame: getFramePath('uncommon'),
    stats: { hp: 3, atk: 4, spd: 5, cun: 2, def: 0, res: 15, init: 5, loyalty: 35 }
  },
  {
    id: 'weeping_statue', name: 'Weeping Statue', type: 'entity', rarity: 'uncommon', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Weeping Statue.png`, frame: getFramePath('uncommon'),
    stats: { hp: 10, atk: 1, spd: 0, cun: 1, def: 7, res: 20, init: 0, loyalty: 90 }
  },
  {
    id: 'ink_eyed_raven', name: 'Ink-Eyed Raven', type: 'entity', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Ink-Eyed Raven.png`, frame: getFramePath('uncommon'),
    stats: { hp: 4, atk: 3, spd: 5, cun: 3, def: 1, res: 10, init: 4, loyalty: 45 }
  },
  {
    id: 'magma_snail', name: 'Magma Snail', type: 'entity', rarity: 'uncommon', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Magma Snail.png`, frame: getFramePath('uncommon'),
    stats: { hp: 8, atk: 2, spd: 1, cun: 1, def: 6, res: 10, init: 1, loyalty: 75 }
  },
  {
    id: 'carrion_bloom', name: 'Carrion‑Bloom', type: 'entity', rarity: 'uncommon', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Carrion‑Bloom.png`, frame: getFramePath('uncommon'),
    stats: { hp: 6, atk: 3, spd: 2, cun: 2, def: 3, res: 10, init: 2, loyalty: 55 }
  },
  {
    id: 'frost_weaver_spider', name: 'Frost‑Weaver Spider', type: 'entity', rarity: 'uncommon', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Frost‑Weaver Spider.png`, frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 3, spd: 4, cun: 3, def: 2, res: 15, init: 3, loyalty: 50 }
  },
  {
    id: 'furnace_hound', name: 'Furnace Hound', type: 'entity', rarity: 'uncommon', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Furnace Hound.png`, frame: getFramePath('uncommon'),
    stats: { hp: 7, atk: 4, spd: 3, cun: 1, def: 3, res: 5, init: 3, loyalty: 65 }
  },
  {
    id: 'howling_wraith', name: 'Howling Wraith', type: 'entity', rarity: 'uncommon', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Howling Wraith.png`, frame: getFramePath('uncommon'),
    stats: { hp: 3, atk: 4, spd: 5, cun: 2, def: 0, res: 10, init: 6, loyalty: 30 }
  },
  {
    id: 'screaming_gale', name: 'Screaming Gale', type: 'entity', rarity: 'uncommon', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Screaming Gale.png`, frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 3, spd: 6, cun: 2, def: 1, res: 10, init: 5, loyalty: 45 }
  },
  {
    id: 'shard_eater_ooze', name: 'Shard‑Eater Ooze', type: 'entity', rarity: 'uncommon', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Shard‑Eater Ooze.png`, frame: getFramePath('uncommon'),
    stats: { hp: 9, atk: 2, spd: 1, cun: 1, def: 5, res: 10, init: 1, loyalty: 80 }
  },
  {
    id: 'silt_shifter', name: 'Silt‑Shifter', type: 'entity', rarity: 'uncommon', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Silt‑Shifter.png`, frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 2, spd: 3, cun: 2, def: 3, res: 20, init: 2, loyalty: 60 }
  },

  // ═══════════════════════════════════════════════════════
  // ENTITIES – Rare
  // ═══════════════════════════════════════════════════════
  {
    id: 'verdant_spriggan', name: 'Verdant Spriggan', type: 'entity', rarity: 'rare', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Verdant Spriggan.png`, frame: getFramePath('rare'),
    stats: { hp: 9, atk: 4, spd: 3, cun: 3, def: 5, res: 20, init: 2, loyalty: 75 }
  },
  {
    id: 'shade_of_the_first_acolyte', name: 'Shade of the First Acolyte', type: 'entity', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Shade of the First Acolyte.png`, frame: getFramePath('rare'),
    stats: { hp: 6, atk: 5, spd: 4, cun: 4, def: 2, res: 20, init: 4, loyalty: 40 }
  },
  {
    id: 'carrion_host', name: 'Carrion Host', type: 'entity', rarity: 'rare', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Carrion Host.png`, frame: getFramePath('rare'),
    stats: { hp: 8, atk: 3, spd: 2, cun: 3, def: 4, res: 15, init: 2, loyalty: 60 }
  },
  {
    id: 'howling_zephyr', name: 'Howling Zephyr', type: 'entity', rarity: 'rare', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Howling Zephyr.png`, frame: getFramePath('rare'),
    stats: { hp: 5, atk: 4, spd: 7, cun: 3, def: 1, res: 15, init: 6, loyalty: 45 }
  },
  {
    id: 'abyssal_angler', name: 'Abyssal Angler', type: 'entity', rarity: 'rare', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Abyssal Angler.png`, frame: getFramePath('rare'),
    stats: { hp: 7, atk: 5, spd: 3, cun: 3, def: 4, res: 25, init: 2, loyalty: 50 }
  },
  {
    id: 'bloom_warden', name: 'Bloom Warden', type: 'entity', rarity: 'rare', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Bloom Warden.png`, frame: getFramePath('rare'),
    stats: { hp: 10, atk: 2, spd: 2, cun: 3, def: 6, res: 25, init: 1, loyalty: 80 }
  },
  {
    id: 'silt_stalker', name: 'Silt Stalker', type: 'entity', rarity: 'rare', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Silt Stalker.png`, frame: getFramePath('rare'),
    stats: { hp: 6, atk: 4, spd: 4, cun: 3, def: 3, res: 20, init: 3, loyalty: 60 }
  },
  {
    id: 'chained_tome', name: 'Chained Tome', type: 'entity', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Chained Tome.png`, frame: getFramePath('rare'),
    stats: { hp: 5, atk: 3, spd: 2, cun: 5, def: 2, res: 30, init: 2, loyalty: 30 }
  },
  {
    id: 'creeping_dread', name: 'Creeping Dread', type: 'entity', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Creeping Dread.png`, frame: getFramePath('rare'),
    stats: { hp: 6, atk: 4, spd: 3, cun: 4, def: 2, res: 25, init: 3, loyalty: 35 }
  },
  {
    id: 'iron_centipede', name: 'Iron Centipede', type: 'entity', rarity: 'rare', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/iron_centipede.png`, frame: getFramePath('rare'),
    stats: { hp: 9, atk: 3, spd: 2, cun: 2, def: 7, res: 15, init: 1, loyalty: 70 }
  },
  {
    id: 'thorn_warden_treant', name: 'Thorn‑Warden Treant', type: 'entity', rarity: 'rare', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Thorn‑Warden Treant.png`, frame: getFramePath('rare'),
    stats: { hp: 11, atk: 3, spd: 1, cun: 2, def: 8, res: 20, init: 1, loyalty: 85 }
  },
  {
    id: 'abyssal_stalker', name: 'Abyssal Stalker', type: 'entity', rarity: 'rare', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Abyssal Stalker.png`, frame: getFramePath('rare'),
    stats: { hp: 7, atk: 5, spd: 4, cun: 3, def: 3, res: 20, init: 3, loyalty: 50 }
  },

  // ═══════════════════════════════════════════════════════
  // ENTITIES – Epic
  // ═══════════════════════════════════════════════════════
  {
    id: 'pyre_light_warden', name: 'Pyre-Light Warden', type: 'entity', rarity: 'epic', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Pyre-Light Warden.png`, frame: getFramePath('epic'),
    stats: { hp: 10, atk: 6, spd: 4, cun: 4, def: 5, res: 20, init: 4, loyalty: 60 }
  },
  {
    id: 'sunken_gods_lament', name: "The Sunken God's Lament", type: 'entity', rarity: 'epic', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/The Sunken God's Lament.png`, frame: getFramePath('epic'),
    stats: { hp: 12, atk: 5, spd: 2, cun: 4, def: 4, res: 30, init: 1, loyalty: 75 }
  },
  {
    id: 'tempest_roc', name: 'Tempest Roc', type: 'entity', rarity: 'epic', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Tempest Roc.png`, frame: getFramePath('epic'),
    stats: { hp: 8, atk: 5, spd: 8, cun: 3, def: 2, res: 15, init: 7, loyalty: 45 }
  },
  {
    id: 'goliath_worm', name: 'Goliath Worm', type: 'entity', rarity: 'epic', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Goliath Worm.png`, frame: getFramePath('epic'),
    stats: { hp: 15, atk: 4, spd: 1, cun: 2, def: 9, res: 20, init: 0, loyalty: 80 }
  },
  {
    id: 'hollow_armor', name: 'Hollow Armor', type: 'entity', rarity: 'epic', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Hollow Armor.png`, frame: getFramePath('epic'),
    stats: { hp: 10, atk: 6, spd: 2, cun: 3, def: 7, res: 15, init: 1, loyalty: 70 }
  },
  {
    id: 'glimmer_moth', name: 'Glimmer-Moth', type: 'entity', rarity: 'epic', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Glimmer-Moth.png`, frame: getFramePath('epic'),
    stats: { hp: 7, atk: 3, spd: 5, cun: 5, def: 3, res: 30, init: 4, loyalty: 65 }
  },
  {
    id: 'obsidian_gargoyle', name: 'Obsidian Gargoyle', type: 'entity', rarity: 'epic', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Obsidian Gargoyle.png`, frame: getFramePath('epic'),
    stats: { hp: 12, atk: 5, spd: 3, cun: 3, def: 8, res: 20, init: 2, loyalty: 70 }
  },
  {
    id: 'the_sneeze', name: 'The Sneeze', type: 'entity', rarity: 'epic', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/The Sneeze.png`, frame: getFramePath('epic'),
    stats: { hp: 6, atk: 7, spd: 6, cun: 3, def: 1, res: 10, init: 6, loyalty: 40 }
  },

  // ═══════════════════════════════════════════════════════
  // ENTITIES – Legendary
  // ═══════════════════════════════════════════════════════
  {
    id: 'null_elemental', name: 'Null Elemental', type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Null Elemental.png`, frame: getFramePath('legendary'),
    stats: { hp: 15, atk: 7, spd: 5, cun: 6, def: 5, res: 40, init: 5, loyalty: 30 }
  },
  {
    id: 'kalgoths_echo', name: "Kalgoth's Echo", type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Kalgoths Echo.png`, frame: getFramePath('legendary'),
    stats: { hp: 20, atk: 8, spd: 4, cun: 7, def: 6, res: 50, init: 4, loyalty: 10 }
  },
  {
    id: 'orbex_remnant', name: 'Orbex Remnant', type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/Orbex Remnant.png`, frame: getFramePath('legendary'),
    stats: { hp: 18, atk: 6, spd: 6, cun: 8, def: 4, res: 60, init: 6, loyalty: 20 }
  },
  {
    id: 'the_final_acolytes_grief', name: "The Final Acolyte's Grief", type: 'entity', rarity: 'legendary', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/The Final Acolytes Grief.png`, frame: getFramePath('legendary'),
    stats: { hp: 25, atk: 9, spd: 3, cun: 5, def: 8, res: 30, init: 2, loyalty: 0 }
  },
  {
    id: 'the_sneeze_legendary', name: 'The Sneeze', type: 'entity', rarity: 'legendary', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Creatures/The Sneeze.png`, frame: getFramePath('legendary'),
    stats: { hp: 10, atk: 8, spd: 9, cun: 4, def: 2, res: 15, init: 8, loyalty: 30 }
  },

  // ═══════════════════════════════════════════════════════
  // SPELLS
  // ═══════════════════════════════════════════════════════
  {
    id: 'void_gaze', name: 'Void Gaze', type: 'spell', rarity: 'common', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Void Gaze.png`, frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Deal 3 damage' }
  },
  {
    id: 'ember_burst', name: 'Ember Burst', type: 'spell', rarity: 'common', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Ember Burst.png`, frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Deal 4 damage' }
  },
  {
    id: 'stone_skin', name: 'Stone Skin', type: 'spell', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Stone Skin.png`, frame: getFramePath('common'),
    stats: { cost: 3, effect: 'Gain +3 def' }
  },
  {
    id: 'frost_snap', name: 'Frost Snap', type: 'spell', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Frost Snap.png`, frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Freeze enemy for 1 turn' }
  },
  {
    id: 'flicker_flame', name: 'Flicker-Flame', type: 'spell', rarity: 'common', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Flicker-Flame.png`, frame: getFramePath('common'),
    stats: { cost: 1, effect: 'Deal 2 damage, draw 1 card' }
  },
  {
    id: 'pebble_dart', name: 'Pebble Dart', type: 'spell', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Pebble Dart.png`, frame: getFramePath('common'),
    stats: { cost: 1, effect: 'Deal 2 damage' }
  },
  {
    id: 'whispering_wind', name: 'Whispering Wind', type: 'spell', rarity: 'uncommon', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Whispering Wind.png`, frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Swap enemy stats for 1 turn' }
  },
  {
    id: 'grasping_roots', name: 'Grasping Roots', type: 'spell', rarity: 'uncommon', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Grasping Roots.png`, frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Root enemy (skip attack)' }
  },
  {
    id: 'withering_touch', name: 'Withering Touch', type: 'spell', rarity: 'uncommon', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Withering Touch.png`, frame: getFramePath('uncommon'),
    stats: { cost: 4, effect: 'Deal 5 damage, enemy loses 2 atk' }
  },
  {
    id: 'void_shift', name: 'Void Shift', type: 'spell', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Void Shift.png`, frame: getFramePath('uncommon'),
    stats: { cost: 2, effect: 'Teleport: avoid next attack' }
  },
  {
    id: 'condensation', name: 'Condensation', type: 'spell', rarity: 'uncommon', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Condensation.png`, frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Heal 4 HP' }
  },
  {
    id: 'congealing_void', name: 'Congealing Void', type: 'spell', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Congealing Void.png`, frame: getFramePath('uncommon'),
    stats: { cost: 5, effect: 'Deal 6 damage, drain 2 Will' }
  },
  {
    id: 'warding_glyph', name: 'Warding Glyph', type: 'spell', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Warding Glyph.png`, frame: getFramePath('uncommon'),
    stats: { cost: 2, effect: 'Place a temporary ward' }
  },
  {
    id: 'the_acolytes_sorrow', name: "The Acolyte's Sorrow", type: 'spell', rarity: 'rare', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/The Acolytes Sorrow.png`, frame: getFramePath('rare'),
    stats: { cost: 6, effect: 'All enemies take 4 damage' }
  },
  {
    id: 'pyroclastic_flow', name: 'Pyroclastic Flow', type: 'spell', rarity: 'rare', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Pyroclastic Flow.png`, frame: getFramePath('rare'),
    stats: { cost: 5, effect: 'Deal 8 damage' }
  },
  {
    id: 'memory_of_flight', name: 'Memory of Flight', type: 'spell', rarity: 'rare', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Memory of Flight.png`, frame: getFramePath('rare'),
    stats: { cost: 3, effect: 'Gain +5 spd' }
  },
  {
    id: 'abyssal_pressure', name: 'Abyssal Pressure', type: 'spell', rarity: 'rare', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Abyssal Pressure.png`, frame: getFramePath('rare'),
    stats: { cost: 6, effect: 'Deal 7 damage, reduce enemy res by 10' }
  },
  {
    id: 'bone_armor', name: 'Bone Armor', type: 'spell', rarity: 'rare', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Bone Armor.png`, frame: getFramePath('rare'),
    stats: { cost: 4, effect: 'Gain +4 def, +2 res' }
  },
  {
    id: 'the_sundering', name: 'The Sundering', type: 'spell', rarity: 'rare', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/The Sundering.png`, frame: getFramePath('rare'),
    stats: { cost: 7, effect: 'Deal 10 damage' }
  },
  {
    id: 'gaze_of_the_inverted_sun', name: 'Gaze of the Inverted Sun', type: 'spell', rarity: 'epic', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Gaze of the Inverted Sun.png`, frame: getFramePath('epic'),
    stats: { cost: 8, effect: 'Deal 12 damage, blind enemy' }
  },
  {
    id: 'soul_harvest', name: 'Soul Harvest', type: 'spell', rarity: 'epic', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Soul Harvest.png`, frame: getFramePath('epic'),
    stats: { cost: 6, effect: 'Drain 8 HP from enemy' }
  },
  {
    id: 'starfall', name: 'Starfall', type: 'spell', rarity: 'epic', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Starfall.png`, frame: getFramePath('epic'),
    stats: { cost: 9, effect: 'Deal 15 damage' }
  },
  {
    id: 'orbexs_benediction', name: "Orbex's Benediction", type: 'spell', rarity: 'epic', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Orbexs Benediction.png`, frame: getFramePath('epic'),
    stats: { cost: 5, effect: 'Heal 10 HP, remove debuffs' }
  },
  {
    id: 'kalgoths_whisper', name: "Kalgoth's Whisper", type: 'spell', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/Kalgoths Whisper.png`, frame: getFramePath('legendary'),
    stats: { cost: 10, effect: 'Destroy target entity' }
  },
  {
    id: 'the_final_sneeze', name: 'The Final Sneeze', type: 'spell', rarity: 'legendary', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Spells/The Final Sneeze.png`, frame: getFramePath('legendary'),
    stats: { cost: 12, effect: 'Deal 20 damage, reset turn' }
  },

  // ═══════════════════════════════════════════════════════
  // ENHANCEMENTS
  // ═══════════════════════════════════════════════════════
  {
    id: 'sneezes_echo', name: "The Sneeze's Echo", type: 'enhancement', rarity: 'common', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/The Sneeze's Echo.png`, frame: getFramePath('common'),
    stats: { effect: '10% chance to automatically succeed a failed Trace.' }
  },
  {
    id: 'iron_will', name: 'Iron Will', type: 'enhancement', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Iron Will.png`, frame: getFramePath('common'),
    stats: { effect: '+2 Max Will' }
  },
  {
    id: 'smooth_river_stone', name: 'Smooth River Stone', type: 'enhancement', rarity: 'common', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Smooth River Stone.png`, frame: getFramePath('common'),
    stats: { effect: '+5 water resistance' }
  },
  {
    id: 'bone_charm', name: 'Bone Charm', type: 'enhancement', rarity: 'common', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Bone Charm.png`, frame: getFramePath('common'),
    stats: { effect: '+1 loyalty to all entities' }
  },
  {
    id: 'polished_geode', name: 'Polished Geode', type: 'enhancement', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Polished Geode.png`, frame: getFramePath('common'),
    stats: { effect: '+1 def to equipped entity' }
  },
  {
    id: 'void_touched_focus', name: 'Void-Touched Focus', type: 'enhancement', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Void-Touched Focus.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+2 cun to equipped entity' }
  },
  {
    id: 'wisp_touched_lantern', name: 'Wisp-Touched Lantern', type: 'enhancement', rarity: 'uncommon', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Wisp-Touched Lantern.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+10 max HP' }
  },
  {
    id: 'starlight_vial', name: 'Starlight Vial', type: 'enhancement', rarity: 'uncommon', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Starlight Vial.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+2 atk to equipped entity' }
  },
  {
    id: 'acolytes_memoria', name: "Acolyte's Memoria", type: 'enhancement', rarity: 'uncommon', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Acolytes Memoria.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+1 orb fragment after Gaze survival' }
  },
  {
    id: 'spectral_lens', name: 'Spectral Lens', type: 'enhancement', rarity: 'uncommon', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Spectral Lens.png`, frame: getFramePath('uncommon'),
    stats: { effect: 'See hidden maze nodes' }
  },
  {
    id: 'tear_of_the_hollow', name: 'Tear of the Hollow', type: 'enhancement', rarity: 'rare', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Tear of the Hollow.png`, frame: getFramePath('rare'),
    stats: { effect: '+5 res, +2 atk' }
  },
  {
    id: 'void_touched_timepiece', name: 'Void-Touched Timepiece', type: 'enhancement', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Void-Touched Timepiece.png`, frame: getFramePath('rare'),
    stats: { effect: '+3 init to all entities' }
  },
  {
    id: 'map_of_the_inverted_sky', name: 'Map of the Inverted Sky', type: 'enhancement', rarity: 'rare', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Map of the Inverted Sky.png`, frame: getFramePath('rare'),
    stats: { effect: '+2 spd, +1 cun' }
  },
  {
    id: 'orbex_heart_shard', name: 'Orbex Heart-Shard', type: 'enhancement', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Orbex Heart-Shard.png`, frame: getFramePath('rare'),
    stats: { effect: '+3 Will regeneration per day' }
  },
  {
    id: 'ring_of_the_last_acolyte', name: 'Ring of the Last Acolyte', type: 'enhancement', rarity: 'rare', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Ring of the Last Acolyte.png`, frame: getFramePath('rare'),
    stats: { effect: '+5 loyalty, +1 cun' }
  },
  {
    id: 'chain_of_the_betrayer', name: 'Chain of the Betrayer', type: 'enhancement', rarity: 'epic', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Chain of the Betrayer.png`, frame: getFramePath('epic'),
    stats: { effect: 'Negate one trap per maze run' }
  },
  {
    id: 'the_seven_acolytes_sigil', name: 'The Seven Acolytes Sigil', type: 'enhancement', rarity: 'epic', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/The Seven Acolytes Sigil.png`, frame: getFramePath('epic'),
    stats: { effect: '+2 to all stats' }
  },
  {
    id: 'the_un_sneezed_breath', name: 'The Un-Sneezed Breath', type: 'enhancement', rarity: 'epic', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/The Un-Sneezed Breath.png`, frame: getFramePath('epic'),
    stats: { effect: '+5 spd, +3 atk' }
  },
  {
    id: 'the_final_sigil', name: 'The Final Sigil', type: 'enhancement', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/The Final Sigil.png`, frame: getFramePath('legendary'),
    stats: { effect: '+10 Will, +5 to all stats' }
  },
  {
    id: 'petrified_sneeze', name: 'Petrified Sneeze', type: 'enhancement', rarity: 'legendary', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Enhancements/Petrified Sneeze.png`, frame: getFramePath('legendary'),
    stats: { effect: 'Immunity to air-based spells' }
  },

  // ═══════════════════════════════════════════════════════
  // LANDS
  // ═══════════════════════════════════════════════════════
  {
    id: 'void_spring', name: 'Void Spring', type: 'land', rarity: 'common', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Void Spring.png`, frame: getFramePath('common'),
    stats: { effect: '+1 Will per turn' }
  },
  {
    id: 'earths_embrace', name: "Earth's Embrace", type: 'land', rarity: 'common', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Earths Embrace.png`, frame: getFramePath('common'),
    stats: { effect: '+1 def to all entities' }
  },
  {
    id: 'zephyrs_breath', name: "Zephyr's Breath", type: 'land', rarity: 'common', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Zephyrs Breath.png`, frame: getFramePath('common'),
    stats: { effect: '+1 spd to all entities' }
  },
  {
    id: 'sanctum_of_ash', name: 'Sanctum of Ash', type: 'land', rarity: 'uncommon', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Sanctum of Ash.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+2 atk to Fire entities' }
  },
  {
    id: 'the_weeping_wall', name: 'The Weeping Wall', type: 'land', rarity: 'uncommon', aspect: 'Water',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Weeping Wall.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+2 res to Water entities' }
  },
  {
    id: 'crystal_womb_cavern', name: 'Crystal-Womb Cavern', type: 'land', rarity: 'uncommon', aspect: 'Earth',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Crystal-Womb Cavern.png`, frame: getFramePath('uncommon'),
    stats: { effect: '+1 def, +1 res to all' }
  },
  {
    id: 'the_sinking_fen', name: 'The Sinking Fen', type: 'land', rarity: 'uncommon', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Sinking Fen.png`, frame: getFramePath('uncommon'),
    stats: { effect: 'Enemy loses 1 atk' }
  },
  {
    id: 'grove_of_the_unburied', name: 'Grove of the Unburied', type: 'land', rarity: 'rare', aspect: 'Life',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Grove of the Unburied.png`, frame: getFramePath('rare'),
    stats: { effect: 'Heal 3 HP per turn' }
  },
  {
    id: 'the_lytch_kings_folly', name: "The Lytch-King's Folly", type: 'land', rarity: 'rare', aspect: 'Death',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Lytch-Kings Folly.png`, frame: getFramePath('rare'),
    stats: { effect: '+3 atk, -1 def to all' }
  },
  {
    id: 'gallery_of_whispers', name: 'Gallery of Whispers', type: 'land', rarity: 'rare', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Gallery of Whispers.png`, frame: getFramePath('rare'),
    stats: { effect: '+2 cun to all entities' }
  },
  {
    id: 'the_first_flames_pyre', name: 'The First Flames Pyre', type: 'land', rarity: 'rare', aspect: 'Fire',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The First Flames Pyre.png`, frame: getFramePath('rare'),
    stats: { effect: '+3 atk to Fire entities' }
  },
  {
    id: 'the_inverted_spire', name: 'The Inverted Spire', type: 'land', rarity: 'epic', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Inverted Spire.png`, frame: getFramePath('epic'),
    stats: { effect: '+4 cun, +2 res' }
  },
  {
    id: 'orbexs_cradle', name: "Orbex's Cradle", type: 'land', rarity: 'epic', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/Orbexs Cradle.png`, frame: getFramePath('epic'),
    stats: { effect: 'Orb fragments count as 2' }
  },
  {
    id: 'the_silent_library', name: 'The Silent Library', type: 'land', rarity: 'legendary', aspect: 'Void',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Silent Library.png`, frame: getFramePath('legendary'),
    stats: { effect: '+5 Will, draw 2 extra cards' }
  },
  {
    id: 'the_sneezes_epicenter', name: "The Sneeze's Epicenter", type: 'land', rarity: 'legendary', aspect: 'Air',
    image: `${import.meta.env.BASE_URL}Images/Game Art/Land/The Sneezes Epicenter.png`, frame: getFramePath('legendary'),
    stats: { effect: 'All Air entities gain +5 spd' }
  }
];

export function getCardById(id: string): Card | undefined {
  return allCards.find(card => card.id === id);
}

export function getCardsByType(type: string): Card[] {
  return allCards.filter(card => card.type === type);
}