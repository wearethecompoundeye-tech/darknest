// js/core/state-signals.ts
// Central reactive state for Kalgoth's Gaze
// Fixed: activeDemon cleanup, starting resources validation
// Persistence moved to js/core/persistence.ts
import { signal, computed, batch } from '@preact/signals-core';
import { getCardById } from '../data/cards.js';
import { relics as relicsData, relicSlots, getRelicById } from '../data/relics.js';
import { getEnhancedStats, checkForCombos, getAspectSynergyBonus } from '../systems/card-progression.js';
// --- Persistence (imported from separate module) ---
import { autoSave, loadSaveData } from './persistence.js';
export { autoSave, loadSaveData };
export const relics = relicsData;
export const CONSTANTS = {
    CYCLE_ACTIONS: 4,
    DAILY_ICHOR_REQUIREMENT: 5,
    DAILY_ORBEX_ICHOR: 5,
    FORAGE_COOLDOWN: 60000,
    SEED_RESONANCE_REGEN: 1,
    MAX_SEED_RESONANCE: 5,
    CAPTURED_DEMON_WILL_COST: 5,
    CAPTURED_DEMON_ICHOR_YIELD: 1,
    WHISP_HEALTH_REGEN_PER_LEVEL: 2,
    WHISP_MOSS_COST_PER_LEVEL: 1,
    GAZE_BASE_DRAIN_RATE: 2,
    GAZE_DRAIN_PER_INTENSITY: 0.5,
    GAZE_DURATION_SECONDS: 60,
    WARD_BASE_INTEGRITY: 100,
};
// ========== Initial State ==========
const initialState = {
    playerName: "Survivor",
    ingredients: {
        nightshadeMoss: 12,
        cryptPhlegm: 10,
        bansheeSalts: 5,
        wyrmEye: 0,
        demonIchor: 4,
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
    activeDemon: null,
    capturedDemons: [],
    banishPower: 0,
    demonFavor: {},
    demonWrath: 0,
    releasedDemons: [],
    unidentifiedRelics: [],
    knownRelics: [],
    equippedRelics: [null, null, null],
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
        demons: [],
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
    trueNameFragments: {},
    discoveredTrueNames: [],
    activeDemonTier: 1,
    orbexBoons: [],
    alcovesDiscovered: 0,
    mazePathsUnlocked: ['Warded', 'Safe'],
    demonImages: {
        imp: ['/Images/imp_1.png', '/Images/imp_2.png', '/Images/imp_3.png'],
        feral: ['/Images/Lesser_Feral.png', '/Images/Lesser_Feral_2.png'],
        cunning: ['/Images/Lesser_Cunning.png'],
        ancient: ['/Images/Lesser_Ancient.png'],
        volatile: ['/Images/Lesser_Volatile.png'],
        shadow: ['/Images/Lesser_Shadow.png'],
        kin: ['/Images/Kalgoths_Kin_1.png', '/Images/Kalgoths_Kin_2.png']
    },
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
// ========== Signals ==========
export const playerName = signal(initialState.playerName);
export const ingredients = signal(initialState.ingredients);
export const crafted = signal(initialState.crafted);
export const knownRunes = signal(initialState.knownRunes);
export const selectedRunes = signal(initialState.selectedRunes);
export const runeSlots = signal(initialState.runeSlots);
export const masteryLevel = signal(initialState.masteryLevel);
export const masteryXP = signal(initialState.masteryXP);
export const masteryNeeded = signal(initialState.masteryNeeded);
export const storyProgress = signal(initialState.storyProgress);
export const will = signal(initialState.will);
export const health = signal(initialState.health);
export const maxWill = signal(initialState.maxWill);
export const suspicion = signal(initialState.suspicion);
export const seedResonance = signal(initialState.seedResonance);
export const maxSeedResonance = signal(initialState.maxSeedResonance);
export const quotaRemaining = signal(initialState.quotaRemaining);
export const actionCounter = signal(initialState.actionCounter);
export const tithePaidThisDay = signal(initialState.tithePaidThisDay);
export const timerSeconds = signal(initialState.timerSeconds);
export const activeDemon = signal(initialState.activeDemon);
export const capturedDemons = signal(initialState.capturedDemons);
export const banishPower = signal(initialState.banishPower);
export const demonFavor = signal(initialState.demonFavor);
export const demonWrath = signal(initialState.demonWrath);
export const releasedDemons = signal(initialState.releasedDemons);
export const unidentifiedRelics = signal(initialState.unidentifiedRelics);
export const knownRelics = signal(initialState.knownRelics);
export const oldEquippedRelics = signal(initialState.equippedRelics);
export const revealedRituals = signal(initialState.revealedRituals);
export const hasSpecialIngredient = signal(initialState.hasSpecialIngredient);
export const temporaryBuffs = signal(initialState.temporaryBuffs);
export const familiar = signal(initialState.familiar);
export const lastPetTime = signal(initialState.lastPetTime);
export const lastForageTime = signal(initialState.lastForageTime);
export const totalSummons = signal(initialState.totalSummons);
export const totalExplorations = signal(initialState.totalExplorations);
export const totalWillClashWins = signal(initialState.totalWillClashWins);
export const tutorial = signal(initialState.tutorial);
export const discoveries = signal(initialState.discoveries);
export const currentMaze = signal(initialState.currentMaze);
export const circleQuality = signal(initialState.circleQuality);
export const circleIntegrity = signal(initialState.circleIntegrity);
export const ledgerEntries = signal(initialState.ledgerEntries);
export const ashAvailable = signal(initialState.ashAvailable);
export const pendingAshRemains = signal(initialState.pendingAshRemains);
export const itemUsageDaily = signal(initialState.itemUsageDaily);
export const orbexFragments = signal(initialState.orbexFragments);
export const maxOrbexFragments = signal(initialState.maxOrbexFragments);
export const corruptionLevel = signal(initialState.corruptionLevel);
export const trueNameFragments = signal(initialState.trueNameFragments);
export const discoveredTrueNames = signal(initialState.discoveredTrueNames);
export const activeDemonTier = signal(initialState.activeDemonTier);
export const orbexBoons = signal(initialState.orbexBoons);
export const alcovesDiscovered = signal(initialState.alcovesDiscovered);
export const mazePathsUnlocked = signal(initialState.mazePathsUnlocked);
export const demonImages = signal(initialState.demonImages);
export const kalgothsNoose = signal(initialState.kalgothsNoose ?? 10);
export const circlePower = signal(initialState.circlePower ?? 0);
export const circleMastery = signal(initialState.circleMastery ?? 0);
// ========== Gaze Signals ==========
export const gazeIntensity = signal(initialState.gazeIntensity ?? 5);
export const wardIntegrities = signal(initialState.wardIntegrities ?? [100, 100, 100]);
export const gazeSurvivalCount = signal(initialState.gazeSurvivalCount ?? 0);
export const dailyConsumableSlots = signal(initialState.dailyConsumableSlots ?? ['', '', '']);
export const isGazeActive = signal(initialState.isGazeActive ?? false);
export const gazePhase = signal(initialState.gazePhase ?? 'inactive');
const initialOwnedCards = [
    { cardId: 'umbral_mite', quantity: 1, enhancementLevel: 0 },
    { cardId: 'ember_hound', quantity: 1, enhancementLevel: 0 },
    { cardId: 'stone_warden', quantity: 1, enhancementLevel: 0 },
    { cardId: 'void_gaze', quantity: 1, enhancementLevel: 0 },
    { cardId: 'ember_burst', quantity: 1, enhancementLevel: 0 },
    { cardId: 'iron_will', quantity: 1, enhancementLevel: 0 },
    { cardId: 'void_spring', quantity: 1, enhancementLevel: 0 },
];
export const ownedCards = signal(initialOwnedCards);
export const equippedEntitySlots = signal(['umbral_mite', 'ember_hound']);
export const equippedSpellSlots = signal(['void_gaze', 'ember_burst']);
export const equippedEnhancementSlots = signal(['iron_will']);
export const equippedLandSlots = signal(['void_spring']);
export const maxEntitySlots = computed(() => {
    let slots = 2;
    if (circleMastery.value >= 3)
        slots++;
    if (circleMastery.value >= 6)
        slots++;
    if (orbexFragments.value >= 5)
        slots++;
    return slots;
});
export const maxSpellSlots = computed(() => {
    let slots = 2;
    if (circleMastery.value >= 2)
        slots++;
    if (orbexFragments.value >= 2)
        slots++;
    return Math.min(4, slots);
});
export const maxEnhancementSlots = computed(() => {
    let slots = 1;
    if (circleMastery.value >= 4)
        slots++;
    if (orbexFragments.value >= 3)
        slots++;
    return Math.min(3, slots);
});
export const maxLandSlots = computed(() => {
    let slots = 1;
    if (circleMastery.value >= 5)
        slots++;
    return Math.min(2, slots);
});
function unequipCardIfPresent(cardId) {
    equippedEntitySlots.value = equippedEntitySlots.value.filter(id => id !== cardId);
    equippedSpellSlots.value = equippedSpellSlots.value.filter(id => id !== cardId);
    equippedEnhancementSlots.value = equippedEnhancementSlots.value.filter(id => id !== cardId);
    equippedLandSlots.value = equippedLandSlots.value.filter(id => id !== cardId);
}
export function addCard(cardId, quantity = 1) {
    const current = ownedCards.value;
    const existing = current.find(c => c.cardId === cardId);
    if (existing) {
        existing.quantity += quantity;
        if (existing.quantity >= 2 && existing.enhancementLevel < 1)
            existing.enhancementLevel = 1;
        if (existing.quantity >= 3 && existing.enhancementLevel < 2)
            existing.enhancementLevel = 2;
        if (existing.quantity >= 4 && existing.enhancementLevel < 3)
            existing.enhancementLevel = 3;
        ownedCards.value = [...current];
    }
    else {
        ownedCards.value = [...current, { cardId, quantity, enhancementLevel: 0 }];
    }
    autoSave();
}
export function removeCard(cardId, quantity = 1) {
    const current = ownedCards.value;
    const index = current.findIndex(c => c.cardId === cardId);
    if (index === -1)
        return false;
    const card = current[index];
    if (card.quantity <= quantity) {
        ownedCards.value = current.filter((_, i) => i !== index);
    }
    else {
        card.quantity -= quantity;
        ownedCards.value = [...current];
    }
    unequipCardIfPresent(cardId);
    autoSave();
    return true;
}
export function hasCard(cardId) {
    return ownedCards.value.some(c => c.cardId === cardId);
}
export function getCardQuantity(cardId) {
    return ownedCards.value.find(c => c.cardId === cardId)?.quantity ?? 0;
}
export function getCardEnhancementLevel(cardId) {
    return ownedCards.value.find(c => c.cardId === cardId)?.enhancementLevel ?? 0;
}
export function mergeDuplicate(cardId) {
    const card = ownedCards.value.find(c => c.cardId === cardId);
    if (!card || card.quantity < 2 || card.enhancementLevel >= 3)
        return false;
    card.quantity--;
    card.enhancementLevel++;
    ownedCards.value = [...ownedCards.value];
    autoSave();
    return true;
}
export function equipCard(cardId, slotType, slotIndex) {
    const card = getCardById(cardId);
    if (!card || card.type !== slotType || !hasCard(cardId))
        return false;
    let slots;
    let maxSlots;
    switch (slotType) {
        case 'entity':
            slots = equippedEntitySlots;
            maxSlots = maxEntitySlots.value;
            break;
        case 'spell':
            slots = equippedSpellSlots;
            maxSlots = maxSpellSlots.value;
            break;
        case 'enhancement':
            slots = equippedEnhancementSlots;
            maxSlots = maxEnhancementSlots.value;
            break;
        case 'land':
            slots = equippedLandSlots;
            maxSlots = maxLandSlots.value;
            break;
        default: return false;
    }
    if (slotIndex < 0 || slotIndex >= maxSlots)
        return false;
    const currentSlots = [...slots.value];
    while (currentSlots.length <= slotIndex)
        currentSlots.push('');
    currentSlots[slotIndex] = cardId;
    slots.value = currentSlots;
    autoSave();
    return true;
}
export function unequipCard(slotType, slotIndex) {
    let slots;
    let maxSlots;
    switch (slotType) {
        case 'entity':
            slots = equippedEntitySlots;
            maxSlots = maxEntitySlots.value;
            break;
        case 'spell':
            slots = equippedSpellSlots;
            maxSlots = maxSpellSlots.value;
            break;
        case 'enhancement':
            slots = equippedEnhancementSlots;
            maxSlots = maxEnhancementSlots.value;
            break;
        case 'land':
            slots = equippedLandSlots;
            maxSlots = maxLandSlots.value;
            break;
        default: return false;
    }
    const currentSlots = [...slots.value];
    if (slotIndex < 0 || slotIndex >= currentSlots.length)
        return false;
    currentSlots[slotIndex] = '';
    slots.value = currentSlots.filter(id => id !== '');
    while (slots.value.length < maxSlots)
        slots.value = [...slots.value, ''];
    autoSave();
    return true;
}
export function getEquippedCards(slotType) {
    let slotIds;
    switch (slotType) {
        case 'entity':
            slotIds = equippedEntitySlots.value;
            break;
        case 'spell':
            slotIds = equippedSpellSlots.value;
            break;
        case 'enhancement':
            slotIds = equippedEnhancementSlots.value;
            break;
        case 'land':
            slotIds = equippedLandSlots.value;
            break;
        default: return [];
    }
    return slotIds.map(id => getCardById(id)).filter(c => c !== undefined);
}
export function getActiveEntity() {
    const id = equippedEntitySlots.value[0];
    if (!id)
        return undefined;
    const card = getCardById(id);
    if (!card || card.type !== 'entity')
        return undefined;
    const enhancedStats = getEnhancedStats(id);
    if (enhancedStats) {
        return { ...card, stats: enhancedStats };
    }
    return card;
}
export function getEquippedEntitiesEnhanced() {
    return equippedEntitySlots.value
        .filter(id => id)
        .map(id => {
        const card = getCardById(id);
        if (!card || card.type !== 'entity')
            return null;
        const enhancedStats = getEnhancedStats(id);
        return enhancedStats ? { ...card, stats: enhancedStats } : card;
    })
        .filter(c => c !== null);
}
export function getEntityCombatStats(cardId) {
    const card = getCardById(cardId);
    if (!card || card.type !== 'entity')
        return null;
    const baseStats = card.stats;
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
// ========== Relic Signals ==========
export const ownedRelics = signal(['ring_of_shadows']);
export const equippedRelics = signal(new Array(relicSlots).fill(null));
export function equipRelic(relicId, slot) {
    if (slot < 0 || slot >= relicSlots)
        return false;
    if (!ownedRelics.value.includes(relicId))
        return false;
    const newSlots = [...equippedRelics.value];
    newSlots[slot] = relicId;
    equippedRelics.value = newSlots;
    autoSave();
    return true;
}
export function unequipRelic(slot) {
    if (slot < 0 || slot >= relicSlots)
        return false;
    const newSlots = [...equippedRelics.value];
    newSlots[slot] = null;
    equippedRelics.value = newSlots;
    autoSave();
    return true;
}
export function addRelic(relicId) {
    if (!ownedRelics.value.includes(relicId)) {
        ownedRelics.value = [...ownedRelics.value, relicId];
        autoSave();
    }
}
export const relicBonuses = computed(() => {
    const bonuses = { maxWill: 0, willRegen: 0, health: 0, summonChance: 0, suspicionReduction: 0, findBonus: 0, ichorDiscount: 0 };
    equippedRelics.value.forEach(id => {
        if (!id)
            return;
        const relic = getRelicById(id);
        if (relic) {
            if (relic.effect.maxWill)
                bonuses.maxWill += relic.effect.maxWill;
            if (relic.effect.willRegen)
                bonuses.willRegen += relic.effect.willRegen;
            if (relic.effect.health)
                bonuses.health += relic.effect.health;
            if (relic.effect.summonChance)
                bonuses.summonChance += relic.effect.summonChance;
            if (relic.effect.suspicionReduction)
                bonuses.suspicionReduction += relic.effect.suspicionReduction;
            if (relic.effect.findBonus)
                bonuses.findBonus += relic.effect.findBonus;
            if (relic.effect.ichorDiscount)
                bonuses.ichorDiscount += relic.effect.ichorDiscount;
        }
    });
    return bonuses;
});
// ========== Computed Values ==========
export const isLowHealth = computed(() => health.value < 30);
export const isLowWill = computed(() => will.value < 30);
export const suspicionPercent = computed(() => kalgothsNoose.value);
export const circlePowerPercent = computed(() => circlePower.value);
export const canEscape = computed(() => circlePower.value >= 100 && hasSpecialIngredient.value && orbexFragments.value >= 6);
export const familiarXPPercent = computed(() => (familiar.value.xp / familiar.value.nextXP) * 100);
export const masteryXPPercent = computed(() => (masteryXP.value / masteryNeeded.value) * 100);
export const dayProgressPercent = computed(() => (timerSeconds.value / 600) * 100);
export const corruptionPercent = computed(() => corruptionLevel.value);
export const capturedCount = computed(() => capturedDemons.value.length);
export const orbexFragmentCount = computed(() => orbexFragments.value);
export const isGazeEventActive = computed(() => isGazeActive.value);
export const averageWardIntegrity = computed(() => {
    const vals = wardIntegrities.value;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
});
// ========== Log Function ==========
export let addLog = null;
export function setAddLog(fn) { addLog = fn; }
export function notifyStateChange() { }
export function initializeState() { }
// ========== Batch Updates ==========
export function updateState(updater) { batch(updater); autoSave(); }
// ========== Utility Functions ==========
export function discover(type, id) {
    const current = discoveries.value;
    const array = current[type];
    if (!array.includes(id))
        discoveries.value = { ...current, [type]: [...array, id] };
}
export function modifyDemonFavor(trait, delta) {
    const current = demonFavor.value;
    const newValue = Math.max(-100, Math.min(100, (current[trait] || 0) + delta));
    demonFavor.value = { ...current, [trait]: newValue };
}
export function getDemonFavor(trait) { return demonFavor.value[trait] || 0; }
export function modifyDemonWrath(delta) { demonWrath.value = Math.max(0, Math.min(100, demonWrath.value + delta)); }
export function addMasteryXP(amount) {
    let xp = masteryXP.value + amount, level = masteryLevel.value, needed = masteryNeeded.value;
    while (xp >= needed) {
        xp -= needed;
        level++;
        needed = Math.floor(100 + level * 20);
    }
    batch(() => { masteryXP.value = xp; masteryLevel.value = level; masteryNeeded.value = needed; });
}
export function addFamiliarXP(amount) {
    let xp = familiar.value.xp + amount, level = familiar.value.level, nextXP = familiar.value.nextXP;
    const abilities = [...familiar.value.abilities], abilityBonuses = { ...familiar.value.abilityBonuses };
    while (xp >= nextXP) {
        xp -= nextXP;
        level++;
        nextXP = 10 + (level - 1) * 5;
        if (level === 2 && !abilities.includes('ward')) {
            abilities.push('ward');
            abilityBonuses.ward = 0.15;
        }
        if (level === 3 && !abilities.includes('guidance')) {
            abilities.push('guidance');
            abilityBonuses.guidance = 0.2;
        }
        if (level === 4 && !abilities.includes('presence')) {
            abilities.push('presence');
            abilityBonuses.presence = 0.1;
        }
    }
    familiar.value = { ...familiar.value, xp, level, nextXP, abilities, abilityBonuses };
}
export function modifyWhispMood(delta) { familiar.value = { ...familiar.value, mood: Math.max(0, Math.min(100, familiar.value.mood + delta)) }; }
export function addCircleIntegrity(amount) { circleIntegrity.value = Math.min(100, circleIntegrity.value + amount); circlePower.value = Math.min(100, circlePower.value + amount); }
export function advanceAction() {
    batch(() => {
        actionCounter.value++;
        if (actionCounter.value >= CONSTANTS.CYCLE_ACTIONS) {
            actionCounter.value = 0;
            if (quotaRemaining.value > 0) {
                kalgothsNoose.value = Math.min(100, kalgothsNoose.value + (6 + quotaRemaining.value * 2));
            }
            else {
                kalgothsNoose.value = Math.max(0, kalgothsNoose.value - 6);
            }
            quotaRemaining.value = 2 + Math.floor(Math.random() * 2);
        }
    });
}
export function reduceQuota() { if (quotaRemaining.value > 0)
    quotaRemaining.value--; }
export function useSeedResonance(amount = 1) { if (seedResonance.value < amount)
    return false; seedResonance.value -= amount; return true; }
export function addSeedResonance(amount = 1) { seedResonance.value = Math.min(maxSeedResonance.value, seedResonance.value + amount); }
export function addTrueNameFragment(demonType, partIndex) {
    const fragments = { ...trueNameFragments.value };
    if (!fragments[demonType])
        fragments[demonType] = [false, false, false];
    fragments[demonType][partIndex] = true;
    trueNameFragments.value = fragments;
    if (fragments[demonType].every(v => v) && !discoveredTrueNames.value.includes(demonType))
        discoveredTrueNames.value = [...discoveredTrueNames.value, demonType];
}
export function getRandomTrueNameFragment(demonType) {
    const parts = trueNameFragments.value[demonType] || [false, false, false];
    const missing = parts.reduce((arr, has, idx) => has ? arr : [...arr, idx], []);
    return missing.length === 0 ? null : missing[Math.floor(Math.random() * missing.length)];
}
export function getCorruptionModifier() { return corruptionLevel.value >= 100 ? -0.2 : (corruptionLevel.value >= 50 ? -0.1 : 0); }
export function resetDailyItemUsage() { itemUsageDaily.value = {}; }
export function applyDailyPassives(addLogFn) {
    const demonCount = capturedDemons.value.length;
    if (demonCount > 0) {
        const ichor = demonCount * CONSTANTS.CAPTURED_DEMON_ICHOR_YIELD;
        const willCost = demonCount * CONSTANTS.CAPTURED_DEMON_WILL_COST;
        ingredients.value = { ...ingredients.value, demonIchor: (ingredients.value.demonIchor || 0) + ichor };
        will.value = Math.max(0, will.value - willCost);
        if (addLogFn)
            addLogFn(`Captured demons produce ${ichor} ichor but drain ${willCost} will.`, false, 'demon');
        if (will.value <= 0) {
            health.value = Math.max(0, health.value - 20);
            if (addLogFn)
                addLogFn("Will broken by captive demons!", true);
        }
    }
    const level = familiar.value.level, mossNeeded = level * CONSTANTS.WHISP_MOSS_COST_PER_LEVEL;
    if (ingredients.value.nightshadeMoss >= mossNeeded) {
        ingredients.value = { ...ingredients.value, nightshadeMoss: ingredients.value.nightshadeMoss - mossNeeded };
        familiar.value = { ...familiar.value, mossConsumedToday: true };
        health.value = Math.min(100, health.value + level * CONSTANTS.WHISP_HEALTH_REGEN_PER_LEVEL);
        if (addLogFn)
            addLogFn(`Whisp consumes ${mossNeeded} moss and restores health.`, false, 'whisp');
        modifyWhispMood(5);
    }
    else {
        familiar.value = { ...familiar.value, mossConsumedToday: false };
        modifyWhispMood(-20);
        if (addLogFn)
            addLogFn(`Whisp is hungry! Not enough moss. Mood -20.`, true);
    }
}
const signalMap = {
    playerName, ingredients, crafted, knownRunes, selectedRunes, runeSlots, masteryLevel, masteryXP, masteryNeeded, storyProgress,
    will, health, maxWill, suspicion, seedResonance, maxSeedResonance, quotaRemaining, actionCounter, tithePaidThisDay, timerSeconds,
    activeDemon, capturedDemons, banishPower, demonFavor, demonWrath, releasedDemons, unidentifiedRelics, knownRelics,
    equippedRelics: oldEquippedRelics, revealedRituals: revealedRituals, hasSpecialIngredient, temporaryBuffs,
    familiar, lastPetTime, lastForageTime, totalSummons, totalExplorations, totalWillClashWins, tutorial, discoveries,
    currentMaze, circleQuality, circleIntegrity, ledgerEntries, relics: relics, ashAvailable, pendingAshRemains,
    itemUsageDaily, orbexFragments, maxOrbexFragments, corruptionLevel, trueNameFragments, discoveredTrueNames,
    activeDemonTier, orbexBoons, alcovesDiscovered, mazePathsUnlocked, demonImages,
    kalgothsNoose: kalgothsNoose, circlePower: circlePower, circleMastery: circleMastery,
    gazeIntensity: gazeIntensity, wardIntegrities: wardIntegrities, gazeSurvivalCount: gazeSurvivalCount,
    dailyConsumableSlots: dailyConsumableSlots, isGazeActive: isGazeActive, gazePhase: gazePhase,
};
export const legacyState = new Proxy({}, {
    get(_, prop) { const s = signalMap[prop]; return s ? s.value : undefined; },
    set(_, prop, value) { const s = signalMap[prop]; if (s) {
        s.value = value;
        return true;
    } return false; }
});
export const state = legacyState;
window.state = state;
// Persistence init
// initSaveSystem() is async, called from main.ts after DOM ready
