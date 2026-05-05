// js/core/persistence.ts
// Save/load with IndexedDB and multiple slots.

import { batch } from '@preact/signals-core';
import { logger } from './logger.js';
import {
  playerName, ingredients, crafted, knownRunes, selectedRunes, runeSlots,
  masteryLevel, masteryXP, masteryNeeded, storyProgress, will, health, maxWill,
  suspicion, seedResonance, maxSeedResonance, quotaRemaining, actionCounter,
  tithePaidThisDay, timerSeconds, activeDemon, capturedDemons, banishPower,
  demonFavor, demonWrath, releasedDemons, unidentifiedRelics, knownRelics,
  oldEquippedRelics, revealedRituals, hasSpecialIngredient, temporaryBuffs,
  familiar, lastPetTime, lastForageTime, totalSummons, totalExplorations,
  totalWillClashWins, tutorial, discoveries, currentMaze, circleQuality,
  circleIntegrity, ledgerEntries, ashAvailable, pendingAshRemains, itemUsageDaily,
  orbexFragments, maxOrbexFragments, corruptionLevel, trueNameFragments,
  discoveredTrueNames, activeDemonTier, orbexBoons, alcovesDiscovered,
  mazePathsUnlocked, demonImages, kalgothsNoose, circlePower, circleMastery,
  ownedCards, equippedEntitySlots, equippedSpellSlots, equippedEnhancementSlots,
  equippedLandSlots, ownedRelics, equippedRelics,
  gazeIntensity, wardIntegrities, gazeSurvivalCount, dailyConsumableSlots,
} from './state-signals.js';
import { getStorage, type SaveSlotMeta } from './storage.js';

const CURRENT_VERSION = 1;
let currentSlot = 'autosave';

// ========== Serialize ==========
function serialize(): any {
  return {
    version: CURRENT_VERSION,
    playerName: playerName.value,
    ingredients: ingredients.value,
    crafted: crafted.value,
    knownRunes: knownRunes.value,
    selectedRunes: selectedRunes.value,
    runeSlots: runeSlots.value,
    masteryLevel: masteryLevel.value,
    masteryXP: masteryXP.value,
    masteryNeeded: masteryNeeded.value,
    storyProgress: storyProgress.value,
    will: will.value,
    health: health.value,
    maxWill: maxWill.value,
    suspicion: suspicion.value,
    seedResonance: seedResonance.value,
    maxSeedResonance: maxSeedResonance.value,
    quotaRemaining: quotaRemaining.value,
    actionCounter: actionCounter.value,
    tithePaidThisDay: tithePaidThisDay.value,
    timerSeconds: timerSeconds.value,
    activeDemon: activeDemon.value,
    capturedDemons: capturedDemons.value,
    banishPower: banishPower.value,
    demonFavor: demonFavor.value,
    demonWrath: demonWrath.value,
    releasedDemons: releasedDemons.value,
    unidentifiedRelics: unidentifiedRelics.value,
    knownRelics: knownRelics.value,
    equippedRelics: oldEquippedRelics.value,
    revealedRituals: Array.from(revealedRituals.value),
    hasSpecialIngredient: hasSpecialIngredient.value,
    temporaryBuffs: temporaryBuffs.value,
    familiar: familiar.value,
    lastPetTime: lastPetTime.value,
    lastForageTime: lastForageTime.value,
    totalSummons: totalSummons.value,
    totalExplorations: totalExplorations.value,
    totalWillClashWins: totalWillClashWins.value,
    tutorial: tutorial.value,
    discoveries: discoveries.value,
    currentMaze: currentMaze.value,
    circleQuality: circleQuality.value,
    circleIntegrity: circleIntegrity.value,
    ledgerEntries: ledgerEntries.value,
    ashAvailable: ashAvailable.value,
    pendingAshRemains: pendingAshRemains.value,
    itemUsageDaily: itemUsageDaily.value,
    orbexFragments: orbexFragments.value,
    maxOrbexFragments: maxOrbexFragments.value,
    corruptionLevel: corruptionLevel.value,
    trueNameFragments: trueNameFragments.value,
    discoveredTrueNames: discoveredTrueNames.value,
    activeDemonTier: activeDemonTier.value,
    orbexBoons: orbexBoons.value,
    alcovesDiscovered: alcovesDiscovered.value,
    mazePathsUnlocked: mazePathsUnlocked.value,
    demonImages: demonImages.value,
    kalgothsNoose: kalgothsNoose.value,
    circlePower: circlePower.value,
    circleMastery: circleMastery.value,
    ownedCards: ownedCards.value,
    equippedEntitySlots: equippedEntitySlots.value,
    equippedSpellSlots: equippedSpellSlots.value,
    equippedEnhancementSlots: equippedEnhancementSlots.value,
    equippedLandSlots: equippedLandSlots.value,
    ownedRelics: ownedRelics.value,
    equippedRelicsNew: equippedRelics.value,
    gazeIntensity: gazeIntensity.value,
    wardIntegrities: wardIntegrities.value,
    gazeSurvivalCount: gazeSurvivalCount.value,
    dailyConsumableSlots: dailyConsumableSlots.value,
  };
}

// ========== Public API ==========
export let autoSave: () => void;
export let loadSaveData: (data: any) => void;

export function setCurrentSlot(slotId: string): void {
  currentSlot = slotId;
}

export async function saveToSlot(slotId: string): Promise<void> {
  const data = serialize();
  const meta: SaveSlotMeta = {
    id: slotId,
    label: slotId === 'autosave' ? 'Autosave' : `Save ${slotId.replace('slot', '')}`,
    timestamp: Date.now(),
    version: CURRENT_VERSION,
    playerName: playerName.value,
    orbexFragments: orbexFragments.value,
  };
  await getStorage().save(slotId, data, meta);
}

export async function loadFromSlot(slotId: string): Promise<boolean> {
  const data = await getStorage().load(slotId);
  if (!data) return false;
  loadSaveData(data);
  currentSlot = slotId;
  return true;
}

export async function getSlotList(): Promise<SaveSlotMeta[]> {
  return getStorage().listSlots();
}

export async function deleteSlot(slotId: string): Promise<void> {
  await getStorage().delete(slotId);
}

// Wrap into the actual exported functions
autoSave = () => {
  saveToSlot(currentSlot);
};

loadSaveData = (data: any) => {
  batch(() => {
    if (data.playerName !== undefined) playerName.value = data.playerName;
    if (data.ingredients) ingredients.value = { ...ingredients.value, ...data.ingredients };
    if (data.crafted) crafted.value = { ...crafted.value, ...data.crafted };
    if (data.knownRunes) knownRunes.value = data.knownRunes;
    if (data.selectedRunes) selectedRunes.value = data.selectedRunes;
    if (data.runeSlots) runeSlots.value = data.runeSlots;
    if (data.masteryLevel !== undefined) masteryLevel.value = data.masteryLevel;
    if (data.masteryXP !== undefined) masteryXP.value = data.masteryXP;
    if (data.masteryNeeded !== undefined) masteryNeeded.value = data.masteryNeeded;
    if (data.storyProgress !== undefined) storyProgress.value = data.storyProgress;
    if (data.will !== undefined) will.value = data.will;
    if (data.health !== undefined) health.value = data.health;
    if (data.maxWill !== undefined) maxWill.value = data.maxWill;
    if (data.suspicion !== undefined) suspicion.value = data.suspicion;
    if (data.seedResonance !== undefined) seedResonance.value = data.seedResonance;
    if (data.maxSeedResonance !== undefined) maxSeedResonance.value = data.maxSeedResonance;
    if (data.quotaRemaining !== undefined) quotaRemaining.value = data.quotaRemaining;
    if (data.actionCounter !== undefined) actionCounter.value = data.actionCounter;
    if (data.tithePaidThisDay !== undefined) tithePaidThisDay.value = data.tithePaidThisDay;
    if (data.timerSeconds !== undefined) timerSeconds.value = data.timerSeconds;
    if (data.activeDemon !== undefined) activeDemon.value = data.activeDemon;
    if (data.capturedDemons) capturedDemons.value = data.capturedDemons;
    if (data.banishPower !== undefined) banishPower.value = data.banishPower;
    if (data.demonFavor) demonFavor.value = data.demonFavor;
    if (data.demonWrath !== undefined) demonWrath.value = data.demonWrath;
    if (data.releasedDemons) releasedDemons.value = data.releasedDemons;
    if (data.unidentifiedRelics) unidentifiedRelics.value = data.unidentifiedRelics;
    if (data.knownRelics) knownRelics.value = data.knownRelics;
    if (data.equippedRelics) oldEquippedRelics.value = data.equippedRelics;
    if (data.revealedRituals) revealedRituals.value = new Set(data.revealedRituals);
    if (data.hasSpecialIngredient !== undefined) hasSpecialIngredient.value = data.hasSpecialIngredient;
    if (data.temporaryBuffs) temporaryBuffs.value = data.temporaryBuffs;
    if (data.familiar) familiar.value = { ...familiar.value, ...data.familiar };
    if (data.lastPetTime !== undefined) lastPetTime.value = data.lastPetTime;
    if (data.lastForageTime !== undefined) lastForageTime.value = data.lastForageTime;
    if (data.totalSummons !== undefined) totalSummons.value = data.totalSummons;
    if (data.totalExplorations !== undefined) totalExplorations.value = data.totalExplorations;
    if (data.totalWillClashWins !== undefined) totalWillClashWins.value = data.totalWillClashWins;
    if (data.tutorial) tutorial.value = { ...tutorial.value, ...data.tutorial };
    if (data.discoveries) discoveries.value = { ...discoveries.value, ...data.discoveries };
    if (data.currentMaze !== undefined) currentMaze.value = data.currentMaze;
    if (data.circleQuality !== undefined) circleQuality.value = data.circleQuality;
    if (data.circleIntegrity !== undefined) circleIntegrity.value = data.circleIntegrity;
    if (data.ledgerEntries) ledgerEntries.value = data.ledgerEntries;
    if (data.ashAvailable !== undefined) ashAvailable.value = data.ashAvailable;
    if (data.pendingAshRemains !== undefined) pendingAshRemains.value = data.pendingAshRemains;
    if (data.itemUsageDaily) itemUsageDaily.value = data.itemUsageDaily;
    if (data.orbexFragments !== undefined) orbexFragments.value = data.orbexFragments;
    if (data.maxOrbexFragments !== undefined) maxOrbexFragments.value = data.maxOrbexFragments;
    if (data.corruptionLevel !== undefined) corruptionLevel.value = data.corruptionLevel;
    if (data.trueNameFragments) trueNameFragments.value = data.trueNameFragments;
    if (data.discoveredTrueNames) discoveredTrueNames.value = data.discoveredTrueNames;
    if (data.activeDemonTier !== undefined) activeDemonTier.value = data.activeDemonTier;
    if (data.orbexBoons) orbexBoons.value = data.orbexBoons;
    if (data.alcovesDiscovered !== undefined) alcovesDiscovered.value = data.alcovesDiscovered;
    if (data.mazePathsUnlocked) mazePathsUnlocked.value = data.mazePathsUnlocked;
    if (data.demonImages) demonImages.value = { ...demonImages.value, ...data.demonImages };
    if (data.kalgothsNoose !== undefined) kalgothsNoose.value = data.kalgothsNoose;
    if (data.circlePower !== undefined) circlePower.value = data.circlePower;
    if (data.circleMastery !== undefined) circleMastery.value = data.circleMastery;
    if (data.ownedCards) ownedCards.value = data.ownedCards;
    if (data.equippedEntitySlots) equippedEntitySlots.value = data.equippedEntitySlots;
    if (data.equippedSpellSlots) equippedSpellSlots.value = data.equippedSpellSlots;
    if (data.equippedEnhancementSlots) equippedEnhancementSlots.value = data.equippedEnhancementSlots;
    if (data.equippedLandSlots) equippedLandSlots.value = data.equippedLandSlots;
    if (data.ownedRelics) ownedRelics.value = data.ownedRelics;
    if (data.equippedRelicsNew) equippedRelics.value = data.equippedRelicsNew;
    if (data.gazeIntensity !== undefined) gazeIntensity.value = data.gazeIntensity;
    if (data.wardIntegrities) wardIntegrities.value = data.wardIntegrities;
    if (data.gazeSurvivalCount !== undefined) gazeSurvivalCount.value = data.gazeSurvivalCount;
    if (data.dailyConsumableSlots) dailyConsumableSlots.value = data.dailyConsumableSlots;
  });
};

// Initialisation: migrate old localStorage save into slot1, then load autosave
export async function initSaveSystem(): Promise<void> {
  // One-time migration from old key
  const oldData = localStorage.getItem('kalgothGazeOrbitSave');
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      if (parsed && parsed.playerName) {
        await saveToSlot('slot1');
        logger.debug('Migrated old save to slot1');
      }
    } catch (error) {
      console.warn('Failed to migrate old save data:', error);
    }
    localStorage.removeItem('kalgothGazeOrbitSave'); // clear after migration
  }

  // Try loading autosave, else slot1, else start fresh
  const autosaveLoaded = await loadFromSlot('autosave');
  if (!autosaveLoaded) {
    const slot1Loaded = await loadFromSlot('slot1');
    if (!slot1Loaded) {
      logger.debug('No save found, starting new game.');
    }
  }
}
