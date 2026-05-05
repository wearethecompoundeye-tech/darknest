// js/data/cards.ts
// Complete Card Compendium for Kalgoth's Gaze - Enhanced Edition
// 100 cards with expanded stats, abilities, keywords, and combo synergies
// Last updated: 2026-04-20

export type CardType = 'entity' | 'spell' | 'enhancement' | 'land';
export type CardRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Aspect = 'Void' | 'Fire' | 'Earth' | 'Air' | 'Water' | 'Life' | 'Death' | 'All';

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

export interface SpellStats {
  cost: number;
  effect: string;
  damage?: number;
  healing?: number;
  keywords?: string[];
}

export interface EnhancementStats {
  effect: string;
  statBonus?: Partial<EntityStats>;
  aspectBonus?: Record<Aspect, Partial<EntityStats>>;
}

export interface LandStats {
  generation?: { resource: string; amount: number };
  effect?: string;
  combatBonus?: Partial<EntityStats>;
  expeditionBonus?: Partial<EntityStats>;
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

function getFramePath(rarity: CardRarity): string {
  const frames: Record<CardRarity, string> = {
    common: '/Images/Game Art/Frame Overlays/Common Frame.png',
    uncommon: '/Images/Game Art/Frame Overlays/Uncommon Frame.png',
    rare: '/Images/Game Art/Frame Overlays/Rare Frame.png',
    epic: '/Images/Game Art/Frame Overlays/Epic Frame.png',
    legendary: '/Images/Game Art/Frame Overlays/Legendary Frame.png'
  };
  return frames[rarity];
}

export const allCards: Card[] = [

  // ========== ENTITY CARDS (40) ==========

  // --- Common Entities (12) ---
  {
    id: 'umbral_mite', name: 'Umbral Mite', type: 'entity', rarity: 'common', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Umbral Mite.png', frame: getFramePath('common'),
    stats: { hp: 3, atk: 1, spd: 4, cun: 2, def: 0, res: 10, init: 3, loyalty: 70 },
    abilities: [
      { name: 'Shadow Meld', type: 'expedition', effect: 'Once per expedition, automatically avoid a Trap.', cooldown: 1 },
      { name: 'Void Syphon', type: 'combat', trigger: 'onDamage', effect: 'Heals 1 HP when dealing damage to a non-Void enemy.' }
    ],
    flavor: 'A tick of the void, feeding on the static of failed rituals.'
  },
  {
    id: 'ember_hound', name: 'Ember Hound', type: 'entity', rarity: 'common', aspect: 'Fire',
    image: '/Images/Game Art/Creatures/Ember Hound.png', frame: getFramePath('common'),
    stats: { hp: 5, atk: 3, spd: 3, cun: 1, def: 1, res: 0, init: 4, loyalty: 80 },
    abilities: [
      { name: 'Searing Bite', type: 'combat', trigger: 'onAttack', effect: '+1 ATK when fighting Minions.' },
      { name: 'Pack Hunter', type: 'passive', effect: '+1 ATK if another Fire entity is equipped.' }
    ],
    comboWith: ['cinder_wyrm', 'ashen_cherub'], comboEffect: 'Ember Hound gains +1 ATK and +1 HP.',
    flavor: 'A beast from the ashen plains where the old sun fell.'
  },
  {
    id: 'stone_warden', name: 'Stone Warden', type: 'entity', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Creatures/Stone Warden.png', frame: getFramePath('common'),
    stats: { hp: 7, atk: 2, spd: 2, cun: 1, def: 3, res: 5, init: 1, loyalty: 90 },
    abilities: [
      { name: 'Unyielding', type: 'passive', effect: 'Reduce Trap damage by 1.' },
      { name: 'Guardian', type: 'combat', trigger: 'onTurnStart', effect: 'Grants +1 DEF to adjacent allies.' }
    ],
    flavor: 'A remnant of the old mountains, now a silent sentinel.'
  },
  {
    id: 'zephyr_hawk', name: 'Zephyr Hawk', type: 'entity', rarity: 'common', aspect: 'Air',
    image: '/Images/Game Art/Creatures/Zephyr Hawk.png', frame: getFramePath('common'),
    stats: { hp: 3, atk: 2, spd: 5, cun: 3, def: 0, res: 5, init: 6, loyalty: 60 },
    abilities: [
      { name: 'Keen Sight', type: 'expedition', effect: 'Reveal one extra tile when exploring.' },
      { name: 'Dive', type: 'combat', trigger: 'onAttack', effect: 'First attack each combat deals +2 damage.' }
    ],
    flavor: 'It rides the stale winds that whisper forgotten names.'
  },
  {
    id: 'tidal_lurker', name: 'Tidal Lurker', type: 'entity', rarity: 'common', aspect: 'Water',
    image: '/Images/Game Art/Creatures/Tidal Lurker.png', frame: getFramePath('common'),
    stats: { hp: 4, atk: 2, spd: 3, cun: 2, def: 1, res: 15, init: 3, loyalty: 65 },
    abilities: [
      { name: 'Slippery', type: 'combat', effect: '20% chance to avoid Minion attacks.' },
      { name: 'Tidal Pull', type: 'expedition', effect: 'Resource tiles yield +1 extra resource.' }
    ],
    flavor: 'Born of the black, underground sea that knows no sun.'
  },
  {
    id: 'bone_lytch', name: 'Bone Lytch', type: 'entity', rarity: 'common', aspect: 'Death',
    image: '/Images/Game Art/Creatures/Bone Lytch.png', frame: getFramePath('common'),
    stats: { hp: 4, atk: 3, spd: 2, cun: 1, def: 1, res: 10, init: 2, loyalty: 50 },
    abilities: [
      { name: 'Undead Vigor', type: 'combat', trigger: 'onKill', effect: 'Heal 1 HP after defeating a Minion.' },
      { name: 'Fear Aura', type: 'passive', effect: 'Enemy Minions have -1 ATK.' }
    ],
    flavor: 'A soul too stubborn to pass on, bound to its own remains.'
  },
  {
    id: 'verdant_sprout', name: 'Verdant Sprout', type: 'entity', rarity: 'common', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Verdant Sprout.png', frame: getFramePath('common'),
    stats: { hp: 3, atk: 1, spd: 3, cun: 3, def: 0, res: 10, init: 2, loyalty: 80 },
    abilities: [
      { name: 'Photosynthesis', type: 'expedition', effect: 'Gain +1 CUN on Resource tiles.' },
      { name: 'Regrowth', type: 'combat', trigger: 'onTurnStart', effect: 'Heal 1 HP at start of turn if below 50% HP.' }
    ],
    flavor: 'The stubborn life that persists in the dark, twisted and defiant.'
  },
  {
    id: 'ashen_cherub', name: 'Ashen Cherub', type: 'entity', rarity: 'common', aspect: 'Fire',
    image: '/Images/Game Art/Creatures/Ashen Cherub.png', frame: getFramePath('common'),
    stats: { hp: 2, atk: 2, spd: 4, cun: 2, def: 0, res: 20, init: 5, loyalty: 60 },
    abilities: [
      { name: 'Flicker', type: 'combat', effect: '10% chance to dodge any damage.' },
      { name: 'Cinder Heal', type: 'combat', trigger: 'onTurnStart', effect: 'Heals 1 HP for each Fire spell cast this battle.' }
    ],
    flavor: 'A small, chubby infantile form of packed ash and glowing cinders.'
  },
  {
    id: 'pebble_horde', name: 'Pebble Horde', type: 'entity', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Creatures/Pebble Horde.png', frame: getFramePath('common'),
    stats: { hp: 5, atk: 1, spd: 3, cun: 1, def: 2, res: 0, init: 2, loyalty: 85 },
    abilities: [
      { name: 'Swarm', type: 'passive', effect: '+1 ATK for each other Pebble Horde in collection (max +3).' },
      { name: 'Rolling Shield', type: 'combat', effect: 'Reduces first attack damage by 2.' }
    ],
    flavor: 'A swarm of animated pebbles, each with a tiny, crude face.'
  },
  {
    id: 'mistling', name: 'Mistling', type: 'entity', rarity: 'common', aspect: 'Air',
    image: '/Images/Game Art/Creatures/Mistling.png', frame: getFramePath('common'),
    stats: { hp: 2, atk: 1, spd: 4, cun: 4, def: 0, res: 30, init: 5, loyalty: 55 },
    abilities: [
      { name: 'Formless', type: 'passive', effect: 'Immune to Trap damage.' },
      { name: 'Mist Veil', type: 'combat', trigger: 'onDamage', effect: '50% chance to reduce damage by 1.' }
    ],
    flavor: 'A small, sentient puff of grey fog with two bright, curious white eyes.'
  },
  {
    id: 'puddle_spawn', name: 'Puddle Spawn', type: 'entity', rarity: 'common', aspect: 'Water',
    image: '/Images/Game Art/Creatures/Puddle Spawn.png', frame: getFramePath('common'),
    stats: { hp: 3, atk: 1, spd: 3, cun: 2, def: 0, res: 25, init: 2, loyalty: 70 },
    abilities: [
      { name: 'Split', type: 'combat', trigger: 'onKill', effect: 'When defeated, 50% chance to return with 1 HP.' },
      { name: 'Absorb', type: 'expedition', effect: 'Water tiles heal 1 HP.' }
    ],
    flavor: 'A small, translucent blob that takes the shape of its container.'
  },
  {
    id: 'corpse_candle', name: 'Corpse-Candle', type: 'entity', rarity: 'common', aspect: 'Death',
    image: '/Images/Game Art/Creatures/Corpse-Candle.png', frame: getFramePath('common'),
    stats: { hp: 2, atk: 2, spd: 3, cun: 3, def: 0, res: 15, init: 4, loyalty: 45 },
    abilities: [
      { name: 'Revealing Light', type: 'expedition', effect: 'Wards cost 1 less CUN to bypass.' },
      { name: 'Soul Burn', type: 'combat', trigger: 'onAttack', effect: 'Deals +1 damage to enemies above 50% HP.' }
    ],
    flavor: 'A floating, disembodied hand of wax with a wick burning from its finger.'
  },

  // --- Uncommon Entities (10) ---
  {
    id: 'cinder_wyrm', name: 'Cinder Wyrm', type: 'entity', rarity: 'uncommon', aspect: 'Fire',
    image: '/Images/Game Art/Creatures/Cinder Wyrm.png', frame: getFramePath('uncommon'),
    stats: { hp: 8, atk: 4, spd: 3, cun: 1, def: 2, res: 10, init: 3, loyalty: 75 },
    abilities: [
      { name: 'Magma Trail', type: 'combat', effect: 'Minions take 1 damage when entering the tile.' },
      { name: 'Heat Wave', type: 'combat', trigger: 'onAttack', effect: 'Deals 1 damage to all enemies if HP is below 50%.' }
    ],
    flavor: 'A wingless drake with obsidian scales veined with crimson lava.'
  },
  {
    id: 'crystal_serpent', name: 'Crystal Serpent', type: 'entity', rarity: 'uncommon', aspect: 'Earth',
    image: '/Images/Game Art/Creatures/Crystal Serpent.png', frame: getFramePath('uncommon'),
    stats: { hp: 6, atk: 3, spd: 3, cun: 3, def: 3, res: 15, init: 3, loyalty: 80 },
    abilities: [
      { name: 'Gemhide', type: 'expedition', effect: 'Resource tiles yield +1 additional resource.' },
      { name: 'Refract', type: 'combat', effect: '20% chance to reflect spell damage back.' }
    ],
    flavor: 'Its scales are the memory of the earth, compressed into cold beauty.'
  },
  {
    id: 'storm_wisp', name: 'Storm Wisp', type: 'entity', rarity: 'uncommon', aspect: 'Air',
    image: '/Images/Game Art/Creatures/Storm Wisp.png', frame: getFramePath('uncommon'),
    stats: { hp: 4, atk: 3, spd: 5, cun: 3, def: 0, res: 20, init: 7, loyalty: 60 },
    abilities: [
      { name: 'Static Charge', type: 'expedition', effect: 'Wards take 1 extra turn to activate, giving +1 CUN to bypass.' },
      { name: 'Chain Lightning', type: 'combat', trigger: 'onAttack', effect: '30% chance to deal 2 damage to another enemy.' }
    ],
    flavor: 'A fragment of the great storm that shattered the sky.'
  },
  {
    id: 'frost_nereid', name: 'Frost Nereid', type: 'entity', rarity: 'uncommon', aspect: 'Water',
    image: '/Images/Game Art/Creatures/Frost Nereid.png', frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 3, spd: 4, cun: 3, def: 1, res: 25, init: 4, loyalty: 65 },
    abilities: [
      { name: 'Chilling Touch', type: 'combat', effect: 'Minions have -1 ATK when fighting this entity.' },
      { name: 'Frost Armor', type: 'passive', effect: 'Gains +1 DEF when HP is full.' }
    ],
    flavor: 'A daughter of the black tides, her touch is the mercy of a cold grave.'
  },
  {
    id: 'grave_mycelium', name: 'Grave Mycelium', type: 'entity', rarity: 'uncommon', aspect: 'Death',
    image: '/Images/Game Art/Creatures/Grave Mycelium.png', frame: getFramePath('uncommon'),
    stats: { hp: 5, atk: 2, spd: 2, cun: 2, def: 1, res: 20, init: 1, loyalty: 55 },
    abilities: [
      { name: 'Spore Cloud', type: 'combat', trigger: 'onKill', effect: 'When defeated, release spores that heal allies in collection for 1 HP.' },
      { name: 'Decompose', type: 'expedition', effect: 'Defeating a Minion yields +1 Bone Dust.' }
    ],
    flavor: 'A shuffling mass of pale, fleshy fungus in a vaguely humanoid shape.'
  },
  {
    id: 'thorned_sapling', name: 'Thorned Sapling', type: 'entity', rarity: 'uncommon', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Thorned Sapling.png', frame: getFramePath('uncommon'),
    stats: { hp: 6, atk: 4, spd: 2, cun: 1, def: 2, res: 5, init: 2, loyalty: 85 },
    abilities: [
      { name: 'Thorn Whip', type: 'combat', effect: '+1 ATK against Entities.' },
      { name: 'Entangle', type: 'combat', trigger: 'onAttack', effect: '20% chance to prevent enemy from attacking next turn.' }
    ],
    flavor: 'A young, mobile tree with bark like cracked leather and whip-like thorned branches.'
  },
  {
    id: 'void_wisp', name: 'Void Wisp', type: 'entity', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Void Wisp.png', frame: getFramePath('uncommon'),
    stats: { hp: 3, atk: 2, spd: 5, cun: 4, def: 0, res: 30, init: 6, loyalty: 50 },
    abilities: [
      { name: 'Blink', type: 'expedition', effect: 'Once per expedition, skip a Trap or Ward entirely.', cooldown: 1 },
      { name: 'Void Shift', type: 'combat', trigger: 'onDamage', effect: '50% chance to teleport behind enemy, gaining +2 ATK for that turn.' }
    ],
    flavor: 'A small, floating orb of pure darkness with a faint purple aura.'
  },
  {
    id: 'weeping_statue', name: 'Weeping Statue', type: 'entity', rarity: 'uncommon', aspect: 'Earth',
    image: '/Images/Game Art/Creatures/Weeping Statue.png', frame: getFramePath('uncommon'),
    stats: { hp: 8, atk: 2, spd: 1, cun: 1, def: 4, res: 10, init: 0, loyalty: 95 },
    abilities: [
      { name: 'Stone Tears', type: 'combat', effect: 'Adjacent Minions have -1 ATK.' },
      { name: 'Petrify', type: 'combat', trigger: 'onAttack', effect: '10% chance to stun enemy for 1 turn.' }
    ],
    flavor: 'An animated, cracked marble statue of a grieving woman.'
  },
  {
    id: 'ink_eyed_raven', name: 'Ink-Eyed Raven', type: 'entity', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Ink-Eyed Raven.png', frame: getFramePath('uncommon'),
    stats: { hp: 3, atk: 2, spd: 5, cun: 5, def: 0, res: 15, init: 8, loyalty: 45 },
    abilities: [
      { name: 'Omen', type: 'expedition', effect: 'Reveals the type of the next unexplored tile.' },
      { name: 'Dark Peck', type: 'combat', trigger: 'onAttack', effect: 'Ignores 2 DEF.' }
    ],
    flavor: 'A raven with feathers of absolute black; its eyes drip darkness.'
  },
  {
    id: 'magma_snail', name: 'Magma Snail', type: 'entity', rarity: 'uncommon', aspect: 'Fire',
    image: '/Images/Game Art/Creatures/Magma Snail.png', frame: getFramePath('uncommon'),
    stats: { hp: 7, atk: 2, spd: 2, cun: 1, def: 5, res: 5, init: 1, loyalty: 85 },
    abilities: [
      { name: 'Lava Shell', type: 'passive', effect: 'Reduce all damage taken by 1.' },
      { name: 'Slow Burn', type: 'combat', trigger: 'onTurnStart', effect: 'Deals 1 damage to enemy each turn.' }
    ],
    flavor: 'A giant snail with a shell of cooled volcanic rock, crisscrossed with lava veins.'
  },

  // --- Rare Entities (8) ---
  {
    id: 'verdant_spriggan', name: 'Verdant Spriggan', type: 'entity', rarity: 'rare', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Verdant Spriggan.png', frame: getFramePath('rare'),
    stats: { hp: 8, atk: 4, spd: 3, cun: 3, def: 2, res: 15, init: 3, loyalty: 80 },
    abilities: [
      { name: 'Regrowth', type: 'combat', trigger: 'onTurnStart', effect: 'Heal 2 HP at the start of each expedition turn.' },
      { name: 'Nature\'s Fury', type: 'combat', effect: '+2 ATK when fighting Death or Void entities.' }
    ],
    flavor: 'A gnarled wooden humanoid covered in moss and glowing fungi.'
  },
  {
    id: 'shade_first_acolyte', name: 'Shade of the First Acolyte', type: 'entity', rarity: 'rare', aspect: 'Death',
    image: '/Images/Game Art/Creatures/Shade of the First Acolyte.png', frame: getFramePath('rare'),
    stats: { hp: 6, atk: 5, spd: 3, cun: 4, def: 1, res: 25, init: 5, loyalty: 30 },
    abilities: [
      { name: 'Eternal Vigil', type: 'expedition', effect: 'Wards cost 0 CUN to bypass (auto-success).' },
      { name: 'Soul Drain', type: 'combat', trigger: 'onAttack', effect: 'Heals for 50% of damage dealt.' }
    ],
    flavor: 'An echo of ambition, forever seeking the power it once betrayed.'
  },
  {
    id: 'carrion_host', name: 'Carrion Host', type: 'entity', rarity: 'rare', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Carrion Host.png', frame: getFramePath('rare'),
    stats: { hp: 5, atk: 3, spd: 4, cun: 3, def: 1, res: 20, init: 4, loyalty: 40 },
    abilities: [
      { name: 'Devour', type: 'combat', trigger: 'onKill', effect: 'Defeating a Minion heals 3 HP.' },
      { name: 'Swarm', type: 'passive', effect: 'Gains +1 ATK for each defeated enemy this expedition.' }
    ],
    flavor: 'A mass of whispering, half-formed things that feed on decayed miracles.'
  },
  {
    id: 'howling_zephyr', name: 'Howling Zephyr', type: 'entity', rarity: 'rare', aspect: 'Air',
    image: '/Images/Game Art/Creatures/Howling Zephyr.png', frame: getFramePath('rare'),
    stats: { hp: 5, atk: 4, spd: 6, cun: 3, def: 0, res: 20, init: 9, loyalty: 55 },
    abilities: [
      { name: 'Gale Force', type: 'expedition', effect: 'Push Minions back one tile (avoid combat).', cooldown: 2 },
      { name: 'Sonic Boom', type: 'combat', trigger: 'onAttack', effect: 'Deals 1 damage to all enemies.' }
    ],
    flavor: 'A translucent, skeletal form made of screaming wind and dust.'
  },
  {
    id: 'abyssal_angler', name: 'Abyssal Angler', type: 'entity', rarity: 'rare', aspect: 'Water',
    image: '/Images/Game Art/Creatures/Abyssal Angler.png', frame: getFramePath('rare'),
    stats: { hp: 7, atk: 4, spd: 3, cun: 4, def: 2, res: 20, init: 3, loyalty: 60 },
    abilities: [
      { name: 'Lure', type: 'expedition', effect: '30% chance to turn a Minion into a Resource tile.' },
      { name: 'Deep Bite', type: 'combat', trigger: 'onAttack', effect: 'Ignores 3 DEF.' }
    ],
    flavor: 'A deep-sea fish with translucent skin and a hypnotic, star-like lure.'
  },
  {
    id: 'bloom_warden', name: 'Bloom Warden', type: 'entity', rarity: 'rare', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Bloom Warden.png', frame: getFramePath('rare'),
    stats: { hp: 9, atk: 3, spd: 2, cun: 4, def: 3, res: 15, init: 2, loyalty: 90 },
    abilities: [
      { name: 'Petal Shield', type: 'passive', effect: 'Allies in collection gain +1 HP at expedition start.' },
      { name: 'Aroma', type: 'combat', trigger: 'onTurnStart', effect: 'Heals all allies for 1 HP.' }
    ],
    flavor: 'A tall, elegant humanoid of interwoven vines and night-flowers.'
  },
  {
    id: 'silt_stalker', name: 'Silt Stalker', type: 'entity', rarity: 'rare', aspect: 'Water',
    image: '/Images/Game Art/Creatures/Silt Stalker.png', frame: getFramePath('rare'),
    stats: { hp: 6, atk: 5, spd: 3, cun: 2, def: 2, res: 10, init: 4, loyalty: 65 },
    abilities: [
      { name: 'Mudslide', type: 'expedition', effect: 'Traps have -2 difficulty to disarm.' },
      { name: 'Ambush', type: 'combat', effect: 'First attack each combat deals double damage.' }
    ],
    flavor: 'A creature of animated mud and silt, constantly shifting shape.'
  },
  {
    id: 'chained_tome', name: 'Chained Tome', type: 'entity', rarity: 'rare', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Chained Tome.png', frame: getFramePath('rare'),
    stats: { hp: 4, atk: 2, spd: 2, cun: 6, def: 0, res: 30, init: 2, loyalty: 20 },
    abilities: [
      { name: 'Forbidden Knowledge', type: 'passive', effect: '+2 CUN; can identify Hollow Lairs from 2 tiles away.' },
      { name: 'Arcane Burst', type: 'combat', trigger: 'onAttack', effect: 'Deals additional damage equal to half CUN.' }
    ],
    flavor: 'An ancient, floating book bound in pale, tattooed skin.'
  },

  // --- Epic Entities (6) ---
  {
    id: 'pyre_light_warden', name: 'Pyre-Light Warden', type: 'entity', rarity: 'epic', aspect: 'Fire',
    image: '/Images/Game Art/Creatures/Pyre-Light Warden.png', frame: getFramePath('epic'),
    stats: { hp: 10, atk: 6, spd: 3, cun: 3, def: 3, res: 20, init: 4, loyalty: 85 },
    abilities: [
      { name: 'Everburning', type: 'passive', effect: 'Immune to Fire-based Traps; +2 ATK against Hollows.' },
      { name: 'Cleansing Flame', type: 'combat', trigger: 'onAttack', effect: 'Removes all debuffs from allies.' }
    ],
    flavor: 'A tall being of blackened iron and molten brass, its head a brazier of white-hot flame.'
  },
  {
    id: 'sunken_gods_lament', name: "The Sunken God's Lament", type: 'entity', rarity: 'epic', aspect: 'Water',
    image: '/Images/Game Art/Creatures/The Sunken God\'s Lament.png', frame: getFramePath('epic'),
    stats: { hp: 12, atk: 5, spd: 2, cun: 4, def: 4, res: 30, init: 1, loyalty: 75 },
    abilities: [
      { name: 'Abyssal Presence', type: 'passive', effect: 'All Water entities gain +1 ATK and +1 HP.' },
      { name: 'Drowning Gaze', type: 'combat', trigger: 'onAttack', effect: 'Reduces enemy ATK by 2 for 1 turn.' }
    ],
    flavor: 'A colossal, bioluminescent jellyfish dreaming of a drowned sun.'
  },
  {
    id: 'tempest_roc', name: 'Tempest Roc', type: 'entity', rarity: 'epic', aspect: 'Air',
    image: '/Images/Game Art/Creatures/Tempest Roc.png', frame: getFramePath('epic'),
    stats: { hp: 9, atk: 7, spd: 6, cun: 3, def: 2, res: 15, init: 10, loyalty: 70 },
    abilities: [
      { name: 'Thunderous Dive', type: 'expedition', effect: 'Once per expedition, destroy a Minion instantly.', cooldown: 1 },
      { name: 'Stormcaller', type: 'combat', trigger: 'onSummon', effect: 'Deals 3 damage to all enemies.' }
    ],
    flavor: 'A massive bird with wings of storm clouds and lightning.'
  },
  {
    id: 'goliath_worm', name: 'Goliath Worm', type: 'entity', rarity: 'epic', aspect: 'Earth',
    image: '/Images/Game Art/Creatures/Goliath Worm.png', frame: getFramePath('epic'),
    stats: { hp: 15, atk: 6, spd: 1, cun: 1, def: 6, res: 10, init: 0, loyalty: 90 },
    abilities: [
      { name: 'Tunnel', type: 'expedition', effect: 'Can move through walls, ignoring maze paths.' },
      { name: 'Devour', type: 'combat', trigger: 'onKill', effect: 'Heals 5 HP and gains +1 permanent ATK this expedition.' }
    ],
    flavor: 'A gargantuan segmented worm with a hide of churning rock and crystal.'
  },
  {
    id: 'hollow_armor', name: 'Hollow Armor', type: 'entity', rarity: 'epic', aspect: 'Death',
    image: '/Images/Game Art/Creatures/Hollow Armor.png', frame: getFramePath('epic'),
    stats: { hp: 11, atk: 7, spd: 2, cun: 2, def: 5, res: 20, init: 2, loyalty: 20 },
    abilities: [
      { name: 'Soul Eater', type: 'combat', trigger: 'onKill', effect: 'Defeating a Minion grants +1 permanent ATK for this expedition.' },
      { name: 'Unholy Resilience', type: 'passive', effect: 'Cannot be reduced below 1 HP once per battle.' }
    ],
    flavor: 'A suit of ornate, blackened plate armor, empty yet moving with purpose.'
  },
  {
    id: 'glimmer_moth', name: 'Glimmer-Moth', type: 'entity', rarity: 'epic', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Glimmer-Moth.png', frame: getFramePath('epic'),
    stats: { hp: 6, atk: 3, spd: 5, cun: 5, def: 1, res: 25, init: 7, loyalty: 85 },
    abilities: [
      { name: 'Healing Scales', type: 'combat', trigger: 'onTurnStart', effect: 'All entities heal 2 HP after each expedition turn.' },
      { name: 'Blinding Light', type: 'combat', effect: 'Enemy has -2 CUN for 2 turns.' }
    ],
    flavor: 'A giant moth with wings of stained glass depicting a forgotten creation myth.'
  },

  // --- Legendary Entities (4) ---
  {
    id: 'null_elemental', name: 'Null Elemental', type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Null Elemental.png', frame: getFramePath('legendary'),
    stats: { hp: 12, atk: 8, spd: 4, cun: 5, def: 3, res: 40, init: 6, loyalty: 10 },
    abilities: [
      { name: 'Void Implosion', type: 'combat', effect: 'Once per expedition, banish a Minion or Hollow (non-boss) instantly.', cooldown: 1 },
      { name: 'Entropy', type: 'passive', effect: 'Enemy DEF and RES are halved.' }
    ],
    flavor: 'A humanoid silhouette of a starless void; faint, dying stars flicker within.'
  },
  {
    id: 'kalgoths_echo', name: "Kalgoth's Echo", type: 'entity', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Creatures/Kalgoths Echo.png', frame: getFramePath('legendary'),
    stats: { hp: 14, atk: 9, spd: 3, cun: 4, def: 4, res: 35, init: 5, loyalty: 0 },
    abilities: [
      { name: 'Reality Crack', type: 'expedition', effect: 'Wards and Traps are automatically destroyed (no minigame).' },
      { name: 'Siphon', type: 'combat', trigger: 'onAttack', effect: 'Heals for 100% of damage dealt.' }
    ],
    flavor: 'A fragment of the demigod\'s shadow, given a twisted semblance of life.'
  },
  {
    id: 'orbex_remnant', name: 'Orbex Remnant', type: 'entity', rarity: 'legendary', aspect: 'Life',
    image: '/Images/Game Art/Creatures/Orbex Remnant.png', frame: getFramePath('legendary'),
    stats: { hp: 10, atk: 6, spd: 4, cun: 6, def: 2, res: 50, init: 8, loyalty: 100 },
    abilities: [
      { name: 'Divine Seed', type: 'passive', effect: 'All entities heal fully after each expedition turn.' },
      { name: 'Blessing', type: 'combat', trigger: 'onSummon', effect: 'Grants +2 to all stats for all allies this battle.' }
    ],
    flavor: 'The last pure manifestation of the divine seed, pulsing with the memory of creation.'
  },
  {
    id: 'final_acolytes_grief', name: "The Final Acolyte's Grief", type: 'entity', rarity: 'legendary', aspect: 'Death',
    image: '/Images/Game Art/Creatures/The Final Acolytes Grief.png', frame: getFramePath('legendary'),
    stats: { hp: 11, atk: 7, spd: 3, cun: 5, def: 3, res: 30, init: 4, loyalty: 15 },
    abilities: [
      { name: 'Sorrowful Wail', type: 'combat', effect: 'Hollows have -3 Resistance during Will Duels.' },
      { name: 'Soul Harvest', type: 'combat', trigger: 'onKill', effect: 'Summons a Wisp ally for 2 turns.' }
    ],
    flavor: 'A spectral fusion of the six fallen Acolytes, bound by chains of frozen sorrow.'
  },

  // ========== SPELL CARDS (25) ==========

  // --- Common Spells (6) ---
  {
    id: 'void_gaze', name: 'Void Gaze', type: 'spell', rarity: 'common', aspect: 'Void',
    image: '/Images/Game Art/Spells/Void Gaze.png', frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Reveal the type of the next 2 unexplored tiles.', keywords: ['Scout'] }
  },
  {
    id: 'ember_burst', name: 'Ember Burst', type: 'spell', rarity: 'common', aspect: 'Fire',
    image: '/Images/Game Art/Spells/Ember Burst.png', frame: getFramePath('common'),
    stats: { cost: 3, effect: 'Deal 3 damage to a Minion or Hollow.', damage: 3, keywords: ['Direct Damage'] }
  },
  {
    id: 'stone_skin', name: 'Stone Skin', type: 'spell', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Spells/Stone Skin.png', frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Your active entity gains +2 HP and reduces next damage by 1.', keywords: ['Defensive'] }
  },
  {
    id: 'frost_snap', name: 'Frost Snap', type: 'spell', rarity: 'common', aspect: 'Water',
    image: '/Images/Game Art/Spells/Frost Snap.png', frame: getFramePath('common'),
    stats: { cost: 2, effect: 'Freeze a Ward, bypassing it without a minigame.', keywords: ['Utility'] }
  },
  {
    id: 'flicker_flame', name: 'Flicker-Flame', type: 'spell', rarity: 'common', aspect: 'Fire',
    image: '/Images/Game Art/Spells/Flicker-Flame.png', frame: getFramePath('common'),
    stats: { cost: 1, effect: 'Your entity gains +1 ATK for this expedition turn.', keywords: ['Buff'] }
  },
  {
    id: 'pebble_dart', name: 'Pebble Dart', type: 'spell', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Spells/Pebble Dart.png', frame: getFramePath('common'),
    stats: { cost: 1, effect: 'Deal 1 damage to a Minion; ignores armor.', damage: 1, keywords: ['Piercing'] }
  },

  // --- Uncommon Spells (7) ---
  {
    id: 'whispering_wind', name: 'Whispering Wind', type: 'spell', rarity: 'uncommon', aspect: 'Air',
    image: '/Images/Game Art/Spells/Whispering Wind.png', frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Reveal a Hollow Lair location on the current map.', keywords: ['Scout'] }
  },
  {
    id: 'grasping_roots', name: 'Grasping Roots', type: 'spell', rarity: 'uncommon', aspect: 'Life',
    image: '/Images/Game Art/Spells/Grasping Roots.png', frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Immobilize a Minion for one turn, preventing its attack.', keywords: ['Control'] }
  },
  {
    id: 'withering_touch', name: 'Withering Touch', type: 'spell', rarity: 'uncommon', aspect: 'Death',
    image: '/Images/Game Art/Spells/Withering Touch.png', frame: getFramePath('uncommon'),
    stats: { cost: 4, effect: 'Reduce a Minion\'s ATK by 2 for the remainder of combat.', keywords: ['Debuff'] }
  },
  {
    id: 'void_shift', name: 'Void Shift', type: 'spell', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Spells/Void Shift.png', frame: getFramePath('uncommon'),
    stats: { cost: 2, effect: 'Teleport your entity to any revealed tile.', keywords: ['Utility'] }
  },
  {
    id: 'condensation', name: 'Condensation', type: 'spell', rarity: 'uncommon', aspect: 'Water',
    image: '/Images/Game Art/Spells/Condensation.png', frame: getFramePath('uncommon'),
    stats: { cost: 2, effect: 'Heal your active entity for 3 HP.', healing: 3, keywords: ['Heal'] }
  },
  {
    id: 'congealing_void', name: 'Congealing Void', type: 'spell', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Spells/Congealing Void.png', frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Create a temporary barrier; Minions cannot enter your tile this turn.', keywords: ['Defensive'] }
  },
  {
    id: 'warding_glyph', name: 'Warding Glyph', type: 'spell', rarity: 'uncommon', aspect: 'All',
    image: '/Images/Game Art/Spells/Warding Glyph.png', frame: getFramePath('uncommon'),
    stats: { cost: 3, effect: 'Your entity gains +2 CUN for the next Ward encounter.', keywords: ['Buff'] }
  },

  // --- Rare Spells (6) ---
  {
    id: 'acolytes_sorrow', name: "The Acolyte's Sorrow", type: 'spell', rarity: 'rare', aspect: 'Death',
    image: '/Images/Game Art/Spells/The Acolytes Sorrow.png', frame: getFramePath('rare'),
    stats: { cost: 5, effect: 'During a Will Duel, reduce Hollow Resistance by 2.', keywords: ['Duel'] }
  },
  {
    id: 'pyroclastic_flow', name: 'Pyroclastic Flow', type: 'spell', rarity: 'rare', aspect: 'Fire',
    image: '/Images/Game Art/Spells/Pyroclastic Flow.png', frame: getFramePath('rare'),
    stats: { cost: 6, effect: 'Destroy all Minions on the current map (bosses immune).', keywords: ['AOE', 'Destruction'] }
  },
  {
    id: 'memory_of_flight', name: 'Memory of Flight', type: 'spell', rarity: 'rare', aspect: 'Air',
    image: '/Images/Game Art/Spells/Memory of Flight.png', frame: getFramePath('rare'),
    stats: { cost: 4, effect: 'Your entity can move 3 extra tiles this turn.', keywords: ['Mobility'] }
  },
  {
    id: 'abyssal_pressure', name: 'Abyssal Pressure', type: 'spell', rarity: 'rare', aspect: 'Water',
    image: '/Images/Game Art/Spells/Abyssal Pressure.png', frame: getFramePath('rare'),
    stats: { cost: 5, effect: 'Deal 5 damage to a Hollow (before Will Duel).', damage: 5, keywords: ['Direct Damage'] }
  },
  {
    id: 'bone_armor', name: 'Bone Armor', type: 'spell', rarity: 'rare', aspect: 'Death',
    image: '/Images/Game Art/Spells/Bone Armor.png', frame: getFramePath('rare'),
    stats: { cost: 4, effect: 'Your entity gains +3 HP and +1 ATK until the end of expedition.', keywords: ['Buff'] }
  },
  {
    id: 'the_sundering', name: 'The Sundering', type: 'spell', rarity: 'rare', aspect: 'Earth',
    image: '/Images/Game Art/Spells/The Sundering.png', frame: getFramePath('rare'),
    stats: { cost: 5, effect: 'Destroy a Ward or Trap tile permanently.', keywords: ['Utility'] }
  },

  // --- Epic Spells (4) ---
  {
    id: 'gaze_inverted_sun', name: 'Gaze of the Inverted Sun', type: 'spell', rarity: 'epic', aspect: 'Fire',
    image: '/Images/Game Art/Spells/Gaze of the Inverted Sun.png', frame: getFramePath('epic'),
    stats: { cost: 7, effect: 'Reveal the entire current map and deal 3 damage to all Minions.', damage: 3, keywords: ['AOE', 'Scout'] }
  },
  {
    id: 'soul_harvest', name: 'Soul Harvest', type: 'spell', rarity: 'epic', aspect: 'Death',
    image: '/Images/Game Art/Spells/Soul Harvest.png', frame: getFramePath('epic'),
    stats: { cost: 6, effect: 'Destroy a non-boss Minion and heal your entity to full HP.', keywords: ['Execute', 'Heal'] }
  },
  {
    id: 'starfall', name: 'Starfall', type: 'spell', rarity: 'epic', aspect: 'Void',
    image: '/Images/Game Art/Spells/Starfall.png', frame: getFramePath('epic'),
    stats: { cost: 8, effect: 'Deal 8 damage to a Hollow before the Will Duel.', damage: 8, keywords: ['Direct Damage'] }
  },
  {
    id: 'orbexs_benediction', name: "Orbex's Benediction", type: 'spell', rarity: 'epic', aspect: 'Life',
    image: '/Images/Game Art/Spells/Orbexs Benediction.png', frame: getFramePath('epic'),
    stats: { cost: 6, effect: 'Fully heal all entities in your collection and remove all negative effects.', keywords: ['Heal', 'Cleanse'] }
  },

  // --- Legendary Spells (2) ---
  {
    id: 'kalgoths_whisper', name: "Kalgoth's Whisper", type: 'spell', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Spells/Kalgoths Whisper.png', frame: getFramePath('legendary'),
    stats: { cost: 10, effect: 'Instantly win a Will Duel against a Hollow (once per game).', keywords: ['Ultimate'] }
  },
  {
    id: 'the_final_sneeze', name: 'The Final Sneeze', type: 'spell', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Spells/The Final Sneeze.png', frame: getFramePath('legendary'),
    stats: { cost: 0, effect: 'Randomly trigger one of: full heal, map reveal, or deal 10 damage to all enemies. 10% chance to backfire (lose 5 Will).', keywords: ['Chaos'] }
  },

  // ========== ENHANCEMENT CARDS (20) ==========

  // --- Common Enhancements (5) ---
  {
    id: 'sneezes_echo', name: "The Sneeze's Echo", type: 'enhancement', rarity: 'common', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/The Sneeze\'s Echo.png', frame: getFramePath('common'),
    stats: { effect: '10% chance to automatically succeed a failed Trace.' }
  },
  {
    id: 'iron_will', name: 'Iron Will', type: 'enhancement', rarity: 'common', aspect: 'All',
    image: '/Images/Game Art/Enhancements/Iron Will.png', frame: getFramePath('common'),
    stats: { effect: '+2 maximum Will.', statBonus: { maxWill: 2 } as any }
  },
  {
    id: 'smooth_river_stone', name: 'Smooth River Stone', type: 'enhancement', rarity: 'common', aspect: 'Water',
    image: '/Images/Game Art/Enhancements/Smooth River Stone.png', frame: getFramePath('common'),
    stats: { effect: '+1 HP for all Water entities.', aspectBonus: { Water: { hp: 1 } } as any }
  },
  {
    id: 'bone_charm', name: 'Bone Charm', type: 'enhancement', rarity: 'common', aspect: 'Death',
    image: '/Images/Game Art/Enhancements/Bone Charm.png', frame: getFramePath('common'),
    stats: { effect: 'Entities have +1 CUN when detecting Traps.', statBonus: { cun: 1 } as any }
  },
  {
    id: 'polished_geode', name: 'Polished Geode', type: 'enhancement', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Enhancements/Polished Geode.png', frame: getFramePath('common'),
    stats: { effect: 'Resource tiles yield +1 additional Moss.' }
  },

  // --- Uncommon Enhancements (5) ---
  {
    id: 'void_touched_focus', name: 'Void-Touched Focus', type: 'enhancement', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Void-Touched Focus.png', frame: getFramePath('uncommon'),
    stats: { effect: '+1 CUN for all Void entities.', aspectBonus: { Void: { cun: 1 } } as any }
  },
  {
    id: 'wisp_touched_lantern', name: 'Wisp-Touched Lantern', type: 'enhancement', rarity: 'uncommon', aspect: 'Life',
    image: '/Images/Game Art/Enhancements/Wisp-Touched Lantern.png', frame: getFramePath('uncommon'),
    stats: { effect: 'Reveal one extra tile when exploring.' }
  },
  {
    id: 'starlight_vial', name: 'Starlight Vial', type: 'enhancement', rarity: 'uncommon', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Starlight Vial.png', frame: getFramePath('uncommon'),
    stats: { effect: '+1 SPD for all entities.', statBonus: { spd: 1 } as any }
  },
  {
    id: 'acolytes_memoria', name: "Acolyte's Memoria", type: 'enhancement', rarity: 'uncommon', aspect: 'All',
    image: '/Images/Game Art/Enhancements/Acolytes Memoria.png', frame: getFramePath('uncommon'),
    stats: { effect: '+5 Circle Mastery XP per expedition.' }
  },
  {
    id: 'spectral_lens', name: 'Spectral Lens', type: 'enhancement', rarity: 'uncommon', aspect: 'Death',
    image: '/Images/Game Art/Enhancements/Spectral Lens.png', frame: getFramePath('uncommon'),
    stats: { effect: 'Wards cost 1 less CUN to bypass.' }
  },

  // --- Rare Enhancements (5) ---
  {
    id: 'tear_of_the_hollow', name: 'Tear of the Hollow', type: 'enhancement', rarity: 'rare', aspect: 'Death',
    image: '/Images/Game Art/Enhancements/Tear of the Hollow.png', frame: getFramePath('rare'),
    stats: { effect: 'Entities gain +1 ATK against Hollows.' }
  },
  {
    id: 'void_touched_timepiece', name: 'Void-Touched Timepiece', type: 'enhancement', rarity: 'rare', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Void-Touched Timepiece.png', frame: getFramePath('rare'),
    stats: { effect: '+1 expedition turn per day.' }
  },
  {
    id: 'map_inverted_sky', name: 'Map of the Inverted Sky', type: 'enhancement', rarity: 'rare', aspect: 'Air',
    image: '/Images/Game Art/Enhancements/Map of the Inverted Sky.png', frame: getFramePath('rare'),
    stats: { effect: 'Start each expedition with 3 extra revealed tiles.' }
  },
  {
    id: 'orbex_heart_shard', name: 'Orbex Heart-Shard', type: 'enhancement', rarity: 'rare', aspect: 'Life',
    image: '/Images/Game Art/Enhancements/Orbex Heart-Shard.png', frame: getFramePath('rare'),
    stats: { effect: 'All entities heal 1 HP at the start of each expedition turn.' }
  },
  {
    id: 'ring_last_acolyte', name: 'Ring of the Last Acolyte', type: 'enhancement', rarity: 'rare', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Ring of the Last Acolyte.png', frame: getFramePath('rare'),
    stats: { effect: '+5 maximum Will; +1 Will regeneration per day.', statBonus: { maxWill: 5 } as any }
  },

  // --- Epic Enhancements (3) ---
  {
    id: 'chain_of_the_betrayer', name: 'Chain of the Betrayer', type: 'enhancement', rarity: 'epic', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Chain of the Betrayer.png', frame: getFramePath('epic'),
    stats: { effect: 'Kalgoth\'s Noose increases 50% slower.' }
  },
  {
    id: 'seven_acolytes_sigil', name: "The Seven Acolytes' Sigil", type: 'enhancement', rarity: 'epic', aspect: 'All',
    image: '/Images/Game Art/Enhancements/The Seven Acolytes Sigil.png', frame: getFramePath('epic'),
    stats: { effect: 'All entities gain +1 to all stats (HP, ATK, SPD, CUN).', statBonus: { hp: 1, atk: 1, spd: 1, cun: 1 } as any }
  },
  {
    id: 'un_sneezed_breath', name: 'The Un-Sneezed Breath', type: 'enhancement', rarity: 'epic', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/The Un-Sneezed Breath.png', frame: getFramePath('epic'),
    stats: { effect: 'Once per day, automatically succeed a failed Trace with perfect quality.' }
  },

  // --- Legendary Enhancements (2) ---
  {
    id: 'the_final_sigil', name: 'The Final Sigil', type: 'enhancement', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/The Final Sigil.png', frame: getFramePath('legendary'),
    stats: { effect: 'Unlocks the Kalgoth\'s Bane pattern. +10 Circle Power when tracing.' }
  },
  {
    id: 'petrified_sneeze', name: 'Petrified Sneeze', type: 'enhancement', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Enhancements/Petrified Sneeze.png', frame: getFramePath('legendary'),
    stats: { effect: 'All failed Traces have a 25% chance to be treated as successes.' }
  },

  // ========== LAND CARDS (15) ==========

  // --- Common Lands (3) ---
  {
    id: 'void_spring', name: 'Void Spring', type: 'land', rarity: 'common', aspect: 'Void',
    image: '/Images/Game Art/Land/Void Spring.png', frame: getFramePath('common'),
    stats: { generation: { resource: 'Will', amount: 1 } }
  },
  {
    id: 'earths_embrace', name: "Earth's Embrace", type: 'land', rarity: 'common', aspect: 'Earth',
    image: '/Images/Game Art/Land/Earths Embrace.png', frame: getFramePath('common'),
    stats: { generation: { resource: 'Moss', amount: 2 } }
  },
  {
    id: 'zephyrs_breath', name: "Zephyr's Breath", type: 'land', rarity: 'common', aspect: 'Air',
    image: '/Images/Game Art/Land/Zephyrs Breath.png', frame: getFramePath('common'),
    stats: { generation: { resource: 'Phlegm', amount: 1 } }
  },

  // --- Uncommon Lands (4) ---
  {
    id: 'sanctum_of_ash', name: 'Sanctum of Ash', type: 'land', rarity: 'uncommon', aspect: 'Fire',
    image: '/Images/Game Art/Land/Sanctum of Ash.png', frame: getFramePath('uncommon'),
    stats: { effect: 'Fire entities gain +1 ATK while on expedition.', expeditionBonus: { atk: 1 } as any }
  },
  {
    id: 'the_weeping_wall', name: 'The Weeping Wall', type: 'land', rarity: 'uncommon', aspect: 'Water',
    image: '/Images/Game Art/Land/The Weeping Wall.png', frame: getFramePath('uncommon'),
    stats: { generation: { resource: 'Ichor', amount: 1 } }
  },
  {
    id: 'crystal_womb_cavern', name: 'Crystal-Womb Cavern', type: 'land', rarity: 'uncommon', aspect: 'Earth',
    image: '/Images/Game Art/Land/Crystal-Womb Cavern.png', frame: getFramePath('uncommon'),
    stats: { effect: 'All entities gain +1 CUN while exploring.', expeditionBonus: { cun: 1 } as any }
  },
  {
    id: 'the_sinking_fen', name: 'The Sinking Fen', type: 'land', rarity: 'uncommon', aspect: 'Water',
    image: '/Images/Game Art/Land/The Sinking Fen.png', frame: getFramePath('uncommon'),
    stats: { effect: 'Traps have -1 difficulty to disarm.' }
  },

  // --- Rare Lands (4) ---
  {
    id: 'grove_of_the_unburied', name: 'Grove of the Unburied', type: 'land', rarity: 'rare', aspect: 'Life',
    image: '/Images/Game Art/Land/Grove of the Unburied.png', frame: getFramePath('rare'),
    stats: { generation: { resource: 'Moss', amount: 3 }, effect: 'Life entities heal +1 HP per turn.' }
  },
  {
    id: 'the_lytch_kings_folly', name: "The Lytch-King's Folly", type: 'land', rarity: 'rare', aspect: 'Death',
    image: '/Images/Game Art/Land/The Lytch-Kings Folly.png', frame: getFramePath('rare'),
    stats: { effect: 'Death entities have +2 HP.', expeditionBonus: { hp: 2 } as any }
  },
  {
    id: 'gallery_of_whispers', name: 'Gallery of Whispers', type: 'land', rarity: 'rare', aspect: 'Air',
    image: '/Images/Game Art/Land/Gallery of Whispers.png', frame: getFramePath('rare'),
    stats: { effect: 'Air entities have +2 SPD.', expeditionBonus: { spd: 2 } as any }
  },
  {
    id: 'the_first_flames_pyre', name: "The First Flame's Pyre", type: 'land', rarity: 'rare', aspect: 'Fire',
    image: '/Images/Game Art/Land/The First Flames Pyre.png', frame: getFramePath('rare'),
    stats: { generation: { resource: 'Ichor', amount: 2 }, effect: 'Fire entities gain +2 ATK against Minions.' }
  },

  // --- Epic Lands (2) ---
  {
    id: 'the_inverted_spire', name: 'The Inverted Spire', type: 'land', rarity: 'epic', aspect: 'Void',
    image: '/Images/Game Art/Land/The Inverted Spire.png', frame: getFramePath('epic'),
    stats: { effect: 'All Void entities gain +2 to all stats. Kalgoth\'s Noose increases 20% slower.' }
  },
  {
    id: 'orbexs_cradle', name: "Orbex's Cradle", type: 'land', rarity: 'epic', aspect: 'Life',
    image: '/Images/Game Art/Land/Orbexs Cradle.png', frame: getFramePath('epic'),
    stats: { effect: 'All entities heal 2 HP at the start of each turn. +5 Circle Power when tracing.' }
  },

  // --- Legendary Lands (2) ---
  {
    id: 'the_silent_library', name: 'The Silent Library', type: 'land', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Land/The Silent Library.png', frame: getFramePath('legendary'),
    stats: { effect: 'All Spell costs reduced by 1 (minimum 1). +3 CUN for all entities.', expeditionBonus: { cun: 3 } as any }
  },
  {
    id: 'the_sneezes_epicenter', name: "The Sneeze's Epicenter", type: 'land', rarity: 'legendary', aspect: 'Void',
    image: '/Images/Game Art/Land/The Sneezes Epicenter.png', frame: getFramePath('legendary'),
    stats: { effect: 'Random positive effect each expedition: +5 Will, full map reveal, or +10 temporary HP to all entities.' }
  }
];

// Helper functions
export function getCardById(id: string): Card | undefined {
  return allCards.find(c => c.id === id);
}

export function getCardsByType(type: CardType): Card[] {
  return allCards.filter(c => c.type === type);
}

export function getCardsByRarity(rarity: CardRarity): Card[] {
  return allCards.filter(c => c.rarity === rarity);
}

export function getCardsByAspect(aspect: string): Card[] {
  return allCards.filter(c => c.aspect === aspect);
}